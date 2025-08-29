Stack & نسخه‌ها

Next.js 15.5.x (App Router)

React 19.1.x, TypeScript 5.9.x, Tailwind 3.4.x

Supabase (Auth + DB + Storage) – @supabase/supabase-js@^2.55.0

Prisma برای introspect/types/seed (استفادهٔ runtime اختیاری؛ فعلاً فقط dev tooling)

ابزارهای کمکی: dotenv, csv-parse, csv-stringify, Husky + lint-staged

ساختار پروژه (فایل‌های مهم)
arena-hub/
  prisma/
    schema.prisma              # هم‌راستا با DB فعلی Supabase (pull شده)
  src/
    app/
      games/
        page.tsx               # لیست بازی‌ها (استفاده از banner_path/banner_url + Signed URL)
        [slug]/page.tsx        # جزییات بازی (**مسیر اصلی**)
        [id]/page.tsx          # مسیر قدیمی؛ فقط Redirect → /games/[slug]
      leaderboards/            # لیدربوردها
      tournaments/             # ایونت‌ها
      auth/                    # ورود/ثبت‌نام (فرم تب‌دار)
      admin/                   # پنل ادمین (مدیریت بازی‌ها و ...)
      site-map/page.tsx        # Site Map / Roadmap
    lib/
      supabaseClient.ts        # کلاینت عمومی
    types/
      db.ts                    # Types سطح UI (درحال مهاجرت به Prisma Types)
  scripts/
    seed.js                    # seeding (auth/data)
    dump-schema.mjs            # snapshot schema از DB (dev)

ENV ها (لوکال)

هر دو فایل نگه داشته می‌شوند:

.env.local → فقط کلاینت/Next (public keys)

.env → اسکریپت‌ها/Prisma (secret/Service Role/Database URLs)

نمونهٔ به‌روز (مقادیر حساس واقعی را همان‌هایی که خودت گذاشتی نگه دار):

# public (Next.js)
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon>"

# server-only (برای seed/Prisma)
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE="<service_role>"

# اتصال دیتابیس
# Pooler برای اجرای Prisma و کارهای read-heavy
DATABASE_URL="postgresql://postgres:<PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Direct برای migration/introspect
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres"


نکته: اگر DATABASE_URL یا DIRECT_URL غیرفعال بود، Prisma پورت 5432 لوکال را تلاش می‌کند و ECONNREFUSED 127.0.0.1:5432 می‌بینیم. یعنی env درست لود نشده؛ مسیر اجرای دستور را از ریشهٔ پروژه بزن و مطمئن شو فایل .env همان‌جا است.

دیتابیس (جداول کلیدی – مطابق schema فعلی)

ستون‌ها طبق اسکرین‌شات‌ها و schema.prisma جاری. اگر جای نام‌ها تفاوت داشت، ستون alias در کوئری‌ها رعایت شده.

games

slug (PK, text) – شناسهٔ صفحه

title (text)

active (bool)

بنر: یکی از این دو پر می‌شود

banner_path (text, Storage key در باکت)

banner_url (text, لینک مستقیم http)

description (text, nullable)

official_url (text, nullable)

فیلدهای جانبی که داریم/ممکن است: created_at, platform, type …

سایر

profiles → id, username, avatar_url, …

clans → id, game_id|game_slug, name, tag, logo_url

tournaments → id, game_id|game_slug, title, status(upcoming|active|finished), starts_at, ends_at

tournament_participants → tournament_id, user_id, created_at

leaderboard → game_id|game_slug, user_id, total_score, rank_global?

weekly_highlights → type('youtuber'|...), game_id|game_slug, user_id, week_start, reason

نکته: بعضی جداول هنوز با game_id هستند و بعضی با game_slug. در UI تلاش شده هر دو پشتیبانی شود. مهاجرت کامل به slug در roadmap است.

Storage

باکت: game-banners

وقتی banner_path ست باشد: با createSignedUrl(key, 3600) نمایشش بده.

وقتی banner_url ست باشد: مستقیماً همان را رندر کن.

Admin می‌تواند فایل را آپلود کند و banner_path را ذخیره کند.

مسیرها / صفحات

/games → کارت‌های بازی با بنر + chips وضعیت

/games/[slug] → صفحهٔ جزئیات:

هدر + بنر (Signed/Direct) + وضعیت + رسمی/اعضا

Description

Clans (لوگو+نام+تگ)

YouTubers (از weekly_highlights + join با profiles)

Events (تورنمنت‌های active|upcoming)

Leaderboard (Top 20 با profiles.username)

Members count: یکتای tournament_participants روی تورنمنت‌های همان بازی

/games/[id] → Redirect 301 به /games/[slug] (برای لینک‌های قدیمی)

/leaderboards, /tournaments, /weekly-highlights …

/auth → فرم تب‌دار ورود (username+password) / ثبت‌نام (ایمیل+username+password)

ایمیل‌وریفای فعلاً غیرفعال؛ رکورد profiles بلافاصله ایجاد/به‌روزرسانی می‌شود.

هنجارهای کدنویسی UI

همهٔ کوئری‌های storage lazy sign (بعد از لود لیست)

params در Next 15: در کلاینت از useParams استفاده شود (از Promise شدن پرهیز)

Types:

فعلاً انواع UI در src/types/db.ts تعریف شده.

به‌تدریج انواع را از Prisma Client وارد می‌کنیم:

import { Prisma } from '@prisma/client'
type Game = Prisma.GamesGetPayload<{}>


حواست باشد در انتخاب‌های Supabase مثل profiles!inner(username) خواص اختیاری شوند:

type LeaderRow = {
  user_id: string
  total_score: number
  rank_global?: number | null
  profiles?: { username?: string | null } | null
}


برای Signed URL‌ها همیشه چک: اگر path با http شروع شد، مستقیم بزن؛ وگرنه امضا کن.

اسکریپت‌ها

npm run seed:auth / seed:data / seed:all → پر کردن اکانت‌ها/دیتا

خروجی auth یک user_map.csv می‌سازد (ایمیل↔uid)

npm run schema:dump (اگر تعریف شد) → اسنپ‌شات Schema (dev-only)

Prisma؛ چرا به‌درد می‌خورد (فراتر از Type/Seed)

Typed Queries حتی اگر Supabase client اصلی بماند، می‌توانیم از Prisma فقط برای type inference مدل‌ها استفاده کنیم (import types only).

Introspect سریع از Supabase (بخوان/نفوذ نکن) → همگام‌سازی مدل‌ها با DB بدون حدس.

Migration اختیاری: در صورتی که تصمیم بگیریم به تدریج migrationها را روی Supabase مدیریت کنیم (با احتیاط و جداسازی Pooler vs Direct).

Codegen پایدار برای DTO/Types در UI و Admin.

قواعد اتصال:

DATABASE_URL روی Pooler:6543 برای read/write سبک.

DIRECT_URL روی 5432 فقط موقع db pull یا migration dev.

اگر Cross-schema reference دیدی (ارور P4002), schemas = ["public","auth"] را به datasource اضافه کن.

Mirror GitHub (Public)

ریموت‌ها:

origin → خصوصی (اصلی)

public → https://github.com/hni1991/arena-fa-public.git

پوش آینه‌ای دستی (کار می‌کند):

git push --mirror public


اتوماتیک (اختیاری): GitHub Action ساده (وقتی روی main push شد):

name: Mirror to public
on:
  push: { branches: [ main ] }
jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Strip secrets
        run: echo -e "\n.env*\n.supabase/*\n" >> .gitignore
      - name: Push
        env:
          PUBLIC_URL: https://github.com/hni1991/arena-fa-public.git
        run: |
          git remote add public $PUBLIC_URL || true
          git push --mirror public


اگر CI خطای دسترسی داد، یک Fine-grained PAT (no secrets) بساز و به صورت Repository secret وارد کن، ولی برای mirror → public معمولاً لازم نیست چون روی Public repo می‌ریزی.

Roadmap کوتاه

 یکسان‌سازی reference بازی‌ها: همه به game_slug (migration نرم با view/trigger یا column جدید)

 تکمیل /games/[slug]: تب‌های Members (لیست + درخواست دوستی)، آخرین عضو اضافه‌شده، اکستنشن‌های رسانه‌ای

 Admin Games: آپلود بنر به باکت + ذخیرهٔ banner_path، فیلدهای رسمی (official_url, youtube, …)

 جایگزینی انواع دستی با Prisma Types در src/types/db.ts

 بهینه‌سازی امضای بنرها (cache keyed by game.id|slug + updated_at)

 Site-Map: سنجه‌ها/Progress خودکار از روی فایل TODO tags

نکات خطا که اخیراً دیدیم (و رفع‌ها)

useParams در Next 15: params Promise نیست وقتی از useParams() کلاینتی می‌گیریم. مشکل قبلی ناشی از destruct مستقیم params بود.

leaderboard + profiles!inner: حتماً typeها optional باشند.

خطای TypeScript: «has no exported member 'Game'…»

یا از src/types/db.ts export درست بده،

یا از Prisma Types ایمپورت کن (پیشنهادی).

خطای DB ECONNREFUSED 127.0.0.1:5432: env لود نشده → مسیر اجرا/نام فایل‌ها را چک کن.

P4002/Cross-schema: schemas = ["public","auth"] در schema.prisma.

دستورهای روزمره
# توسعه
npm i
npm run dev

# Seed
npm run seed:auth
npm run seed:data
npm run seed:all

# Prisma sync با Supabase
npx prisma db pull                # از DIRECT_URL
npx prisma generate               # تولید types

# Mirror دستی
git push --mirror public

قواعد «به‌روزرسانی این فایل»

هر تغییری در schema.prisma یا ساختار صفحات (routes)، همین فایل باید بلافاصله آپدیت شود.

اگر فیلدی در جدول اضافه/حذف شد، هم: لیست ستون‌ها در این فایل، و کوئری‌های /src/app/games/*.tsx را اصلاح کن.

اگر bucket یا نامش تغییر کرد، بخش Storage و BANNERS_BUCKET را به‌روز کن.

اگر همین را با نام ONLY_TRUTH.md در ریشهٔ ریپو (یا داخل arena-hub/) بگذاری، هم برای من و هم برای بقیه «مرجع واحد» خواهد بود. هر بار خواستی فیچر جدید بزنیم، اول این را باز می‌کنیم تا drift پیش نیاید.