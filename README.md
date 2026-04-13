# Invoice Generator

Generates contractor invoices as PDFs from structured data in Google Sheets.

Invoice rows and optional extra line items are read from a shared Google Sheet,
rendered to HTML via a Handlebars template, and printed to PDF with Puppeteer.

## Setup

Requires Node.js (version pinned in `.nvmrc`).

```bash
nvm use
npm install
```

Create a `.env` file with:

```
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
SHEET_ID=<spreadsheet-id>
INVOICE_TIMEZONE=Pacific/Auckland
```

The Google Sheet must be shared (Viewer) with the service account's
`client_email`. It needs two tabs — **Invoices** and **LineItems**. See
`sheet_examples/` for sample data showing the expected columns and format.

## Usage

```bash
# Dev (runs TypeScript directly)
npm run dev -- --invoiceId 60b

# Or build first, then run
npm run build
npm run generate -- --invoiceId 60b
```

The PDF is written to `out/<invoiceId>.pdf`.

## GitHub Actions

A manual `workflow_dispatch` workflow (`.github/workflows/invoice.yaml`) builds
and runs the generator in CI. The resulting PDF is uploaded as an artifact named
after the invoice number.
