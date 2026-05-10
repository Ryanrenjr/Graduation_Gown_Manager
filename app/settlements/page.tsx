import Link from "next/link";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { displayPerson } from "@/lib/business";
import { currentWeekRange, formatDate, isoDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { generateSettlement } from "../actions";

export default async function SettlementPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();
  const fallback = currentWeekRange();
  const start = params.weekStartDate
    ? new Date(`${params.weekStartDate}T00:00:00`)
    : fallback.start;
  const end = params.weekEndDate
    ? new Date(`${params.weekEndDate}T23:59:59`)
    : fallback.end;

  const payments = await prisma.payment.findMany({
    where: {
      settlementStatus: "UNSETTLED",
      partnerName: "Xiong",
      paymentDate: { gte: start, lte: end },
      order: { orderStatus: { not: "CANCELLED" } }
    },
    include: { order: true },
    orderBy: { paymentDate: "asc" }
  });
  const settledPayments = await prisma.payment.findMany({
    where: {
      settlementStatus: "SETTLED",
      partnerName: "Xiong",
      paymentDate: { gte: start, lte: end },
      order: { orderStatus: { not: "CANCELLED" } }
    },
    include: { order: true, settlement: true },
    orderBy: { paymentDate: "asc" }
  });

  const total = payments.reduce((sum, payment) => sum + Number(payment.amountGBP), 0);
  const ryan = payments.reduce((sum, payment) => sum + Number(payment.ryanShareGBP), 0);
  const partner = payments.reduce((sum, payment) => sum + Number(payment.partnerShareGBP), 0);
  const settledTotal = settledPayments.reduce(
    (sum, payment) => sum + Number(payment.amountGBP),
    0
  );
  const settledPartner = settledPayments.reduce(
    (sum, payment) => sum + Number(payment.partnerShareGBP),
    0
  );
  const paymentGroups = groupPaymentsByOrder(payments);
  const settledPaymentGroups = groupPaymentsByOrder(settledPayments);
  const rangeText = `${formatDate(start)} - ${formatDate(end)}`;
  const pageCopy =
    locale === "zh"
      ? {
          title: "本周收款结算",
          subtitle:
            "只看本周实际收到的钱。哪怕是 7 月订单，本周收到定金也会在这里结算。",
          dateRule: "结算依据：收款日期",
          orderRule: "订单日期只表示租赁/取衣日期，不决定哪一周分账。",
          transferLabel: "Ryan 本周需要转给 Fay",
          transferNote: `来自 ${rangeText} 的未结算收款 Payment`,
          paymentCount: "待结算笔数",
          cashIn: "本周实际收到",
          ryanKeeps: "Ryan 本周留存",
          fayGets: "Fay 本周应得",
          dateCardTitle: "选择收款周",
          dateCardHint: "这里筛的是 Payment 收款日期，不是 Order 订单日期。",
          tableTitle: "本周待结算收款",
          tableSubtitle:
            "按订单分组展示；同一订单的定金和尾款会显示在同一个订单块里。",
          paymentBreakdown: "收款明细",
          receivedDate: "本周收款日期",
          rentalDate: "租赁/订单日期",
          orderContent: "订单内容",
          receivedAmount: "本周收到",
          ryanShare: "Ryan 应得",
          fayShare: "Fay 应得",
          settlementStatus: "结算状态",
          futurePayment: "未来订单收款",
          refresh: "更新本周数据",
          settledTitle: "本周已结算收款",
          settledSubtitle: "这些 Payment 已经绑定结算单，不会重复进入待结算金额。",
          settledTotal: "本周已结算",
          settledTransfer: "已计入 Fay 应得",
          viewSettlement: "查看结算单",
          noRows: "这个收款周没有 Fay 合作期的未结算收款。"
        }
      : {
          title: "This Week Cash Settlement",
          subtitle:
            "Only actual money received this week is settled. A July rental deposit received this week appears here.",
          dateRule: "Settlement basis: payment date",
          orderRule: "Order date is only the rental or handover date.",
          transferLabel: "Ryan should transfer to Fay",
          transferNote: `Unsettled Payment records from ${rangeText}`,
          paymentCount: "Payments to settle",
          cashIn: "Cash received this week",
          ryanKeeps: "Ryan keeps this week",
          fayGets: "Fay receives this week",
          dateCardTitle: "Choose payment week",
          dateCardHint: "This filters Payment dates, not Order dates.",
          tableTitle: "Payments To Settle This Week",
          tableSubtitle:
            "Grouped by order; deposits and balances for the same order stay in one order block.",
          paymentBreakdown: "Payment breakdown",
          receivedDate: "Payment date",
          rentalDate: "Rental / order date",
          orderContent: "Order content",
          receivedAmount: "Received",
          ryanShare: "Ryan share",
          fayShare: "Fay share",
          settlementStatus: "Settlement status",
          futurePayment: "Future order payment",
          refresh: "Refresh Week",
          settledTitle: "Settled Payments This Week",
          settledSubtitle:
            "These Payment records are already tied to settlements and will not be counted again.",
          settledTotal: "Settled this week",
          settledTransfer: "Already counted for Fay",
          viewSettlement: "View settlement",
          noRows: "No unsettled Fay partnership payments in this payment week."
        };

  return (
    <main className="page">
      <PageHeader
        title={pageCopy.title}
        subtitle={pageCopy.subtitle}
      />

      {params.empty ? (
        <Card className="mb-6 border-orange-100 bg-orange-50">
          <p className="text-sm font-medium text-orange-800">
            {t("noUnsettled")}
          </p>
        </Card>
      ) : null}

      {params.settlementUndone ? (
        <Card className="mb-6 border-green-100 bg-green-50">
          <p className="text-sm font-bold text-green-800">
            {t("settlementUndone")}
          </p>
        </Card>
      ) : null}

      <section className="settlement-hero mb-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
            {pageCopy.dateRule}
          </p>
          <h2 className="mt-4 max-w-2xl text-5xl font-bold tracking-[-0.04em] text-white sm:text-6xl">
            {pageCopy.transferLabel}
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-300">{pageCopy.transferNote}</p>
          <p className="mt-2 text-base font-semibold text-slate-400">{pageCopy.orderRule}</p>
        </div>
        <div className="settlement-amount-panel">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
            {t("ryanShouldTransfer")}
          </p>
          <p className="mt-4 text-6xl font-bold tracking-[-0.05em] text-white">
            £{money(partner)}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold text-slate-300">
            <span>{pageCopy.paymentCount}</span>
            <span className="text-right text-white">{payments.length}</span>
            <span>{pageCopy.cashIn}</span>
            <span className="text-right text-white">£{money(total)}</span>
          </div>
        </div>
      </section>

      <form className="card mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0a2540]">
            {pageCopy.dateCardTitle}
          </h2>
          <p className="mt-2 text-base font-medium text-app-secondary">
            {pageCopy.dateCardHint}
          </p>
        </div>
        <div className="hidden md:block" />
        <label>
          <span className="label">{t("weekStart")}</span>
          <input className="input" type="date" name="weekStartDate" defaultValue={isoDate(start)} />
        </label>
        <label>
          <span className="label">{t("weekEnd")}</span>
          <input className="input" type="date" name="weekEndDate" defaultValue={isoDate(end)} />
        </label>
        <button className="btn-primary" type="submit">{t("preview")}</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={pageCopy.cashIn} value={`£${money(total)}`} />
        <StatCard label={pageCopy.ryanKeeps} value={`£${money(ryan)}`} tone="blue" />
        <StatCard label={pageCopy.fayGets} value={`£${money(partner)}`} />
        <StatCard label={t("weekTransfer")} value={`£${money(partner)}`} tone="orange" />
      </div>

      {settledPayments.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard label={pageCopy.settledTotal} value={`£${money(settledTotal)}`} tone="green" />
          <StatCard label={pageCopy.settledTransfer} value={`£${money(settledPartner)}`} />
        </div>
      ) : null}

      <Card className="mt-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0a2540]">
              {pageCopy.tableTitle}
            </h2>
            <p className="mt-1 text-base font-semibold text-app-secondary">
              {rangeText}
            </p>
            <p className="mt-2 max-w-3xl text-base font-medium text-app-secondary">
              {pageCopy.tableSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form>
              <input type="hidden" name="weekStartDate" value={isoDate(start)} />
              <input type="hidden" name="weekEndDate" value={isoDate(end)} />
              <button className="btn-secondary" type="submit">{pageCopy.refresh}</button>
            </form>
            <form action={generateSettlement}>
              <input type="hidden" name="weekStartDate" value={isoDate(start)} />
              <input type="hidden" name="weekEndDate" value={isoDate(end)} />
              <input type="hidden" name="partnerName" value="Xiong" />
              <button className="btn-primary" type="submit">{t("generateWeeklySettlement")}</button>
            </form>
          </div>
        </div>

        <div className="table-wrap shadow-none">
          <table className="table responsive-table">
            <thead>
              <tr>
                <th>{pageCopy.receivedDate}</th>
                <th>{pageCopy.rentalDate}</th>
                <th>{t("customer")}</th>
                <th>{pageCopy.orderContent}</th>
                <th>{pageCopy.receivedAmount}</th>
                <th>{t("currency")}</th>
                <th>{t("customerSource")}</th>
                <th>{pageCopy.ryanShare}</th>
                <th>{pageCopy.fayShare}</th>
                <th>{pageCopy.settlementStatus}</th>
              </tr>
            </thead>
            <tbody>
              {paymentGroups.map((group) => {
                const isFutureOrder = group.orderDate > group.firstPaymentDate;

                return (
                  <tr key={group.orderId}>
                    <td data-label={pageCopy.receivedDate}>
                      {formatDate(group.firstPaymentDate)}
                      {group.payments.length > 1 ? (
                        <p className="mt-1 text-xs font-semibold text-app-secondary">
                          {group.payments.length} {pageCopy.paymentBreakdown}
                        </p>
                      ) : null}
                    </td>
                    <td data-label={pageCopy.rentalDate}>
                      <div className="flex flex-col gap-2">
                        <span>{formatDate(group.orderDate)}</span>
                        {isFutureOrder ? (
                          <Badge tone="blue">{pageCopy.futurePayment}</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td data-label={t("customer")}>{group.customerName}</td>
                    <td data-label={pageCopy.orderContent}>
                      <p>{group.itemSummary}</p>
                      <div className="mt-3 grid gap-1 text-xs font-semibold text-app-secondary">
                        {group.payments.map((payment) => (
                          <p key={payment.id}>
                            {formatDate(payment.paymentDate)} · {labelStatus(payment.paymentType, locale)} · £{money(payment.amountGBP)} · {payment.currencyLabel}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td data-label={pageCopy.receivedAmount}>£{money(group.amountGBP)}</td>
                    <td data-label={t("currency")}>{group.currencySummary}</td>
                    <td data-label={t("customerSource")}>{displayPerson(group.customerSource)}</td>
                    <td data-label={pageCopy.ryanShare}>£{money(group.ryanShareGBP)}</td>
                    <td data-label={pageCopy.fayShare}>£{money(group.partnerShareGBP)}</td>
                    <td data-label={pageCopy.settlementStatus}>
                      <Badge tone="orange">{labelStatus("UNSETTLED", locale)}</Badge>
                    </td>
                  </tr>
                );
              })}
              {!payments.length ? (
                <tr>
                  <td colSpan={10} className="text-app-secondary">
                    {pageCopy.noRows}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {settledPayments.length ? (
        <Card className="mt-6">
          <div className="mb-4">
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0a2540]">
              {pageCopy.settledTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-base font-medium text-app-secondary">
              {pageCopy.settledSubtitle}
            </p>
          </div>
          <div className="table-wrap shadow-none">
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th>{pageCopy.receivedDate}</th>
                  <th>{pageCopy.rentalDate}</th>
                  <th>{t("customer")}</th>
                  <th>{pageCopy.orderContent}</th>
                  <th>{pageCopy.receivedAmount}</th>
                  <th>{pageCopy.fayShare}</th>
                  <th>{pageCopy.settlementStatus}</th>
                </tr>
              </thead>
              <tbody>
                {settledPaymentGroups.map((group) => (
                  <tr key={group.orderId}>
                    <td data-label={pageCopy.receivedDate}>{formatDate(group.firstPaymentDate)}</td>
                    <td data-label={pageCopy.rentalDate}>{formatDate(group.orderDate)}</td>
                    <td data-label={t("customer")}>{group.customerName}</td>
                    <td data-label={pageCopy.orderContent}>
                      <p>{group.itemSummary}</p>
                      <div className="mt-3 grid gap-1 text-xs font-semibold text-app-secondary">
                        {group.payments.map((payment) => (
                          <p key={payment.id}>
                            {formatDate(payment.paymentDate)} · {labelStatus(payment.paymentType, locale)} · £{money(payment.amountGBP)} · {payment.currencyLabel}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td data-label={pageCopy.receivedAmount}>£{money(group.amountGBP)}</td>
                    <td data-label={pageCopy.fayShare}>£{money(group.partnerShareGBP)}</td>
                    <td data-label={pageCopy.settlementStatus}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="green">{labelStatus("SETTLED", locale)}</Badge>
                        {group.settlementId ? (
                          <Link
                            href={`/settlements/history/${group.settlementId}`}
                            className="text-sm font-bold text-[#635bff] hover:text-[#0a2540]"
                          >
                            {pageCopy.viewSettlement} #{group.settlementId}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </main>
  );
}

type PaymentWithOrder = Awaited<
  ReturnType<typeof prisma.payment.findMany>
>[number] & {
  order: {
    id: number;
    orderDate: Date;
    customerName: string;
    itemSummary: string;
  };
  settlementId?: number | null;
};

function groupPaymentsByOrder(payments: PaymentWithOrder[]) {
  const groups = new Map<number, PaymentWithOrder[]>();
  for (const payment of payments) {
    const existing = groups.get(payment.orderId) ?? [];
    existing.push(payment);
    groups.set(payment.orderId, existing);
  }

  return Array.from(groups.entries()).map(([orderId, orderPayments]) => {
    const sortedPayments = [...orderPayments].sort(
      (a, b) => a.paymentDate.getTime() - b.paymentDate.getTime()
    );
    const first = sortedPayments[0];
    const currencies = Array.from(
      new Set(sortedPayments.map((payment) => payment.currencyLabel))
    );

    return {
      orderId,
      orderDate: first.order.orderDate,
      firstPaymentDate: sortedPayments[0].paymentDate,
      customerName: first.order.customerName,
      itemSummary: first.order.itemSummary,
      customerSource: first.customerSource,
      currencySummary: currencies.join(" / "),
      settlementId: first.settlementId,
      amountGBP: sortedPayments.reduce(
        (sum, payment) => sum + Number(payment.amountGBP),
        0
      ),
      ryanShareGBP: sortedPayments.reduce(
        (sum, payment) => sum + Number(payment.ryanShareGBP),
        0
      ),
      partnerShareGBP: sortedPayments.reduce(
        (sum, payment) => sum + Number(payment.partnerShareGBP),
        0
      ),
      payments: sortedPayments
    };
  });
}
