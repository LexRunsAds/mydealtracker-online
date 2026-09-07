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


## Register confirm password + mobile flush fix

No admin panel was added. No database tables were changed.

Frontend-only changes:
- Confirm Password field appears only during registration.
- Registration is blocked if Password and Confirm Password do not match.
- Register screen includes a disclaimer that password reset is not available yet.
- Mobile layout is adjusted so the logged-in top action area and main panels are full-width and centered/flush.


## Password disclaimer readability fix

Frontend-only update:
- Changed the registration disclaimer from yellow text to a darker high-contrast box with white text.
- No database changes.
- No backend changes.
- No admin panel.


## Mobile topbar flush fix

Frontend-only update:
- Forces the logged-in top account/action box to take the same full mobile width as the dashboard cards.
- Centers and stretches the account/action buttons on mobile.
- No database changes.
- No backend changes.
- No admin panel.


## Mobile dashboard width fix

Frontend-only update:
- Keeps the top account/action box flush and centered.
- Prevents Add Sold Deal, goal card, stat cards, inputs, and deal cards from overflowing mobile width.
- Forces mobile dashboard sections into one-column layouts.
- No database changes.
- No backend changes.
- No admin panel.


## Register disclaimer dark text fix

Frontend-only update:
- Makes the password reset disclaimer readable on the light login card.
- Uses a light warning box with dark text.
- No database changes.
- No backend changes.
- No admin panel.


## Topbar cleanup + total tracked

Frontend-only update:
- Removes visible Import Backup and Export Backup buttons from the top account area.
- Adds a logged-in stat chip: Total Deals Tracked.
- The total is based on the logged-in user's saved deals.
- No database changes.
- No backend changes.
- No admin panel.
