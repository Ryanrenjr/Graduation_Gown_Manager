import Link from "next/link";
import { Prisma } from "@prisma/client";
import { deleteOrder, settleRemaining, updateReturnStatus } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/delete-button";
import { Badge, PageHeader } from "@/components/ui";
import { OrderFilterPanel } from "@/components/order-filter-panel";
import { displayPerson, displayPeriod } from "@/lib/business";
import { formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();
  const where: Prisma.OrderWhereInput = { orderStatus: { not: "CANCELLED" } };

  if (params.businessPeriod) where.businessPeriod = params.businessPeriod as never;
  if (params.customerSource) where.customerSource = params.customerSource as never;
  if (params.paymentStatus) where.paymentStatus = params.paymentStatus as never;
  if (params.returnStatus) where.returnStatus = params.returnStatus as never;
  if (params.degreeType) where.degreeType = params.degreeType as never;
  if (params.startDate || params.endDate) {
    where.orderDate = {
      gte: params.startDate ? new Date(`${params.startDate}T00:00:00`) : undefined,
      lte: params.endDate ? new Date(`${params.endDate}T23:59:59`) : undefined
    };
  }
  if (params.currencyLabel) {
    where.payments = {
      some: { currencyLabel: params.currencyLabel as never }
    };
  }

  const ordersRaw = await prisma.order.findMany({
    where,
    orderBy: { id: "desc" },
    include: { payments: true }
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = ordersRaw.sort((a, b) => {
    const aDate = new Date(a.orderDate);
    const bDate = new Date(b.orderDate);
    aDate.setHours(0, 0, 0, 0);
    bDate.setHours(0, 0, 0, 0);

    const aDistance = Math.abs(aDate.getTime() - today.getTime());
    const bDistance = Math.abs(bDate.getTime() - today.getTime());
    if (aDistance !== bDistance) return aDistance - bDistance;

    const aFuture = aDate.getTime() >= today.getTime();
    const bFuture = bDate.getTime() >= today.getTime();
    if (aFuture !== bFuture) return aFuture ? -1 : 1;

    return b.id - a.id;
  });
  const stats = {
    needsPayment: orders.filter((order) =>
      ["UNPAID", "PARTIAL", "OVERPAID"].includes(order.paymentStatus)
    ).length,
    outForRental: orders.filter(
      (order) => order.returnStatus === "COLLECTED_NOT_RETURNED"
    ).length,
    issues: orders.filter(
      (order) =>
        order.orderStatus === "ISSUE" ||
        order.returnStatus === "ISSUE" ||
        order.paymentStatus === "OVERPAID"
    ).length,
    completed: orders.filter(
      (order) =>
        order.orderStatus === "COMPLETED" ||
        (order.paymentStatus === "PAID" && order.returnStatus === "RETURNED")
    ).length
  };

  return (
    <main className="page">
      <PageHeader
        title={t("orders")}
        subtitle={t("orderSubtitle")}
        action={
          <Link href="/orders/new" className="btn-primary">
            {t("addOrder")}
          </Link>
        }
      />

      {params.deleteBlocked ? (
        <div className="card mb-6 border-orange-100 bg-orange-50">
          <p className="text-sm font-bold text-orange-800">{t("deleteBlocked")}</p>
        </div>
      ) : null}

      {params.deleted ? (
        <div className="card mb-6 border-green-100 bg-green-50">
          <p className="text-sm font-bold text-green-800">{t("orderDeleted")}</p>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickChip
          href="/orders?paymentStatus=PARTIAL"
          label={locale === "zh" ? "待处理收款" : "Needs Payment"}
          value={stats.needsPayment}
          tone="orange"
          subtitle={locale === "zh" ? "未付、部分付款或超付" : "Unpaid, partial, or overpaid"}
        />
        <QuickChip
          href="/orders?returnStatus=COLLECTED_NOT_RETURNED"
          label={locale === "zh" ? "租出未还" : "Out for Rental"}
          value={stats.outForRental}
          tone="blue"
          subtitle={locale === "zh" ? "已领取但还未归还" : "Collected but not returned"}
        />
        <QuickChip
          href="/orders?returnStatus=ISSUE"
          label={locale === "zh" ? "异常订单" : "Issues"}
          value={stats.issues}
          tone="red"
          subtitle={locale === "zh" ? "需要人工核对" : "Needs manual check"}
        />
        <QuickChip
          href="/orders?paymentStatus=PAID&returnStatus=RETURNED"
          label={locale === "zh" ? "已完成" : "Completed"}
          value={stats.completed}
          tone="green"
          subtitle={locale === "zh" ? "已付清且已归还" : "Paid and returned"}
        />
      </div>

      <OrderFilterPanel
        params={params}
        labels={{
          search: locale === "zh" ? "搜索 / 筛选订单" : "Search / Filter Orders",
          filters: locale === "zh" ? "筛选条件" : "Filters",
          period: t("period"),
          source: t("source"),
          payment: t("payment"),
          return: t("return"),
          degree: t("degree"),
          currency: t("currency"),
          start: t("start"),
          end: t("end"),
          all: t("all"),
          filter: t("filter"),
          reset: t("reset")
        }}
      />

      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderOperationCard key={order.id} order={order} locale={locale} t={t} />
        ))}
      </div>
    </main>
  );
}

type OrderWithPayments = Prisma.OrderGetPayload<{ include: { payments: true } }>;

function OrderOperationCard({
  order,
  locale,
  t
}: {
  order: OrderWithPayments;
  locale: "en" | "zh";
  t: (key: string) => string;
}) {
  const remaining = Number(order.remainingGBP);
  const isCancelled = order.orderStatus === "CANCELLED";
  const settleAction = settleRemaining.bind(null, order.id);

  return (
    <section className={`order-card ${orderCardClass(order)}`}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr_1.25fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#0a2540]">
              {order.customerName}
            </h2>
            <PaymentBadge value={order.paymentStatus} locale={locale} />
            <ReturnBadge value={order.returnStatus} locale={locale} />
          </div>
          <p className="mt-2 text-base font-semibold text-app-secondary">
            {formatDate(order.orderDate)} · {order.itemSummary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PeriodBadge value={order.businessPeriod} />
            <SourceBadge value={order.customerSource} />
            <Badge tone="neutral">
              {locale === "zh" ? "交接" : "Handover"} {displayPerson(order.handoverPerson)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2">
          <MoneyLine
            label={locale === "zh" ? "成交价" : "Final"}
            value={Number(order.finalPriceGBP)}
            strong
          />
          <MoneyLine
            label={locale === "zh" ? "已付合计" : "Paid Total"}
            value={Number(order.totalPaidGBP)}
            tone="green"
          />
          <MoneyLine
            label={locale === "zh" ? "剩余待付" : "Remaining"}
            value={remaining}
            tone={remaining > 0 ? "orange" : "muted"}
          />
        </div>

        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {t("quickActions")}
            </p>
            <div className="flex flex-wrap gap-2">
              {remaining > 0 && !isCancelled ? (
                <form action={settleAction}>
                  <input type="hidden" name="currencyLabel" value="GBP" />
                  <ConfirmSubmitButton
                    label={`${t("settleRemaining")} £${money(remaining)}`}
                    message={t("settleRemainingConfirm")}
                    className="quick-action-primary"
                  />
                </form>
              ) : (
                <span className="quick-action-muted">
                  {locale === "zh" ? "已无待付" : "No balance"}
                </span>
              )}
              <Link className="quick-action-link" href={`/orders/${order.id}/payment`}>
                {t("addPayment")}
              </Link>
              <Link className="quick-action-link" href={`/orders/${order.id}/edit`}>
                {t("edit")}
              </Link>
              <Link className="quick-action-link" href={`/orders/${order.id}`}>
                {t("view")}
              </Link>
              <form action={deleteOrder.bind(null, order.id)}>
                <input type="hidden" name="redirectTo" value="/orders" />
                <ConfirmSubmitButton
                  label={t("deleteOrder")}
                  message={t("deleteOrderConfirm")}
                  className="quick-action-danger"
                />
              </form>
            </div>
          </div>
          <QuickReturnButtons order={order} locale={locale} />
        </div>
      </div>
    </section>
  );
}

function QuickReturnButtons({
  order,
  locale
}: {
  order: OrderWithPayments;
  locale: "en" | "zh";
}) {
  const action = updateReturnStatus.bind(null, order.id);
  const statuses = [
    "NOT_COLLECTED",
    "COLLECTED_NOT_RETURNED",
    "RETURNED",
    "ISSUE"
  ];

  return (
    <form action={action}>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {locale === "zh" ? "归还状态" : "Return Status"}
      </p>
      <div className="status-segment">
        {statuses.map((status) => (
          <button
            key={status}
            type="submit"
            name="returnStatus"
            value={status}
            className={order.returnStatus === status ? "is-active" : ""}
          >
            {labelStatus(status, locale)}
          </button>
        ))}
      </div>
    </form>
  );
}

function MoneyLine({
  label,
  value,
  tone = "default",
  strong = false
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "orange" | "muted";
  strong?: boolean;
}) {
  const color =
    tone === "green"
      ? "text-app-green"
      : tone === "orange"
        ? "text-app-orange"
        : tone === "muted"
          ? "text-app-secondary"
          : "text-app-primary";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-3 py-2">
      <span className="text-xs font-semibold text-app-secondary">{label}</span>
      <span className={`text-sm ${strong ? "font-bold" : "font-semibold"} ${color}`}>
        £{money(value)}
      </span>
    </div>
  );
}

type OrderRow = {
  paymentStatus: string;
  returnStatus: string;
  orderStatus: string;
};

function orderCardClass(order: OrderRow) {
  if (order.orderStatus === "CANCELLED") return "order-card-gray";
  if (
    order.orderStatus === "ISSUE" ||
    order.returnStatus === "ISSUE" ||
    order.paymentStatus === "OVERPAID"
  ) {
    return "order-card-red";
  }
  if (
    order.paymentStatus === "UNPAID" ||
    order.paymentStatus === "PARTIAL" ||
    order.returnStatus === "COLLECTED_NOT_RETURNED"
  ) {
    return "order-card-orange";
  }
  if (order.paymentStatus === "PAID" && order.returnStatus === "RETURNED") {
    return "order-card-green";
  }
  return "order-card-blue";
}

function QuickChip({
  href,
  label,
  value,
  subtitle,
  tone
}: {
  href: string;
  label: string;
  value: number;
  subtitle: string;
  tone: "green" | "orange" | "red" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-app-green"
      : tone === "orange"
        ? "text-app-orange"
        : tone === "red"
          ? "text-app-red"
          : "text-app-blue";

  return (
    <Link href={href} className="quick-chip">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-app-secondary">{label}</p>
          <p className="mt-2 text-xs text-app-secondary">{subtitle}</p>
        </div>
        <p className={`text-3xl font-semibold ${color}`}>{value}</p>
      </div>
    </Link>
  );
}

function PaymentBadge({ value, locale }: { value: string; locale: "en" | "zh" }) {
  const tone =
    value === "PAID"
      ? "green"
      : value === "UNPAID" || value === "OVERPAID"
        ? "red"
        : "orange";
  return <Badge tone={tone}>{labelStatus(value, locale)}</Badge>;
}

function ReturnBadge({ value, locale }: { value: string; locale: "en" | "zh" }) {
  const tone =
    value === "RETURNED"
      ? "green"
      : value === "ISSUE"
        ? "red"
        : value === "COLLECTED_NOT_RETURNED"
          ? "orange"
          : "neutral";
  return <Badge tone={tone}>{labelStatus(value, locale)}</Badge>;
}

function PeriodBadge({ value }: { value: string }) {
  const tone =
    value === "XIONG_PERIOD" ? "blue" : value === "RYAN_SOLO" ? "green" : "neutral";
  return <Badge tone={tone}>{displayPeriod(value)}</Badge>;
}

function SourceBadge({ value }: { value: string }) {
  const tone = value === "Ryan" ? "blue" : value === "Xiong" ? "orange" : "neutral";
  return <Badge tone={tone}>{displayPerson(value)}</Badge>;
}
