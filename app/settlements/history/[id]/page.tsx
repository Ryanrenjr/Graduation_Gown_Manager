import { notFound } from "next/navigation";
import { markSettlementPaid, undoSettlement } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/delete-button";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { displayPerson } from "@/lib/business";
import { formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function SettlementDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { locale, t } = await getI18n();
  const settlement = await prisma.weeklySettlement.findUnique({
    where: { id: Number(id) },
    include: {
      payments: {
        include: { order: true },
        orderBy: { paymentDate: "asc" }
      }
    }
  });
  if (!settlement) notFound();
  const paidAction = markSettlementPaid.bind(null, settlement.id);
  const undoAction = undoSettlement.bind(null, settlement.id);

  return (
    <main className="page">
      <PageHeader
        title={t("settlementDetail")}
        subtitle={`${formatDate(settlement.weekStartDate)} - ${formatDate(settlement.weekEndDate)} · ${displayPerson(settlement.partnerName)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {settlement.status !== "PAID" ? (
              <>
                <form action={undoAction}>
                  <ConfirmSubmitButton
                    label={t("undoSettlement")}
                    message={t("undoSettlementConfirm")}
                    className="btn-secondary"
                  />
                </form>
                <form action={paidAction}>
                  <button className="btn-primary" type="submit">{t("markAsPaid")}</button>
                </form>
              </>
            ) : null}
          </div>
        }
      />

      {query.paidBlocked ? (
        <Card className="mb-6 border-orange-100 bg-orange-50">
          <p className="text-sm font-bold text-orange-800">{t("paidSettlementCannotUndo")}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalPayments")} value={`£${money(settlement.totalPaymentGBP)}`} />
        <StatCard label={t("ryanShare")} value={`£${money(settlement.totalRyanShareGBP)}`} tone="blue" />
        <StatCard label={t("partnerShare")} value={`£${money(settlement.totalPartnerShareGBP)}`} />
        <StatCard label={t("ryanTransferred")} value={`£${money(settlement.amountRyanShouldTransferGBP)}`} tone="orange" />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("includedPayments")}</h2>
          <Badge tone={settlement.status === "PAID" ? "green" : "blue"}>{labelStatus(settlement.status, locale)}</Badge>
        </div>
        <div className="table-wrap shadow-none">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("customer")}</th>
                <th>{t("amount")}</th>
                <th>{t("currency")}</th>
                <th>{t("source")}</th>
                <th>{t("ryanShare")}</th>
                <th>{t("partnerShare")}</th>
              </tr>
            </thead>
            <tbody>
              {settlement.payments.map((payment) => (
                <tr key={payment.id}>
                  <td data-label="Date">{formatDate(payment.paymentDate)}</td>
                  <td data-label="Customer">{payment.order.customerName}</td>
                  <td data-label="Amount">£{money(payment.amountGBP)}</td>
                  <td data-label="Currency">{payment.currencyLabel}</td>
                  <td data-label="Source">{displayPerson(payment.customerSource)}</td>
                  <td data-label="Ryan Share">£{money(payment.ryanShareGBP)}</td>
                  <td data-label="Partner Share">£{money(payment.partnerShareGBP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
