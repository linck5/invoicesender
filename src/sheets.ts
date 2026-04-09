import { google } from "googleapis";
import { z } from "zod";
import type { InvoiceRow, LineItem } from "./types.js";

const emptyToUndefined = (v: unknown) =>
  v === "" || v == null ? undefined : v;

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().optional()
);
const optionalDateStr = z.preprocess(
  emptyToUndefined,
  z.string().min(10).optional()
);

const invoiceSchema = z.object({
  invoice_id: z.string().min(1),
  invoice_number: z.string().min(1),
  invoice_date: z.string().min(10),

  client_name: z.string().min(1),
  client_details: z.string().min(1),

  sender_name: z.string().min(1),
  sender_details: z.string().min(1),

  hourly_rate: optionalNumber,
  leave_days: optionalNumber,

  period_start: optionalDateStr,
  period_end: optionalDateStr,

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
    invoiceNumber: invParsed.invoice_number,
    invoiceDate: invParsed.invoice_date,

    clientName: invParsed.client_name,
    clientDetails: invParsed.client_details,

    senderName: invParsed.sender_name,
    senderDetails: invParsed.sender_details,

    hourlyRate: invParsed.hourly_rate,
    leaveDays: invParsed.leave_days,

    periodStart: invParsed.period_start,
    periodEnd: invParsed.period_end,

    notes: invParsed.notes
  };

  const extras: LineItem[] = lineItems
    .filter((r) => r.invoice_id === params.invoiceId)
    .map((r) => {
      return {
        description: String(r.description ?? "").trim(),
        quantity: Number(r.quantity ?? 0),
        unitPrice: Number(r.unit_price ?? 0)
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