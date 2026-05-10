export function money(value: number | string | { toString(): string }) {
  return Number(value).toFixed(2);
}

export function parseMoney(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    throw new Error("Invalid amount");
  }
  return Math.round(amount * 100) / 100;
}

export function addMoney(values: unknown[]) {
  const total = values.reduce<number>((sum, value) => sum + Number(value), 0);
  return Math.round(total * 100) / 100;
}
