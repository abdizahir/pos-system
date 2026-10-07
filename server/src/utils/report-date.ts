export function parseAsOfDate(value: unknown): Date {
  if (value === undefined) {
    return new Date();
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new Error(
      "asOf must be an ISO date in YYYY-MM-DD format",
    );
  }

  const date = new Date(
    `${value}T23:59:59.999Z`,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      "asOf must be a valid calendar date",
    );
  }

  return date;
}
