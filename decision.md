# CuteCrochet Shop — Engineering Decisions, Architecture & Error Log (`decision.md`)

> **Living Document Rule:** This file records every significant architectural choice, library/tool selection, bug/error encountered, root-cause fix, and future security/feature decision for **CuteCrochet Shop**. Update this document whenever a new architectural, security, or operational decision is made.

---

## 1. System Architecture & Technology Choices ("Why This Stack?")

| Layer / Component | Choice / Library | Why It Was Chosen |
|---|---|---|
| **Backend Language & Router** | **Go (`1.25`) + `github.com/gin-gonic/gin`** | Compiles to a single ~15–20 MB static Linux binary with near-zero RAM overhead (~20 MB at runtime), fast routing, middleware chaining, and clean static file serving—ideal for small containers on Render or budget VPS instances. |
| **Database Driver & Pool** | **`github.com/jackc/pgx/v5` (`pgxpool`)** | Fastest native PostgreSQL driver in Go. Configured with `pgx.QueryExecModeSimpleProtocol` specifically to avoid prepared-statement cache collisions (`SQLSTATE 42P05`) when connecting through Supabase's PgBouncer transaction pooler on port `6543`. |
| **SQL Type Safety** | **`sqlc` (`internal/db/`)** | Generates compile-time type-safe Go structs and parameterized SQL queries from `queries.sql` and `schema.sql`, preventing SQL injection by design while avoiding heavy ORM reflection overhead. |
| **Authentication & Passwords** | **`github.com/golang-jwt/jwt/v5` + `golang.org/x/crypto/bcrypt`** | Stateless `HS256` JWT tokens (7-day expiry) keep the API horizontally scalable without server-side session storage; `bcrypt` (cost 12 for passwords, cost 10 for OTPs) protects stored credentials against rainbow-table and brute-force attacks. |
| **Input Validation** | **`github.com/go-playground/validator/v10`** | Declarative struct-tag validation (`required`, `email`, `uuid`, `gt=0`) on incoming JSON payloads before business logic runs. |
| **Payments** | **Razorpay Standard Checkout + HMAC-SHA256 (`crypto/hmac`)** | Native support for Indian UPI, QR, Cards, and Netbanking. Server-side `SELECT ... FOR UPDATE` row locking + `crypto/hmac` signature verification ensures clients can never tamper with product prices or fake payment status. |
| **Frontend** | **Vanilla HTML5, CSS3, and Modular ES6 JS (`app.js`, `auth.js`, `checkout.js`, `orders.js`, `profile.js`, `admin.js`)** | Zero frontend build-step complexity, instant page loads, SEO-friendly clean extensionless routes (`/about`, `/cart`, `/checkout`, `/dashboard`), and direct static serving from the Go binary. |
| **Deployment Packaging** | **Multi-stage `Dockerfile` (`golang:1.24-alpine` → `alpine:3.18`)** | Builds the Go binary in Stage 1 (`CGO_ENABLED=0`) and copies only the compiled binary + `static/` assets into a tiny Alpine runner image for fast Render builds and minimal attack surface. |

---

## 2. Chronological Decision Log (ADRs)

### ADR-001: Curating & Converting `Crochet-1-001` Product Photos (`.HEIC` → `.jpg`)
- **Date:** 2026-11-27
- **Context:** The raw product photography in `Crochet-1-001` spanned 24 product subfolders plus `general`, containing 146+ photos mostly in Apple `.HEIC` format alongside `.JPG`, `.PNG`, and `.MOV`/`.MP4` videos. Web browsers (Chrome, Firefox, Edge on Windows/Android) cannot render `.HEIC` images in `<img>` tags, and raw multi-megabyte files would slow down mobile page loads.
- **Decision:**
  1. Convert all `.HEIC`/`.PNG`/`.JPG` product photos to web-optimized `.jpg` (max dimension `1080px`, JPEG quality `88`, respecting EXIF rotation).
  2. Generate contact-sheet montages (`Pillow`) to visually audit every photo and curate 2–5 cleanest shots per product (filtering out shots with desk clutter, tools, or sideways framing).
  3. Store curated images directly in `cute-crochet-shop/static/assets/` so they are served with zero external S3/CDN cost and instant browser caching.
- **Tooling Choice:** Used native **Windows Imaging Component (`PresentationCore` / `System.Windows.Media.Imaging.BitmapDecoder`)** in PowerShell for `.HEIC` decoding + EXIF orientation (`System.Photo.Orientation`) and **Python `Pillow` (`PIL`)** for contact-sheet generation and `general` banner resizing after `pillow-heif` was blocked by OS policy (see Error #3).

---

### ADR-002: Interactive `general` Folder Photos with Direct Product Targeting
- **Date:** 2026-11-27
- **Context:** The `general` folder contained wide hero banners, group family portraits, a Spiderman & Bears banner, and the `craftingfory0u` brand logo. Previously, `index.html` had a dark pink `.hero-overlay` covering the bottom plushies on `hero_banner.jpg`, and several hotspot pins (`brown-bear`, `white-bear`, `pink-bear`, `beige-bear`, `tulips`, `heart`) pointed to slugs missing from `PRODUCTS` or had misaligned coordinates.
- **Decision:**
  1. Removed the duplicate text overlay on the Hero Banner (since `hero_banner.jpg` already has baked-in typography) and placed direct-product hotspots on the Hero characters.
  2. Built a 4-scene interactive switcher (`🐻 Bear Family Portrait`, `🌸 Cozy Desk Collection`, `🕷️ Bears & Spidey Edition`, `🐧 Cute Companions Trio`) in `index.html` using the `general` photos.
  3. Plotted a 10% coordinate grid over each image via `Pillow` to measure exact `(top%, left%)` coordinates and centered `.hotspot` pins with `transform: translate(-50%, -50%)`.
  4. Upgraded the hotspot interaction so hovering/tapping opens a preview card with thumbnail, price, **"View Product ↓"** (smooth-scrolls to `#card-<slug>` with a CSS glow animation), and **"Add to Basket"**, while clicking a pin on desktop jumps directly to the product card.

---

### ADR-003: Startup Database Catalog Auto-Sync & Variant Slug Separation
- **Date:** 2026-11-27
- **Context:** Upstream commit `435d439` made the storefront grid strictly DB-driven (`fromDB: true`), while Razorpay checkout (`orders.go`) validates every cart item via `GetVariantByProductSlugForUpdate` against PostgreSQL `products` + `product_variants`. Previously, products added only in `app.js` would not appear on the DB-driven grid or would fail at checkout if missing in Supabase, whereas seeding internal pack/color variants (`bears-single-brown`, etc.) as `is_active = TRUE` cluttered `/api/products` and the Admin Portal.
- **Decision:**
  1. Added `syncCatalogProducts()` in `crochet-backend-go/cmd/api/main.go` to run automatically on server startup, upserting all 28 active storefront products (`is_active = TRUE`) and ensuring each has a `Standard` row in `product_variants`.
  2. Marked internal pack/color/legacy slugs (`bears-pair-pink`, `duck`, `tulips`, `heart`, etc.) as `is_active = FALSE` so `ListActiveProducts` (`WHERE is_active = TRUE`) keeps the storefront and Admin Portal clean, while `GetVariantByProductSlugForUpdate` still resolves every variant at checkout.
  3. Updated `AdminHandler.CreateProduct` (`admin.go`) to also insert a default `Standard` variant row into `product_variants` so any new product added via `/dashboard` is immediately purchasable.
  4. Separated `productsByUuid` from `PRODUCTS` in `app.js` so `Object.values(PRODUCTS)` never duplicates entries by slug + UUID.

---

### ADR-004: Mandatory WhatsApp Number on Custom Design Requests
- **Date:** 2026-11-27
- **Context:** Store owner needed customers' WhatsApp numbers on custom design submissions (`/contact`) to discuss custom colors/designs and share previews quickly.
- **Decision:**
  1. Added a required `#contact-whatsapp` input in `contact.html` with 10–15 digit phone validation in `app.js` and automatic pre-filling from `currentUser.phone` when logged in.
  2. Added an idempotent startup schema migration (`ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT '' NOT NULL;`) in `cmd/api/main.go` so Render's live Supabase database updates automatically without manual SQL execution.
  3. Updated `sqlc` models/queries (`models.go`, `queries.sql`, `queries.sql.go`), `contact.go`, and `admin.js` to store `whatsapp`, include it in email alerts, and render a one-click **`💬 WhatsApp`** (`https://wa.me/...`) deep link with a pre-filled greeting in `/dashboard`.

---

### ADR-005: Retaining Manual Shiprocket AWB Workflow (Option 1)
- **Date:** 2026-11-27
- **Context:** Evaluated two ways to connect Shiprocket: Option 1 (existing built-in manual AWB entry in `/dashboard` after booking on `app.shiprocket.in`) vs Option 2 (automated Shiprocket REST API order creation).
- **Decision:** Per store-owner decision, kept **Option 1** (manual AWB attachment via `POST /api/admin/shipments`) and reverted partial Option 2 scaffolding cleanly. This avoids managing extra API user credentials and parcel dimension edge cases while still displaying courier + AWB tracking to customers on `/orders`.

---

### ADR-006: Staying on Render Free Tier + Anti-Sleep Keep-Alive Strategy
- **Date:** 2026-11-27
- **Context:** Investigated `cloudonfire.com/web-hosting/` because Render's free tier spins down after 15 minutes of inactivity. Determined that `/web-hosting/` is shared PHP/cPanel hosting (which cannot run compiled Go binaries or Docker containers, unlike a Linux VPS). Since 15-minute sleep was the *only* pain point on Render—and Render provides 750 free hours/month (exceeding the 744 hours in a 31-day month)—migrating infrastructure was unnecessary.
- **Decision:**
  1. Added a lightweight `GET /api/health` endpoint in `cmd/api/main.go`.
  2. Added an internal 10-minute background ticker in `cmd/api/main.go` that pings `dbPool.Ping()` (keeping Supabase connections warm) and `RENDER_EXTERNAL_URL/api/health`.
  3. Recommended pairing `/api/health` with a free 10-minute external monitor (`cron-job.org` or `UptimeRobot`) so Render's external load balancer never registers 15 minutes of idle time.

---

### ADR-007: Comprehensive Security Audit & Planned Remediation Roadmap
- **Date:** 2026-11-27
- **Context:** Conducted an adversarial source-code and Git-history security review to identify any credential leaks, account takeover vectors, XSS, or DoS weaknesses.
- **Findings & Planned Decisions (Pending Application):**
  1. **[CRITICAL — Owner Action Required] Rotate Leaked Credentials from Git History:** Commit `f9ff89c` (`initial commits`) contained a real Supabase `DATABASE_URL` password and Razorpay test keys in `.env.example`. **Decision:** Owner must keep the GitHub repo private, reset the Supabase DB password in Supabase + Render, and ensure `JWT_SECRET` in Render is a fresh strong random secret.
  2. **[CRITICAL — Code Fix Planned] Enforce Google OAuth `aud` & `email_verified`:** `GoogleAuth` (`auth.go`) currently accepts valid Google ID tokens from *any* Google OAuth client ID because `aud` is not verified against `GOOGLE_CLIENT_ID`. **Decision:** Parse `aud` and `email_verified`, reject tokens unless `aud == GOOGLE_CLIENT_ID` and `email_verified == "true"`, and URL-escape `req.Credential`.
  3. **[HIGH — Code Fix Planned] Eliminate DOM XSS / Open Redirect on `/login?redirect=`:** `login.html` assigns unvalidated `?redirect=` query values to `window.location.href`, allowing `javascript:` or external phishing redirects post-login. **Decision:** Whitelist/sanitize `redirect` so it only permits safe internal relative paths starting with `/` (and never `//` or `javascript:`).
  4. **[HIGH — Code Fix Planned] Prevent Stored XSS in Image Uploads & Admin Dashboard:** `contact.go` and `admin.go` currently trust client-supplied `Content-Type` headers when saving to `stored_images`, and `admin.js`/`auth.js` interpolate some user/address fields into `innerHTML` without escaping. **Decision:** Sniff real MIME bytes via `http.DetectContentType(data)` (allow only `image/jpeg`, `image/png`, `image/webp`), add `Content-Security-Policy: default-src 'none'; sandbox` + `X-Content-Type-Options: nosniff` on `/api/images/:id`, and escape all dynamic fields with `escapeHTML()`.
  5. **[HIGH — Code Fix Planned] Restrict CORS Origins:** Replace wildcard `Origin` reflection in `cmd/api/main.go` with an explicit allowlist (`FRONTEND_URL`, `https://cutecrochet.shop`, `https://www.cutecrochet.shop`, and localhost in dev).
  6. **[MEDIUM — Code Fix Planned] Harden OTP Generation, Brute-Force Lockout, Upload Rate Limits & Headers:** Switch OTP generation from `math/rand` to `crypto/rand`, invalidate OTPs after 5 failed verification attempts, add `RateLimit` to `/api/register` and `/api/contact` (preventing `stored_images` DB storage exhaustion), add HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`), run Docker runner as a non-root user, and untrack legacy binaries (`api`, `server`, `tmp_api`).

---

## 3. Complete Error & Resolution Log

| # | Error / Bug Encountered | Root Cause | How It Was Solved |
|---|---|---|---|
| **1** | `file does not exist` & `fatal: not a git repository` at `C:\workspace\repo\cute-crochet-shop` | The actual Git repository and `Dockerfile` lived one directory deeper inside `C:\workspace\repo\cute-crochet-shop\cute-crochet-shop\`. | Inspected directory tree to locate the true repository root and targeted all subsequent Git and file operations at the inner directory. |
| **2** | PowerShell `ParserError`: `The token '&&' is not a valid statement separator in this version` | Windows PowerShell 5.1 does not support `&&` chaining (which was added in PowerShell 7). | Used `;` statement separators and standalone `.ps1` / `.py` scratch scripts for multi-step commands. |
| **3** | `ImportError: DLL load failed while importing _pillow_heif: An Application Control policy has blocked this file` | Windows Application Control (WDAC / Smart App Control) blocked the unsigned native C extension `_pillow_heif.pyd` downloaded via `pip`. | Pivoted immediately to built-in Microsoft-signed **Windows Imaging Component (`PresentationCore` `BitmapDecoder`)** in PowerShell to decode `.HEIC` files natively at full resolution with EXIF orientation handling, paired with pure `Pillow` JPEG processing. |
| **4** | PowerShell `EndSquareBracketExpectedAtEndOfAttribute` during inline `python -c` regex | PowerShell double-quoted strings interpreted `[a-zA-Z...]` and `\"` inside inline Python code as PowerShell type literals. | Extracted verification logic into clean standalone Python scripts (`verify_all.py`) invoked via `python <script.py>`. |
| **5** | `git push` rejected (`fetch first`) + Rebase conflicts in `index.html` & `app.js` + `GIT_EDITOR` failure / detached `HEAD` | Remote `origin/main` had 2 newer commits (`435d439` making the product grid strictly `fromDB: true` and `4357d89` adding a stale-cart redirect overlay). During rebase continuation, PowerShell passed `true` / `cmd /c exit 0` in a way Git's editor invoker rejected. | Inspected both upstream commits via `git show`, merged conflicts preserving `fromDB: true` + stale-cart overlay alongside all 28 new products, committed the staged merge directly, pointed `main` to the rebased commit (`git branch -f main`), and pushed cleanly to `origin/main`. |
| **6** | Admin Portal **`Custom Requests`** tab failing to render requests or uploaded reference images | **Two bugs in existing code:** (a) `admin.js` called `document.getElementById('requests-badge').style.display`, but `#requests-badge` was missing from `admin.html`, throwing a `TypeError` before rendering rows; (b) `pgtype.Text` in `pgx/v5` marshals to a plain JSON string (`"/api/images/..."`), whereas `admin.js` checked `req.image_url.Valid && req.image_url.String`, causing every uploaded image to show `"No image"`. | Added `<span id="requests-badge">` to `admin.html`, added null checks on `badge` in `admin.js`, updated `admin.js` to accept plain string `req.image_url` (with legacy struct fallback), and added a 48×48 thumbnail preview + "View Full Image" link (commit `754f345`). |

---

## 4. Guidelines for Future Updates
Whenever making changes to **CuteCrochet Shop**:
1. **Catalog / Price Changes:** Update prices in **both** `cute-crochet-shop/static/js/app.js` (`PRODUCTS`) **and** `crochet-backend-go/cmd/api/main.go` (`syncCatalogProducts`) so client cart snapshots and server-side checkout price verification stay 100% synchronized (`PRICE_MISMATCH` safe).
2. **Database Schema Changes:** Always add an idempotent `ALTER TABLE ... IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` statement in `cmd/api/main.go` startup (in addition to `internal/db/schema.sql`) so Render deployments migrate PostgreSQL automatically without downtime.
3. **Decision Logging:** Append a new `ADR-00X` entry and any new errors + fixes to Section 2 and Section 3 of this `decision.md` file.
