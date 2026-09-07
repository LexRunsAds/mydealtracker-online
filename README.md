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


## Keep signed in fix

Safe backend/session update:
- Extends login sessions from 30 days to 180 days.
- Adds an explicit cookie Expires value in addition to Max-Age.
- Refreshes the active session whenever `/api/auth/me` confirms the user is logged in.
- Compares session expiration using ISO timestamps.
- No database changes.
- No admin panel.
- Existing users and deals stay untouched.


## Total Deals Tracked text color fix

Frontend-only update:
- Changes the Total Deals Tracked chip to dark/black text on desktop.
- Keeps the keep-signed-in session fix.
- No database changes.
- No admin panel.


## Reliable session fix

Safe session update:
- Keeps sessions set to 180 days.
- Uses explicit fetch credentials so cookies are sent on refresh.
- Uses a more robust encoded session cookie.
- Uses `Set-Cookie` capitalization in auth responses.
- Checks session expiration in JavaScript instead of relying on mixed SQLite datetime string comparison.
- Refreshes the session on `/api/auth/me`.
- No database changes.
- No admin panel.
- Existing users and deals stay untouched.


## 5-minute login lockout update

Safe security setting update:
- 5 wrong password attempts on the same email now creates a 5-minute wait.
- IP-based abuse lockout is 15 minutes.
- Keeps reliable session / stay-signed-in fix.
- No database changes.
- No admin panel.
- Existing users and deals stay untouched.


## Auto-today Sale Date

Frontend-only update:
- When adding a new deal, Sale Date automatically fills with the current date.
- The date field is still editable before saving.
- Reset/Clear also returns Sale Date back to today's date.
- No database changes.
- No backend changes.
- No admin panel.


## Refresh login crash fix

Safe bug fix:
- Fixes the issue where refresh/close looked like it signed the user out.
- Cause: Import/Export buttons were removed visually, but old JavaScript still tried to attach click handlers to those missing buttons.
- The script now safely skips those listeners when the buttons are not present.
- Keeps the current session/stay-signed-in logic.
- Keeps Total Deals Tracked.
- Keeps auto-today Sale Date.
- No database changes.
- No admin panel.
- Existing users and deals stay untouched.
