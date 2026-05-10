import { cookies } from "next/headers";
import { getT, Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("locale")?.value === "zh" ? "zh" : "en";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getT(locale) };
}
