import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

export async function renderInvoiceHtml(data: Record<string, unknown>): Promise<string> {
  const tplPath = path.join(process.cwd(), "templates", "invoice.hbs");
  const cssPath = path.join(process.cwd(), "templates", "invoice.css");

  const [tplSrc, cssSrc] = await Promise.all([
    fs.readFile(tplPath, "utf8"),
    fs.readFile(cssPath, "utf8")
  ]);

  Handlebars.registerHelper("fmtCurrency", (value: number) =>
    new Intl.NumberFormat("en-NZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  );

  const tpl = Handlebars.compile(tplSrc);

  return tpl({ ...data, css: cssSrc });
}
