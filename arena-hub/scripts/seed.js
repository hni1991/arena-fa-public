// scripts/seed.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing in .env');
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const SEED_DIR = path.resolve(process.cwd(), 'arenafa_seed');

function readCSV(name) {
  const file = path.join(SEED_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`CSV not found: ${file}`);
  const raw = fs.readFileSync(file, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function uniqBy(arr, keyFn) {
  const map = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!map.has(k)) map.set(k, x);
  }
  return [...map.values()];
}

// --- AUTH SEED: create/update users via Admin API ---
async function seedAuth() {
  console.log('🔐 Seeding Auth users from auth_seed.csv ...');
  const rows = readCSV('auth_seed.csv'); // columns: email,password,username,role,is_admin

  // de-dupe by email
  const items = uniqBy(rows, r => r.email.toLowerCase());

  const created = [];
  const updated = [];
  const errors = [];

  for (const r of items) {
    const email = r.email?.trim().toLowerCase();
    const password = (r.password?.trim() || '22334455');
    const username = r.username?.trim();
    const role = r.role?.trim() || null;
    const is_admin = String(r.is_admin ?? '').toLowerCase() === 'true';

    if (!email || !username) {
      errors.push({ email, error: 'missing email/username' });
      continue;
    }

    try {
      // does user exist?
      const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
        page: 1, perPage: 1, email
      });
      if (listErr) throw listErr;
      const hit = existing?.users?.find(u => u.email?.toLowerCase() === email);

      if (hit) {
        // update
        const { data, error } = await admin.auth.admin.updateUserById(hit.id, {
          email_confirm: true,
          password,
          user_metadata: { username, role, is_admin }
        });
        if (error) throw error;
        updated.push({ email, id: hit.id, username });
        console.log(`  ↺ updated ${email}`);
      } else {
        // create
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, role, is_admin }
        });
        if (error) throw error;
        created.push({ email, id: data.user?.id, username });
        console.log(`  + created ${email}`);
      }
    } catch (e) {
      console.error(`  ! ${email}:`, e.message);
      errors.push({ email, error: e.message });
    }
  }

  // write user_map.csv for later mapping
  const mapRows = [...created, ...updated].sort((a, b) => a.email.localeCompare(b.email));
  const mapCsv = stringify(mapRows, { header: true, columns: ['email', 'id', 'username'] });
  const outPath = path.join(SEED_DIR, 'user_map.csv');
  fs.writeFileSync(outPath, mapCsv);
  console.log(`🗺️  user_map.csv written: ${outPath}`);

  console.log(`✅ Auth seed done. created=${created.length}, updated=${updated.length}, errors=${errors.length}`);
  if (errors.length) {
    const errPath = path.join(SEED_DIR, 'auth_errors.json');
    fs.writeFileSync(errPath, JSON.stringify(errors, null, 2), 'utf8');
    console.log(`⚠️  errors logged to ${errPath}`);
  }
}

// --- DATA SEED: map *_by_username.csv into real tables ---
async function mapAndInsertData() {
  console.log('🧩 Mapping username → user_id using profiles ...');

  // build username->id map using profiles (most reliable after trigger)
  const userMapCsv = path.join(SEED_DIR, 'user_map.csv');
  let userMap = new Map();
  if (fs.existsSync(userMapCsv)) {
    const rows = readCSV('user_map.csv');
    for (const r of rows) {
      if (r.username && r.id) userMap.set(r.username.toLowerCase(), r.id);
    }
  }

  // fallback: fetch all profiles if user_map missing entries
  async function resolveUserId(username) {
    if (!username) return null;
    const key = username.toLowerCase();
    if (userMap.has(key)) return userMap.get(key);

    const { data, error } = await admin.from('profiles')
      .select('id,username').ilike('username', username).limit(1);
    if (error) throw error;
    if (data && data[0]) {
      userMap.set(key, data[0].id);
      return data[0].id;
    }
    return null;
  }

  // --- tournaments.csv (idempotent upsert) ---
  try {
    const tournaments = readCSV('tournaments.csv');
    for (const t of tournaments) {
      const payload = {
        id: t.id,
        title: t.title,
        game_id: t.game_id,
        status: t.status,
        starts_at: t.starts_at ? new Date(t.starts_at).toISOString() : null,
        ends_at: t.ends_at ? new Date(t.ends_at).toISOString() : null,
        description: t.description || null,
        created_by: null
      };
      // map created_by email -> auth user id (optional)
      if (t.created_by) {
        const email = String(t.created_by).toLowerCase();
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, email });
        if (!error) {
          const hit = data?.users?.find(u => u.email?.toLowerCase() === email);
          if (hit) payload.created_by = hit.id;
        }
      }
      // upsert by id
      const { error } = await admin.from('tournaments').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    }
    console.log('✅ tournaments upserted');
  } catch (e) {
    console.error('❌ tournaments:', e.message);
  }

  // --- tournament_participants_by_username.csv ---
  try {
    const rows = readCSV('tournament_participants_by_username.csv');
    const inserts = [];
    for (const r of rows) {
      const uid = await resolveUserId(r.user_username);
      if (!uid) {
        console.warn(`  ! user not found for username=${r.user_username}`);
        continue;
      }
      inserts.push({
        tournament_id: r.tournament_id,
        user_id: uid,
        score: r.score ? Number(r.score) : 0,
        rank: r.rank ? Number(r.rank) : null,
      });
    }
    if (inserts.length) {
      // optional: delete duplicates first (by tournament_id,user_id)
      // rely on unique constraint if present or do a naive insert
      const { error } = await admin.from('tournament_participants').upsert(inserts, {
        onConflict: 'tournament_id,user_id'
      });
      if (error) throw error;
    }
    console.log('✅ tournament_participants seeded');
  } catch (e) {
    console.error('❌ participants:', e.message);
  }

  // --- leaderboard_by_username.csv ---
  try {
    const rows = readCSV('leaderboard_by_username.csv');
    const inserts = [];
    for (const r of rows) {
      const uid = await resolveUserId(r.user_username);
      if (!uid) { console.warn(`  ! user not found for username=${r.user_username}`); continue; }
      inserts.push({
        user_id: uid,
        game_id: r.game_id,
        total_score: r.total_score ? Number(r.total_score) : 0,
        rank_global: r.rank_global ? Number(r.rank_global) : null
      });
    }
    if (inserts.length) {
      const { error } = await admin.from('leaderboard').upsert(inserts, { onConflict: 'user_id,game_id' });
      if (error) throw error;
    }
    console.log('✅ leaderboard seeded');
  } catch (e) {
    console.error('❌ leaderboard:', e.message);
  }

  // --- weekly_highlights.csv ---
  try {
    const rows = readCSV('weekly_highlights.csv');
    const inserts = [];
    for (const r of rows) {
      const uid = await resolveUserId(r.user_username);
      inserts.push({
        id: r.id ? Number(r.id) : undefined,
        type: r.type,
        week_start: r.week_start, // YYYY-MM-DD
        game_id: r.game_id || null,
        user_id: uid || null,
        reason: r.reason || null
      });
    }
    if (inserts.length) {
      // اگر روی (id) یونیک داری، upsert با onConflict:id
      const { error } = await admin.from('weekly_highlights').upsert(inserts, {
        onConflict: 'id'
      });
      if (error) throw error;
    }
    console.log('✅ weekly_highlights seeded');
  } catch (e) {
    console.error('❌ highlights:', e.message);
  }

  console.log('🎯 data seed done');
}

// CLI
const cmd = process.argv[2] || 'all';
(async () => {
  try {
    if (cmd === 'auth')      await seedAuth();
    else if (cmd === 'data') await mapAndInsertData();
    else {                   await seedAuth(); await mapAndInsertData(); }
    console.log('✨ Done.');
  } catch (e) {
    console.error('💥', e);
    process.exit(1);
  }
})();
