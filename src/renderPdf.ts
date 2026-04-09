import fs from "node:fs/promises";
import puppeteer from "puppeteer";

export async function htmlToPdf(params: {
  html: string;
  outPath: string;
}): Promise<void> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(params.html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" }
    });

    await fs.mkdir(new URL(".", `file:${params.outPath}`), {
      recursive: true
    }).catch(() => {});

    await fs.writeFile(params.outPath, pdf);
  } finally {
    await browser.close();
  }
}
