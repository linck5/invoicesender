import { DateTime } from "luxon";

export function countBusinessDaysInclusive(
  startIso: string,
  endIso: string,
  tz: string
): number {
  let d = DateTime.fromISO(startIso, { zone: tz }).startOf("day");
  const end = DateTime.fromISO(endIso, { zone: tz }).startOf("day");

  if (end < d) return 0;

  let count = 0;
  while (d <= end) {
    const weekday = d.weekday; // 1=Mon ... 7=Sun
    if (weekday <= 5) count++;
    d = d.plus({ days: 1 });
  }
  return count;
}

export function buildBaseServiceLine(params: {
  periodStart: string;
  periodEnd: string;
  leaveDays: number;
  hourlyRateNzd: number;
  tz: string;
}): {
  line: { description: string; quantity: number; unitPriceNzd: number };
  meta: { businessDays: number; daysWorked: number };
} {
  const businessDays = countBusinessDaysInclusive(
    params.periodStart,
    params.periodEnd,
    params.tz
  );
  const daysWorked = Math.max(0, businessDays - params.leaveDays);

  const hours = daysWorked * 8;

  const description =
    `Services provided from ${params.periodStart} to ` +
    `${params.periodEnd}\n` +
    `Business days: ${businessDays}\n` +
    `Leave days: ${params.leaveDays}\n` +
    `Days worked: ${daysWorked}\n` +
    `Hours: ${hours}\n` +
    `Hourly rate: ${params.hourlyRateNzd.toFixed(2)} NZD`;

  return {
    line: {
      description,
      quantity: hours,
      unitPriceNzd: params.hourlyRateNzd
    },
    meta: { businessDays, daysWorked }
  };
}

export function sumTotal(items: {
  quantity: number;
  unitPriceNzd: number;
}[]): number {
  return items.reduce((acc, it) => acc + it.quantity * it.unitPriceNzd, 0);
}