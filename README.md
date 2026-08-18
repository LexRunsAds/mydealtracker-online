# My Deal Tracker Online - Phase 1

This is the first online database version.

## Includes
- Register / login / logout
- Cloudflare D1 database saving
- User-specific deals
- Monthly goal saving
- Import old JSON backups
- Export online backup
- Current-month stats
- Search stock numbers across all months

## Cloudflare Requirements
- D1 database: `mydealtracker-db`
- Pages D1 binding: `DB`
- Tables created using `schema.sql`

## Deploy
Recommended: upload this whole folder to GitHub and connect the GitHub repo to Cloudflare Pages.

Do not upload only `index.html`; this version needs the `functions/` folder too.
