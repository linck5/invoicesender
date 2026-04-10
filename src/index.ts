import "dotenv/config";
import path from "node:path";
import { loadConfig } from "./config.js";
import { loadFromSheets } from "./sheets.js";
import { buildBaseServiceLine, sumTotal } from "./calc.js";
import { renderInvoiceHtml } from "./renderHtml.js";
import { htmlToPdf } from "./renderPdf.js";
import { writeActionsOutputs } from "./ci.js";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const cfg = loadConfig();

  const invoiceId = getArg("invoiceId");
  if (!invoiceId) {
    throw new Error(
      "Missing required arg: --invoiceId\n" +
        'Example: npm run generate -- --invoiceId "60b"'
    );
  }

  const { invoice, extras } = await loadFromSheets({
    serviceAccountJson: cfg.GOOGLE_SERVICE_ACCOUNT_JSON,
    sheetId: cfg.SHEET_ID,
    invoiceId
  });

  const hasBaseService =
    invoice.periodStart != null &&
    invoice.periodEnd != null &&
    invoice.leaveDays != null &&
    invoice.hourlyRate != null;

  const baseLines = hasBaseService
    ? [
        buildBaseServiceLine({
          periodStart: invoice.periodStart!,
          periodEnd: invoice.periodEnd!,
          leaveDays: invoice.leaveDays!,
          hourlyRate: invoice.hourlyRate!,
          tz: cfg.INVOICE_TIMEZONE
        }).line
      ]
    : [];

  const items = [...baseLines, ...extras].map((li) => {
    const amount = li.quantity * li.unitPrice;
    return { ...li, amountNzd: amount };
  });

  const totalNzd = sumTotal(items);

  const html = await renderInvoiceHtml({
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,

    senderName: invoice.senderName,
    senderDetails: invoice.senderDetails,

    clientName: invoice.clientName,
    clientDetails: invoice.clientDetails,

    currency: "NZD",
    items,
    totalNzd,
    notes: invoice.notes ?? ""
  });

  const outPath = path.join(
    process.cwd(),
    "out",
    `${invoice.invoiceNumber}.pdf`
  );
  await htmlToPdf({ html, outPath });

  console.log(
    JSON.stringify(
      {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        emailName: invoice.emailName,
        periodStart: invoice.periodStart,
        outPath
      },
      null,
      2
    )
  );

  writeActionsOutputs(invoice.invoiceNumber, invoice.emailName, invoice.periodStart);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});