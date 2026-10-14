// The message to send back to the browser for an error.
//
// Our services throw plain errors with messages written for users
// ("Supplier not found"). Database and library errors can describe
// tables, queries or internals, so those get the fallback instead.
export function clientMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.name.startsWith("Prisma") || error.constructor.name.startsWith("Prisma")) {
    return fallback;
  }
  return error.message || fallback;
}
