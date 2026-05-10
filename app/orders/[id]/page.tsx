import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOrder, deleteOrder, updateReturnStatus } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/delete-button";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { displayPerson, displayPeriod } from "@/lib/business";
import { formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function OrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { locale, t } = await getI18n();
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { payments: { orderBy: { paymentDate: "desc" } } }
  });
  if (!order) notFound();

  const returnAction = updateReturnStatus.bind(null, order.id);
  const cancelAction = cancelOrder.bind(null, order.id);
  const deleteAction = deleteOrder.bind(null, order.id);

  return (
    <main className="page">
      <PageHeader
        title={order.customerName}
        subtitle={`${displayPeriod(order.businessPeriod)} · ${t("source")} ${displayPerson(order.customerSource)} · ${t("handoverPerson")} ${displayPerson(order.handoverPerson)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order.id}/edit`} className="btn-secondary">{t("edit")}</Link>
            <Link href={`/orders/${order.id}/payment`} className="btn-primary">{t("addPayment")}</Link>
          </div>
        }
      />

      {query.deleteBlocked ? (
        <Card className="mb-6 border-orange-100 bg-orange-50">
          <p className="text-sm font-bold text-orange-800">{t("deleteBlocked")}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("finalPrice")} value={`£${money(order.finalPriceGBP)}`} />
        <StatCard label={t("paid")} value={`£${money(order.totalPaidGBP)}`} tone="green" />
        <StatCard label={t("remaining")} value={`£${money(order.remainingGBP)}`} tone="orange" />
        <StatCard label={t("payment")} value={labelStatus(order.paymentStatus, locale)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        <Card>
          <h2 className="text-xl font-semibold">{t("orderDetails")}</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <Row label={t("date")} value={formatDate(order.orderDate)} />
            <Row label={t("partner")} value={displayPerson(order.partnerName)} />
            <Row label={t("degree")} value={order.degreeType} />
            <Row label={t("items")} value={order.itemSummary} />
            <Row label={t("standardPrice")} value={`£${money(order.standardPriceGBP)}`} />
            <Row label={t("adjustment")} value={`£${money(order.adjustmentGBP)}`} />
            <Row label={t("orderStatus")} value={labelStatus(order.orderStatus, locale)} />
            <Row label={t("returnStatus")} value={labelStatus(order.returnStatus, locale)} />
          </dl>

          <form action={returnAction} className="mt-6 grid gap-3">
            <label>
              <span className="label">{t("updateReturnStatus")}</span>
              <select className="select" name="returnStatus" defaultValue={order.returnStatus}>
                <option value="NOT_COLLECTED">{labelStatus("NOT_COLLECTED", locale)}</option>
                <option value="COLLECTED_NOT_RETURNED">{labelStatus("COLLECTED_NOT_RETURNED", locale)}</option>
                <option value="RETURNED">{labelStatus("RETURNED", locale)}</option>
                <option value="ISSUE">{labelStatus("ISSUE", locale)}</option>
              </select>
            </label>
            <button className="btn-secondary" type="submit">{t("updateReturnStatus")}</button>
          </form>

          {order.orderStatus !== "CANCELLED" ? (
            <form action={cancelAction} className="mt-3">
              <ConfirmSubmitButton
                label={t("markCancelled")}
                message={t("cancelConfirm")}
              />
            </form>
          ) : null}

          <form action={deleteAction} className="mt-3">
            <input type="hidden" name="redirectTo" value={`/orders/${order.id}`} />
            <ConfirmSubmitButton
              label={t("deleteOrder")}
              message={t("deleteOrderConfirm")}
            />
          </form>

          {order.notes ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-app-secondary">
              {order.notes}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-4 text-xl font-semibold">{t("paymentRecords")}</h2>
          <div className="table-wrap shadow-none">
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("currency")}</th>
                  <th>{t("type")}</th>
                  <th>{t("ryanShare")}</th>
                  <th>{t("partnerShare")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Date">{formatDate(payment.paymentDate)}</td>
                    <td data-label="Amount">£{money(payment.amountGBP)}</td>
                    <td data-label="Currency">
                      {payment.currencyLabel}
                      {payment.actualPaymentNote ? (
                        <p className="text-xs text-app-secondary">{payment.actualPaymentNote}</p>
                      ) : null}
                    </td>
                    <td data-label="Type">{labelStatus(payment.paymentType, locale)}</td>
                    <td data-label="Ryan Share">£{money(payment.ryanShareGBP)}</td>
                    <td data-label="Partner Share">£{money(payment.partnerShareGBP)}</td>
                    <td data-label="Status">
                      <Badge tone={payment.settlementStatus === "SETTLED" ? "green" : "orange"}>
                        {labelStatus(payment.settlementStatus, locale)}
                      </Badge>
                    </td>
                    <td data-label={t("actions")}>
                      <Link
                        href={`/orders/${order.id}/payments/${payment.id}/edit`}
                        className="font-bold text-[#635bff] hover:text-[#0a2540]"
                      >
                        {t("edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
                {!order.payments.length ? (
                  <tr>
                    <td colSpan={8} className="text-app-secondary">
                      {t("noPayments")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-app-border pb-3">
      <dt className="text-app-secondary">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
