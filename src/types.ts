export type InvoiceRow = {
  invoiceId: string;
  clientName: string;
  clientAddress: string;
  yourName: string;
  yourAddress: string;
  hourlyRateNzd: number;
  leaveDays: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  invoiceNumber: string;
  notes?: string;
};

export type LineItem = {
  description: string;
  quantity: number;
  unitPriceNzd: number;
};
