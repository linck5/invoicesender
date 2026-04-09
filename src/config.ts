import { z } from "zod";

const schema = z.object({
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  SHEET_ID: z.string().min(1),
  INVOICE_TIMEZONE: z.string().default("Pacific/Auckland")
});

export type Config = z.infer<typeof schema>;

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Bad env: ${parsed.error.message}`);
  }
  return parsed.data;
}
