// National ID: 16 digits shown as 1234-5678-9012-3456

export function formatNationalId(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.match(/.{1,4}/g)?.join("-") ?? "";
}

export function isCompleteNationalId(value: string) {
  return value.replace(/\D/g, "").length === 16;
}
