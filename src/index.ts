import path from "node:path";
import { DateTime } from "luxon";
import { loadConfig } from "./config.js";
import { loadFromSheets } from "./sheets.js";
import { buildBaseServiceLine, lastDayOfMonthIso, sumTotal } from "./calc.js";
import { renderInvoiceHtml } from "./renderHtml.js";
import { htmlToPdf } from "./renderPdf.js";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function defaultInvoiceId(tz: string): string {
  const now = DateTime.now().setZone(tz);
  const prevMonth = now.minus({ months: 1 });
  return prevMonth.toFormat("yyyy-MM");
}

async function main(): Promise<void> {
  const cfg = loadConfig();

  const invoiceId = getArg("invoiceId") ?? defaultInvoiceId(cfg.INVOICE_TIMEZONE);

  const { invoice, extras } = await loadFromSheets({
    serviceAccountJson: cfg.GOOGLE_SERVICE_ACCOUNT_JSON,
    sheetId: cfg.SHEET_ID,
    invoiceId
  });

  const { line: baseLine } = buildBaseServiceLine({
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    leaveDays: invoice.leaveDays,
    hourlyRateNzd: invoice.hourlyRateNzd,
    tz: cfg.INVOICE_TIMEZONE
  });

  const invoiceDate = lastDayOfMonthIso(invoice.periodEnd, cfg.INVOICE_TIMEZONE);

  const items = [baseLine, ...extras].map((li) => {
    const amount = li.quantity * li.unitPriceNzd;
    return { ...li, amountNzd: amount };
  });

  const totalNzd = sumTotal(items);

  const html = await renderInvoiceHtml({
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate,
    yourName: invoice.yourName,
    yourAddress: invoice.yourAddress,
    clientName: invoice.clientName,
    clientAddress: invoice.clientAddress,
    currency: "NZD",
    items,
    totalNzd,
    notes: invoice.notes ?? ""
  });

  const outPath = path.join(process.cwd(), "out", `${invoiceId}.pdf`);
  await htmlToPdf({ html, outPath });

  console.log(JSON.stringify({ invoiceId, outPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
