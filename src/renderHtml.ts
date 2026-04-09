import fs from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";

export async function renderInvoiceHtml(data: unknown): Promise<string> {
  const tplPath = path.join(process.cwd(), "templates", "invoice.hbs");
  const cssPath = path.join(process.cwd(), "templates", "invoice.css");

  const [tplSrc, cssSrc] = await Promise.all([
    fs.readFile(tplPath, "utf8"),
    fs.readFile(cssPath, "utf8")
  ]);

  const tpl = Handlebars.compile(tplSrc);

  return tpl({ ...data, css: cssSrc });
}
