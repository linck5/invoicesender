export type InvoiceRow = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD

  clientName: string;
  clientDetails: string;

  senderName: string;
  senderDetails: string;

  hourlyRate?: number;
  leaveDays?: number;

  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string; // YYYY-MM-DD

  emailName?: string;
  notes?: string;
};

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};