import Link from "next/link";
import { toggleLocale } from "@/app/actions";
import { getI18n } from "@/lib/i18n-server";

export async function Nav() {
  const { locale, t } = await getI18n();
  const nextLocale = locale === "zh" ? "en" : "zh";
  const links = [
    [t("dashboard"), "/"],
    [t("orders"), "/orders"],
    [t("settlement"), "/settlements"],
    [t("history"), "/settlements/history"],
    [t("inventory"), "/inventory"]
  ];

  return (
    <nav className="sticky top-0 z-20 px-3 pb-2">
      <div className="nav-shell">
        <Link href="/" className="flex items-center gap-3 text-sm font-black text-[#0a2540] sm:text-base">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#635bff] text-xs text-white shadow-[0_10px_24px_rgba(99,91,255,0.24)]">
            GM
          </span>
          <span className="hidden sm:inline">Graduation Gown Rental Manager</span>
          <span className="sm:hidden">Gown Manager</span>
        </Link>
        <div className="flex gap-2 overflow-x-auto">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="nav-pill">
              {label}
            </Link>
          ))}
          <form action={toggleLocale}>
            <input type="hidden" name="locale" value={nextLocale} />
            <button className="nav-pill bg-[#0a2540] text-white hover:bg-[#635bff] hover:text-white" type="submit">
              {locale === "zh" ? "English" : "中文"}
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
