import fs from "fs/promises";
import pkg from "pg";
const { Client } = pkg;

const q = {
  tables: `
    select table_name, obj_description((quote_ident(table_schema)||'.'||quote_ident(table_name))::regclass) as comment
    from information_schema.tables
    where table_schema='public' and table_type='BASE TABLE'
    order by table_name;
  `,
  columns: `
    select c.table_name, c.ordinal_position, c.column_name, c.data_type,
           c.is_nullable, c.column_default,
           pgd.description as comment
    from information_schema.columns c
    left join pg_catalog.pg_statio_all_tables st on st.relname=c.table_name
    left join pg_catalog.pg_description pgd
      on pgd.objoid=st.relid and pgd.objsubid=c.ordinal_position
    where c.table_schema='public'
    order by c.table_name, c.ordinal_position;
  `,
  pks: `
    select kcu.table_name, tco.constraint_name, kcu.column_name, kcu.ordinal_position
    from information_schema.table_constraints tco
    join information_schema.key_column_usage kcu
      on kcu.constraint_name=tco.constraint_name and kcu.table_schema=tco.table_schema
    where tco.constraint_type='PRIMARY KEY' and tco.table_schema='public'
    order by kcu.table_name, kcu.ordinal_position;
  `,
  fks: `
    select tc.table_name, kcu.column_name, ccu.table_name as ref_table, ccu.column_name as ref_column,
           tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name=tc.constraint_name
    join information_schema.constraint_column_usage ccu on ccu.constraint_name=tc.constraint_name
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'
    order by tc.table_name, kcu.column_name;
  `,
  indexes: `
    select t.relname as table_name, i.relname as index_name,
           pg_get_indexdef(ix.indexrelid) as index_def, ix.indisunique as is_unique
    from pg_class t
    join pg_index ix on t.oid=ix.indrelid
    join pg_class i on i.oid=ix.indexrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relkind='r'
    order by t.relname, i.relname;
  `
};

function toMD(schema) {
  const { tables, columns, pks, fks, indexes } = schema;
  const colsByTable = columns.reduce((m, c) => {
    (m[c.table_name] ||= []).push(c);
    return m;
  }, {});
  const pkByTable = pks.reduce((m, p) => {
    (m[p.table_name] ||= []).push(p.column_name);
    return m;
  }, {});
  const fkByTable = fks.reduce((m, f) => {
    (m[f.table_name] ||= []).push(f);
    return m;
  }, {});

  let md = `# Database schema (public)\n\nGenerated: ${new Date().toISOString()}\n\n`;
  for (const t of tables) {
    md += `## ${t.table_name}\n`;
    if (t.comment) md += `> ${t.comment}\n\n`;
    md += `| # | column | type | null | default | comment |\n|---:|---|---|---|---|---|\n`;
    (colsByTable[t.table_name] || []).forEach((c) => {
      md += `| ${c.ordinal_position} | ${c.column_name} | ${c.data_type} | ${c.is_nullable} | ${c.column_default ?? ""} | ${c.comment ?? ""} |\n`;
    });
    const pk = pkByTable[t.table_name];
    if (pk?.length) md += `\n**PK**: \`${pk.join(", ")}\`\n`;
    const fks = fkByTable[t.table_name];
    if (fks?.length) {
      md += `\n**FKs**:\n`;
      fks.forEach((f) =>
        md += `- \`${f.column_name}\` → \`${f.ref_table}.${f.ref_column}\` (${f.constraint_name})\n`
      );
    }
    const idx = indexes.filter(x => x.table_name === t.table_name);
    if (idx.length) {
      md += `\n**Indexes**:\n`;
      idx.forEach(i => md += `- ${i.index_name} ${i.is_unique ? "(unique) " : ""}\n  \`${i.index_def}\`\n`);
    }
    md += `\n---\n\n`;
  }
  return md;
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const [tables, columns, pks, fks, indexes] = await Promise.all(
    Object.values(q).map((sql) => client.query(sql).then(r => r.rows))
  );
  await client.end();

  const schema = { tables, columns, pks, fks, indexes };
  await fs.mkdir("schema", { recursive: true });
  await fs.writeFile("schema/schema.json", JSON.stringify(schema, null, 2), "utf8");
  await fs.writeFile("schema/schema.md", toMD(schema), "utf8");
  console.log("✅ schema written to schema/schema.{json,md}");
})();
