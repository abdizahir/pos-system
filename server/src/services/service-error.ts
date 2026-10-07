// server/src/services/service-error.ts
//
// Errors with an HTTP status, shared by the people / payroll services.

import { MoneySourceError } from "../utils/money-source.js";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// Money-source checks throw MoneySourceError; surface them as 400s
export function toServiceError(err: unknown): never {
  if (err instanceof MoneySourceError) throw new ServiceError(err.message);
  throw err;
}

export function toServiceErrorSync<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    toServiceError(err);
  }
}
