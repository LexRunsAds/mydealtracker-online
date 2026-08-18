# My Deal Tracker Online - Phase 1 Updated

This is the updated online version with login/register and Cloudflare D1 database saving.

## Files to upload to GitHub

Upload everything in this folder, including:

- index.html
- schema.sql
- wrangler.toml
- README.md
- functions/

Do not upload the ZIP itself to GitHub. Upload the contents inside the ZIP.

## Cloudflare setup

Your Pages project needs this binding:

- Type: D1 database
- Variable name: DB
- Database: mydealtracker-db

After uploading these files to GitHub, Cloudflare should redeploy automatically.


## Security Update v1

This package adds the first security layer:

- Login lockout after repeated failed password attempts.
- Login/register rate limiting by IP and email.
- Generic login failures so attackers cannot easily test accounts.
- Security event logging in D1.
- Input length and format validation.
- Import size and import count limits.
- Security headers through Cloudflare Pages `_headers`.
- Safer JSON API error handling.
- D1 binding preserved in `wrangler.toml`.

Security tables are auto-created by the API on first protected request. The same SQL is also included in `security_migration.sql` if you want to run it manually in the D1 console.


## LexRunsAds-style landing refresh

This version keeps Security Update v1 and refreshes the front/login page into a more direct-response landing experience:
- Bigger, bolder hero copy.
- Sales-focused value proposition.
- Clear explanation for why this tool belongs next to the CRM.
- Stronger feature/value cards.
- Better mobile and desktop landing layout.


## Futuristic dark theme refresh

This version keeps the current login/security/backend functionality and changes the visual theme to a darker,
futuristic interface inspired by the style reference you shared:
- dark glassmorphism panels
- monochrome / graphite feel
- stronger contrast
- futuristic hero section
- dashboard cards styled to match the landing page
