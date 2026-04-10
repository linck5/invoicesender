# copilot-instructions.md — Invoice Generator (HTML → PDF)

## Purpose
This repo generates contractor invoices as PDFs from structured data in Google
Sheets.

- Input source: Google Sheets (`Invoices` + `LineItems` tabs)
- Business logic: TypeScript (ported/cleaned up from a prior JS script)
- Rendering: Handlebars HTML template + CSS
- PDF generation: Puppeteer (Chromium print-to-PDF)
- Automation: GitHub Actions (manual trigger only)
- Output: PDF stored as a GitHub Actions artifact (download from Actions UI)

We are intentionally moving away from Zoho/Make.com. All invoice generation logic
lives in this repo.

## High-level workflow
1. User updates Google Sheets:
   - Add/update a row in `Invoices` for a given `invoice_id`
     (e.g. `58`, `60b`, `61alt`)
   - Add optional extra `LineItems` rows for reimbursements/special services
2. User triggers GitHub Actions manually:
   - Checks out repo
   - Installs deps
   - Builds TypeScript
   - Runs generator CLI for the chosen `invoice_id`
   - Uploads `out/*.pdf` as an artifact
3. User downloads the generated PDF from the workflow run artifacts.
4. (Future enhancement) Email the PDF automatically to yourself/client.

## Key design decisions
- Use HTML/CSS for invoice layout (maintainable) rather than manual PDF
  coordinates.
- Keep invoice computation in code (testable, versioned).
- Avoid vendor lock-in; no Zoho APIs required.
- Treat Sheets as the “editable database” and GitHub Actions as the runner.

## Repository structure
- `src/index.ts`: CLI entrypoint (parses args, orchestrates steps)
- `src/config.ts`: env var loading/validation (Zod)
- `src/sheets.ts`: read invoice + line items from Google Sheets API
- `src/calc.ts`: pure functions for business-day counting and totals
- `src/renderHtml.ts`: render Handlebars template with CSS
- `src/renderPdf.ts`: Puppeteer HTML → PDF
- `templates/invoice.hbs`: invoice HTML template
- `templates/invoice.css`: invoice styling
- `out/`: generated PDFs (gitignored)

## Google Sheets schema (expected)
### Tab: `Invoices`
Headers (exact names expected by `src/sheets.ts`):
- `invoice_id` (string; examples: `58`, `60b`, `61alt`)
- `invoice_number` (string; can match `invoice_id` or be different)
- `invoice_date` (YYYY-MM-DD; required)
- `client_name`
- `client_details` (single cell; newlines allowed)
- `sender_name`
- `sender_details`
- `hourly_rate` (number)
- `leave_days` (number)
- `period_start` (YYYY-MM-DD)
- `period_end` (YYYY-MM-DD)
- `notes` (optional)
- `email_name` (optional; used to build email subject suggestion in Job Summary)

### Tab: `LineItems`
Headers:
- `invoice_id`
- `description`
- `quantity` (number; e.g. `1` or `3.5`)
- `unit_price` (number)

Behavior:
- A computed “base services” line item is generated from the `Invoices` row
  (business days minus leave days, multiplied into hours).
- Any rows in `LineItems` with matching `invoice_id` are appended as extra items.

## Dates and timezone
- Timezone is controlled by `INVOICE_TIMEZONE` (default intended:
  `Pacific/Auckland`).
- Business day counting is inclusive of both start and end dates (Mon–Fri).
- The invoice date is not computed; it comes from the `invoice_date` column.

## Local development
### Prereqs
- Node.js (managed via `nvm`; version pinned in `.nvmrc`)
- Access to the Google Sheet (shared with service account)
- Google Sheets API enabled in GCP for the project

### Node version (nvm)
**Always run `nvm use` before any command that invokes Node or npm** (install,
build, dev, generate, etc.). The project has an `.nvmrc` file that pins the
required version. When executing terminal commands on behalf of the user, prefix
with `nvm use &&` or run `nvm use` as a separate prior command in the same
shell. Do **not** add `source` before `nvm use`.

### Environment variables
Create a local `.env` (do NOT commit). Required vars:

- `GOOGLE_SERVICE_ACCOUNT_JSON` = full service account JSON content
- `SHEET_ID` = spreadsheet ID from the Google Sheets URL
- `INVOICE_TIMEZONE` = `Pacific/Auckland` (or another IANA tz)

The app loads `.env` automatically via `dotenv` (`import "dotenv/config"` in
`src/index.ts`). No `--env-file` flag or manual `export` is needed.

⚠️ `.env` formatting for `GOOGLE_SERVICE_ACCOUNT_JSON`:
- The JSON value **must** be on a **single line** (no hard line breaks).
- Wrap the value in **single quotes** so `dotenv` treats it as a literal:
  ```
  GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
  ```
- Do NOT use double quotes (dotenv will interpret escape sequences).
- Do NOT use `export $(cat .env | xargs)` — it cannot handle JSON with spaces.
- `dotenv` does **not** override existing env vars. If a stale value is already
  set in your shell, run `unset GOOGLE_SERVICE_ACCOUNT_JSON` or open a new
  terminal before re-running.

### Commands
- Install: `npm install` (generates `package-lock.json` on first run;
  subsequent installs can use `npm ci`)
- Dev run (TypeScript directly): `npm run dev -- --invoiceId 60b`
- Build: `npm run build`
- Run built: `npm run generate -- --invoiceId 60b`

Outputs:
- Generated PDFs go to `out/<invoice_id>.pdf`

## GitHub Actions setup
Workflow file: `.github/workflows/invoice.yml`

Trigger:
- `workflow_dispatch` only (manual run with required input `invoiceId`)

Required GitHub Secrets:
- `GOOGLE_SERVICE_ACCOUNT_JSON`: paste the full JSON key contents
- `SHEET_ID`: spreadsheet ID

Google permissions:
- Share the spreadsheet with the service account `client_email` as Viewer
  (Editor only if we later write back status).

Artifacts:
- The workflow uploads `out/*.pdf` as an artifact named `invoice-pdf`.

## Security rules
- Never commit the service account JSON key.
- Never print credentials to logs.
- Keep PII/addresses in the sheet; avoid copying sensitive data into logs.

## Coding conventions for AI-assisted changes
When modifying or adding code, follow these patterns:

- Use TypeScript, ESM (`type: module`).
- Keep I/O (Sheets API, filesystem, Puppeteer) in dedicated modules.
- Validate external data with Zod in `src/sheets.ts` or at boundaries.
- Format code with an 80-char print width style (Prettier-like).
- Avoid adding heavy frameworks; keep dependencies minimal.

## Git workflow
- **Never** commit or push on the user's behalf. The user will always review
  changes and commit/push manually.
- Do not stage files, create commits, or run `git push`.

## Troubleshooting notes
- “Invoice not found”: `invoice_id` mismatch between sheet and CLI input.
- 403/permission errors: sheet not shared with service account email, or API not
  enabled.
- Puppeteer launch issues on CI: ensure `--no-sandbox` args are used (already
  configured).- `SyntaxError: Unexpected end of JSON input` at `sheets.ts JSON.parse`: the
  `GOOGLE_SERVICE_ACCOUNT_JSON` env var is truncated. See `.env` formatting
  notes above. If running locally, check for a stale value in the shell
  (`echo $GOOGLE_SERVICE_ACCOUNT_JSON`) and `unset` it.
- `npm ci` fails with "no package-lock.json": run `npm install` first to
  generate the lockfile, then commit it.
## What Copilot should do in this repo
- Generate new features as small modules wired through `src/index.ts`.
- Update `templates/invoice.hbs` + `invoice.css` for layout changes.
- Keep computation logic deterministic and testable.
- When adding new sheet columns, update parsing + types with validations.
- This is a public repo, so avoid any sensitive data in code or comments.
