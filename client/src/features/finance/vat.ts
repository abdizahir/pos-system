import type { TaxAuthority } from "../../api/api";

// Who VAT can be paid to
export const AUTHORITIES: { value: TaxAuthority; name: string; initials: string }[] = [
  {
    value: "SOMALI_REGIONAL_STATE_REVENUE_BUREAU",
    name: "Somali Regional State Revenue Bureau",
    initials: "SR",
  },
  {
    value: "JIGJIGA_CITY_REVENUE_BUREAU",
    name: "Jigjiga City Revenue Bureau",
    initials: "JC",
  },
];
