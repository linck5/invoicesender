import fs from "node:fs";

/**
 * Writes GitHub Actions step outputs and job summary when running in CI.
 *
 * - Sets the `invoice_number` step output (used by upload-artifact).
 * - Writes an email subject/body suggestion to the Job Summary
 *   (visible on the workflow run page in GitHub).
 *
 * No-ops silently when `GITHUB_OUTPUT` / `GITHUB_STEP_SUMMARY` env vars
 * are not set (i.e. local development).
 */
export function writeActionsOutputs(
  invoiceNumber: string,
  emailName?: string,
  periodStart?: string
): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!outputFile || !summaryFile) return;

  fs.appendFileSync(outputFile, `invoice_number=${invoiceNumber}\n`);

  if (emailName && periodStart) {
    const date = new Date(periodStart + "T00:00:00");
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "long" });
    const emailTitle = `${emailName} - ${year} ${month} Invoice`;

    const summary = [
      "### Email suggestion",
      emailTitle,
      "",
      "Hello,",
      "",
      "Here is this month's invoice",
      ""
    ].join("\n");

    fs.appendFileSync(summaryFile, summary);
  }
}
