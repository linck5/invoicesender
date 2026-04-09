import { google } from "googleapis";
import { z } from "zod";
import type { InvoiceRow, LineItem } from "./types.js";

const invoiceSchema = z.object({
  invoice_id: z.string().min(1),
  client_name: z.string().min(1),
  client_address: z.string().min(1),
  your_name: z.string().min(1),
  your_address: z.string().min(1),
  hourly_rate_nzd: z.coerce.number(),
  leave_days: z.coerce.number(),
  period_start: z.string().min(10),
  period_end: z.string().min(10),
  invoice_number: z.string().min(1),
  notes: z.string().optional()
});

export async function loadFromSheets(params: {
  serviceAccountJson: string;
  sheetId: string;
  invoiceId: string;
}): Promise<{ invoice: InvoiceRow; extras: LineItem[] }> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(params.serviceAccountJson),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const invoicesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: params.sheetId,
    range: "Invoices!A:Z"
  });

  const lineItemsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: params.sheetId,
    range: "LineItems!A:Z"
  });

  const invoices = toObjects(invoicesRes.data.values ?? []);
  const lineItems = toObjects(lineItemsRes.data.values ?? []);

  const match = invoices.find((r) => r.invoice_id === params.invoiceId);
  if (!match) {
    throw new Error(`Invoice not found in sheet: ${params.invoiceId}`);
  }

  const invParsed = invoiceSchema.parse(match);

  const invoice: InvoiceRow = {
    invoiceId: invParsed.invoice_id,
    clientName: invParsed.client_name,
    clientAddress: invParsed.client_address,
    yourName: invParsed.your_name,
    yourAddress: invParsed.your_address,
    hourlyRateNzd: invParsed.hourly_rate_nzd,
    leaveDays: invParsed.leave_days,
    periodStart: invParsed.period_start,
    periodEnd: invParsed.period_end,
    invoiceNumber: invParsed.invoice_number,
    notes: invParsed.notes
  };

  const extras: LineItem[] = lineItems
    .filter((r) => r.invoice_id === params.invoiceId)
    .map((r) => {
      return {
        description: String(r.description ?? "").trim(),
        quantity: Number(r.quantity ?? 0),
        unitPriceNzd: Number(r.unit_price_nzd ?? 0)
      };
    })
    .filter((li) => li.description && li.quantity);

  return { invoice, extras };
}

function toObjects(values: string[][]): Record<string, string>[] {
  if (values.length === 0) return [];
  const [headerRow, ...rows] = values;
  const headers = headerRow.map((h) => String(h).trim());

  return rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? "";
    });
    return obj;
  });
}
