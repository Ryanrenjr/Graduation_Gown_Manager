import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { displayPerson } from "@/lib/business";
import { formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function SettlementHistoryPage() {
  const { locale, t } = await getI18n();
  const settlements = await prisma.weeklySettlement.findMany({
    orderBy: { weekStartDate: "desc" }
  });

  return (
    <main className="page">
      <PageHeader title={t("settlementHistory")} subtitle={t("settlementHistorySubtitle")} />
      <div className="table-wrap">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>{t("week")}</th>
              <th>{t("partner")}</th>
              <th>{t("totalPayments")}</th>
              <th>{t("ryanShare")}</th>
              <th>{t("partnerShare")}</th>
              <th>{t("ryanTransferred")}</th>
              <th>{t("status")}</th>
              <th>{t("paidDate")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((settlement) => (
              <tr key={settlement.id}>
                <td data-label="Week">
                  {formatDate(settlement.weekStartDate)} - {formatDate(settlement.weekEndDate)}
                </td>
                <td data-label="Partner">{displayPerson(settlement.partnerName)}</td>
                <td data-label="Total Payment">£{money(settlement.totalPaymentGBP)}</td>
                <td data-label="Ryan Share">£{money(settlement.totalRyanShareGBP)}</td>
                <td data-label="Partner Share">£{money(settlement.totalPartnerShareGBP)}</td>
                <td data-label="Ryan Transferred">£{money(settlement.amountRyanShouldTransferGBP)}</td>
                <td data-label="Status">
                  <Badge tone={settlement.status === "PAID" ? "green" : "blue"}>{labelStatus(settlement.status, locale)}</Badge>
                </td>
                <td data-label="Paid Date">{settlement.paidAt ? formatDate(settlement.paidAt) : "-"}</td>
                <td data-label="Actions">
                  <Link className="text-sm font-semibold text-app-blue" href={`/settlements/history/${settlement.id}`}>
                    {t("view")}
                  </Link>
                </td>
              </tr>
            ))}
            {!settlements.length ? (
              <tr>
                <td colSpan={9} className="text-app-secondary">{t("noSettlementRecords")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
