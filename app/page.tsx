import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Sparkles
} from "lucide-react";
import { InteractiveSurface } from "@/components/interactive-surface";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { displayPeriod } from "@/lib/business";
import { currentWeekRange, formatDate, isoDate } from "@/lib/dates";
import { labelStatus, type Locale } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { inventorySummaryWithUsage } from "@/lib/inventory";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { generateSettlement } from "./actions";

type DashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
  const { locale, t } = await getI18n();
  const params = searchParams ? await searchParams : {};
  const selectedMonthKey = normalizeMonthParam(params.month);
  const selectedMonthRange = monthRange(selectedMonthKey);
  const previousMonthKey = shiftMonth(selectedMonthKey, -1);
  const nextMonthKey = shiftMonth(selectedMonthKey, 1);
  const previousMonthRange = monthRange(previousMonthKey);
  const currentMonthKey = normalizeMonthParam();
  const selectedMonthLabel = formatMonthLabel(selectedMonthRange.start, locale);
  const { start, end } = currentWeekRange();

  const [orders, payments, weekPayments, inventory, rentalOrders] =
    await Promise.all([
      prisma.order.findMany({ where: { orderStatus: { not: "CANCELLED" } } }),
      prisma.payment.findMany({
        where: { order: { orderStatus: { not: "CANCELLED" } } }
      }),
      prisma.payment.findMany({
        where: {
          settlementStatus: "UNSETTLED",
          partnerName: "Xiong",
          paymentDate: { gte: start, lte: end },
          order: { orderStatus: { not: "CANCELLED" } }
        }
      }),
      prisma.inventory.findMany({ orderBy: [{ itemType: "asc" }, { size: "asc" }] }),
      prisma.order.findMany()
    ]);

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.finalPriceGBP),
    0
  );
  const totalPaid = orders.reduce(
    (sum, order) => sum + Number(order.totalPaidGBP),
    0
  );
  const outstanding = orders.reduce(
    (sum, order) => sum + Math.max(Number(order.remainingGBP), 0),
    0
  );
  const ryanShare = payments.reduce(
    (sum, payment) => sum + Number(payment.ryanShareGBP),
    0
  );
  const partnerShare = payments.reduce(
    (sum, payment) => sum + Number(payment.partnerShareGBP),
    0
  );
  const weekTotal = weekPayments.reduce(
    (sum, payment) => sum + Number(payment.amountGBP),
    0
  );
  const weekRyan = weekPayments.reduce(
    (sum, payment) => sum + Number(payment.ryanShareGBP),
    0
  );
  const weekPartner = weekPayments.reduce(
    (sum, payment) => sum + Number(payment.partnerShareGBP),
    0
  );
  const activeRentals = orders.filter(
    (order) => order.returnStatus === "COLLECTED_NOT_RETURNED"
  ).length;

  const monthOrders = orders
    .filter((order) =>
      inDateRange(order.orderDate, selectedMonthRange.start, selectedMonthRange.end)
    )
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  const monthRecentOrders = monthOrders.slice(0, 8);
  const monthPayments = payments.filter((payment) =>
    inDateRange(payment.paymentDate, selectedMonthRange.start, selectedMonthRange.end)
  );
  const previousMonthPayments = payments.filter((payment) =>
    inDateRange(payment.paymentDate, previousMonthRange.start, previousMonthRange.end)
  );
  const monthRevenue = monthOrders.reduce(
    (sum, order) => sum + Number(order.finalPriceGBP),
    0
  );
  const monthPaid = monthPayments.reduce(
    (sum, payment) => sum + Number(payment.amountGBP),
    0
  );
  const previousMonthPaid = previousMonthPayments.reduce(
    (sum, payment) => sum + Number(payment.amountGBP),
    0
  );
  const monthOutstanding = monthOrders.reduce(
    (sum, order) => sum + Math.max(Number(order.remainingGBP), 0),
    0
  );
  const monthRyanShare = monthPayments.reduce(
    (sum, payment) => sum + Number(payment.ryanShareGBP),
    0
  );
  const monthPartnerShare = monthPayments.reduce(
    (sum, payment) => sum + Number(payment.partnerShareGBP),
    0
  );
  const monthPaidDelta = deltaPercent(monthPaid, previousMonthPaid);

  const stock = inventorySummaryWithUsage(inventory, rentalOrders);
  const availableInventory = stock.reduce(
    (sum, item) => sum + item.availableQty,
    0
  );
  const now = new Date();
  const shouldShowSettlementReminder =
    weekPayments.length > 0 && [5, 6, 0].includes(now.getDay());
  const settlementEmailSubject = encodeURIComponent(
    `Graduation Gown Rental Manager - ${formatDate(start)} to ${formatDate(end)} settlement reminder`
  );
  const settlementEmailBody = encodeURIComponent(
    [
      "Weekly settlement reminder",
      "",
      `Period: ${formatDate(start)} - ${formatDate(end)}`,
      `Unsettled payments: £${money(weekTotal)}`,
      `Ryan share: £${money(weekRyan)}`,
      `Fay share: £${money(weekPartner)}`,
      `Ryan should transfer to Fay: £${money(weekPartner)}`,
      "",
      "Open the settlement page to confirm and generate the weekly settlement."
    ].join("\n")
  );

  const revenueSeries = monthRevenueSeries(
    monthPayments,
    selectedMonthRange.start,
    selectedMonthRange.end,
    locale
  );
  const maxRevenuePoint = Math.max(...revenueSeries.map((item) => item.value), 1);
  const chartPoints = revenueSeries.map((item, index) => {
    const x =
      revenueSeries.length === 1
        ? 50
        : (index / (revenueSeries.length - 1)) * 100;
    const y = 88 - (item.value / maxRevenuePoint) * 72;
    return { ...item, x, y };
  });
  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const partnerPercent = percent(
    monthPartnerShare,
    monthRyanShare + monthPartnerShare
  );
  const orderStatusStats = [
    {
      label: locale === "zh" ? "已付清" : "Paid",
      value: monthOrders.filter((order) => order.paymentStatus === "PAID").length,
      tone: "green"
    },
    {
      label: locale === "zh" ? "待收款" : "Outstanding",
      value: monthOrders.filter((order) => ["UNPAID", "PARTIAL"].includes(order.paymentStatus)).length,
      tone: "orange"
    },
    {
      label: locale === "zh" ? "已归还" : "Returned",
      value: monthOrders.filter((order) => order.returnStatus === "RETURNED").length,
      tone: "blue"
    },
    {
      label: locale === "zh" ? "异常" : "Issues",
      value: monthOrders.filter(
        (order) =>
          order.returnStatus === "ISSUE" ||
          order.orderStatus === "ISSUE" ||
          order.paymentStatus === "OVERPAID"
      ).length,
      tone: "red"
    }
  ];

  return (
    <main className="page">
      <PageHeader
        title="Graduation Gown Rental Manager"
        subtitle={t("appSubtitle")}
        action={
          <Link className="btn-primary" href="/orders/new">
            {t("newOrder")}
          </Link>
        }
      />

      <InteractiveSurface className="smart-view-card">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="smart-view-icon">
              <CalendarDays size={19} />
            </span>
            <p className="kicker text-[#635bff]">
              {locale === "zh" ? "智能月度视图" : "Smart monthly view"}
            </p>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#0a2540] sm:text-4xl">
            {selectedMonthLabel}
          </h2>
          <p className="mt-2 max-w-2xl text-base font-semibold text-app-secondary">
            {locale === "zh"
              ? "图表和本月指标按收款日期统计；订单健康度按订单日期统计。本周结算仍只看本周实际收到的未结算 Payment。"
              : "Charts and monthly figures use payment dates; order health uses order dates. Weekly settlement still uses this week's unsettled payments."}
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-3 sm:items-end">
          <form className="month-picker" action="/">
            <input
              className="month-input"
              type="month"
              name="month"
              defaultValue={selectedMonthKey}
              aria-label={locale === "zh" ? "选择月份" : "Select month"}
            />
            <button className="btn-primary" type="submit">
              {locale === "zh" ? "更新视图" : "Update View"}
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Link className="month-nav-link" href={`/?month=${previousMonthKey}`}>
              <ChevronLeft size={16} />
              {locale === "zh" ? "上月" : "Prev"}
            </Link>
            <Link className="month-nav-link" href={`/?month=${currentMonthKey}`}>
              {locale === "zh" ? "本月" : "Current"}
            </Link>
            <Link className="month-nav-link" href={`/?month=${nextMonthKey}`}>
              {locale === "zh" ? "下月" : "Next"}
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </InteractiveSurface>

      <InteractiveSurface className="dashboard-hero">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="dashboard-orbit">
              <Sparkles size={18} />
            </span>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
              {locale === "zh" ? "月度经营视图" : "Monthly operating view"}
            </p>
          </div>
          <h2 className="mt-5 max-w-3xl text-5xl font-bold tracking-[-0.05em] text-white sm:text-6xl">
            {locale === "zh"
              ? `${selectedMonthLabel} 的收入、收款和分账，一屏看清。`
              : `${selectedMonthLabel} revenue, payments, and settlement in one view.`}
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              icon={<CircleDollarSign size={20} />}
              label={locale === "zh" ? "本月实际收款" : "Monthly paid"}
              value={`£${money(monthPaid)}`}
              sub={formatDelta(monthPaidDelta, locale)}
            />
            <HeroMetric
              icon={<Clock3 size={20} />}
              label={locale === "zh" ? "本月待收款" : "Monthly outstanding"}
              value={`£${money(monthOutstanding)}`}
              sub={`${percent(monthPaid, monthRevenue)}% ${locale === "zh" ? "本月成交已回款" : "collected"}`}
            />
            <HeroMetric
              icon={<Boxes size={20} />}
              label={locale === "zh" ? "本月订单" : "Monthly orders"}
              value={String(monthOrders.length)}
              sub={`${locale === "zh" ? "当前可用库存单位" : "available stock units"} ${availableInventory}`}
            />
          </div>
        </div>

        <div className="dashboard-visual-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                {locale === "zh" ? "本月收款趋势" : "Monthly payment trend"}
              </p>
              <p className="mt-2 text-3xl font-bold text-white">£{money(monthPaid)}</p>
            </div>
            <Link href="/orders" className="dashboard-icon-link">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <RevenueLineChart points={chartPoints} path={chartPath} />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {revenueSeries.slice(-3).map((item) => (
              <div key={item.key} className="rounded-2xl bg-white/[0.07] px-3 py-3">
                <p className="text-xs font-bold text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-black text-white">£{money(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </InteractiveSurface>

      {shouldShowSettlementReminder ? (
        <section className="reminder-card mb-6">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#635bff]">
              {locale === "zh" ? "周末结算提醒" : "Weekend settlement reminder"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0a2540]">
              {locale === "zh"
                ? `本周还有 £${money(weekTotal)} 待结算收款`
                : `£${money(weekTotal)} remains unsettled this week`}
            </h2>
            <p className="mt-2 text-base font-semibold text-app-secondary">
              {locale === "zh"
                ? `Ryan 当前需要转给 Fay £${money(weekPartner)}。`
                : `Ryan should transfer £${money(weekPartner)} to Fay.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settlements" className="btn-primary">
              {t("settlement")}
            </Link>
            <a
              className="btn-secondary"
              href={`mailto:?subject=${settlementEmailSubject}&body=${settlementEmailBody}`}
            >
              {locale === "zh" ? "打开邮件草稿" : "Open Email Draft"}
            </a>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalRevenue")} value={`£${money(totalRevenue)}`} />
        <StatCard label={t("totalPaid")} value={`£${money(totalPaid)}`} tone="green" />
        <StatCard label={t("outstanding")} value={`£${money(outstanding)}`} tone="orange" />
        <StatCard label={t("ryanShare")} value={`£${money(ryanShare)}`} tone="blue" />
        <StatCard label={t("partnerShare")} value={`£${money(partnerShare)}`} />
        <StatCard label={t("weekTransfer")} value={`£${money(weekPartner)}`} tone="orange" />
        <StatCard label={t("activeRentals")} value={String(activeRentals)} />
        <StatCard label={t("availableInventory")} value={String(availableInventory)} tone="green" />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="visual-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker">{locale === "zh" ? "资金结构" : "Money split"}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0a2540]">
                {locale === "zh" ? "本月 Ryan / Fay 分账" : "Monthly Ryan / Fay Share"}
              </h2>
            </div>
            <div
              className="donut"
              style={{
                background: `conic-gradient(#635bff 0 ${100 - partnerPercent}%, #00d4a6 ${100 - partnerPercent}% 100%)`
              }}
            >
              <div>
                <span>{partnerPercent}%</span>
                <small>Fay</small>
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-3">
            <SplitRow label="Ryan" value={monthRyanShare} percent={100 - partnerPercent} color="#635bff" />
            <SplitRow label="Fay" value={monthPartnerShare} percent={partnerPercent} color="#00d4a6" />
          </div>
        </Card>

        <Card className="visual-card">
          <p className="kicker">{locale === "zh" ? "订单状态" : "Order state"}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0a2540]">
            {locale === "zh" ? "本月订单健康度" : "Monthly Order Health"}
          </h2>
          <div className="mt-8 grid gap-4">
            {orderStatusStats.map((item) => (
              <StatusBar key={item.label} label={item.label} value={item.value} max={monthOrders.length || 1} tone={item.tone} />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-app-orange" />
          <h2 className="text-2xl font-semibold">{t("weekPreview")}</h2>
          <p className="mt-1 text-sm text-app-secondary">
            {formatDate(start)} - {formatDate(end)}
          </p>
          <div className="mt-6 rounded-[24px] bg-gray-950 p-5 text-white shadow-[0_22px_50px_rgba(17,24,39,0.18)]">
            <p className="text-sm font-semibold text-white/60">{t("ryanShouldTransfer")}</p>
            <p className="mt-2 text-5xl font-semibold tracking-normal">£{money(weekPartner)}</p>
          </div>
          <div className="mt-6 grid gap-4">
            <Preview label={t("totalPayments")} value={weekTotal} />
            <Preview label={t("ryanShare")} value={weekRyan} />
            <Preview label={t("xiongShare")} value={weekPartner} />
          </div>
          <form action={generateSettlement} className="mt-6">
            <input type="hidden" name="weekStartDate" value={isoDate(start)} />
            <input type="hidden" name="weekEndDate" value={isoDate(end)} />
            <input type="hidden" name="partnerName" value="Xiong" />
            <button className="btn-primary" type="submit">
              {t("generateWeeklySettlement")}
            </button>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {locale === "zh" ? "本月订单" : "Monthly Orders"}
            </h2>
            <Link href="/orders" className="text-sm font-semibold text-app-blue">
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid gap-3">
            {monthRecentOrders.length ? (
              monthRecentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="rounded-[22px] border border-app-border/80 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-app-blue hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="mt-1 text-sm text-app-secondary">
                        {formatDate(order.orderDate)} · {displayPeriod(order.businessPeriod)}
                      </p>
                    </div>
                    <Badge tone={order.paymentStatus === "PAID" ? "green" : "orange"}>
                      {labelStatus(order.paymentStatus, locale)}
                    </Badge>
                  </div>
                  <p className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-sm text-app-secondary">{order.itemSummary}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-base font-semibold text-app-secondary">
                {locale === "zh" ? "这个月还没有订单。" : "No orders in this month."}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">{locale === "zh" ? "库存可视化" : "Inventory visual"}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#0a2540]">
              {t("inventorySnapshot")}
            </h2>
          </div>
          <Link href="/inventory" className="btn-secondary">{t("viewAll")}</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stock.map((item) => (
            <div key={item.id} className="inventory-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.category}</p>
                <p className="text-sm font-black text-[#635bff]">
                  {percent(item.availableQty, item.totalQty)}%
                </p>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-[-0.04em]">{item.availableQty}</p>
              {item.notes ? (
                <p className="mt-1 truncate text-xs text-app-secondary">{item.notes}</p>
              ) : null}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#635bff,#80e9ff)]"
                  style={{ width: `${percent(item.availableQty, item.totalQty)}%` }}
                />
              </div>
              <p className="text-sm text-app-secondary">
                {t("rented")} {item.rentedQty} / {t("total")} {item.totalQty}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  sub
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="hero-metric">
      <div className="text-cyan-200">{icon}</div>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{sub}</p>
    </div>
  );
}

function RevenueLineChart({
  points,
  path
}: {
  points: Array<{ key: string; label: string; value: number; x: number; y: number }>;
  path: string;
}) {
  return (
    <svg className="mt-6 h-56 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#80e9ff" />
          <stop offset="55%" stopColor="#635bff" />
          <stop offset="100%" stopColor="#00d4a6" />
        </linearGradient>
        <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#80e9ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#80e9ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 96 L 0 96 Z`} fill="url(#revenueFill)" />
      <path className="revenue-line" d={path} fill="none" stroke="url(#revenueLine)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {points.map((point) => (
        <circle className="revenue-point" key={point.key} cx={point.x} cy={point.y} r="1.8" fill="#fff" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function SplitRow({
  label,
  value,
  percent,
  color
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-[#0a2540]">{label}</span>
        <span className="font-black">£{money(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

function StatusBar({
  label,
  value,
  max,
  tone
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const palette: Record<string, string> = {
    green: "#34c759",
    orange: "#ff9500",
    blue: "#007aff",
    red: "#ff3b30"
  };
  const barPercent = percent(value, max);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-[#0a2540]">{label}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black">{value}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${barPercent}%`, background: palette[tone] ?? "#635bff" }}
        />
      </div>
    </div>
  );
}

function Preview({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
      <span className="text-app-secondary">{label}</span>
      <span className={`font-semibold ${highlight ? "text-app-orange" : ""}`}>
        £{money(value)}
      </span>
    </div>
  );
}

function percent(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function normalizeMonthParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return raw;
    }
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999)
  };
}

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function inDateRange(value: Date, start: Date, end: Date) {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function formatMonthLabel(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function formatDelta(delta: number, locale: Locale) {
  if (delta === 0) {
    return locale === "zh" ? "较上月持平" : "flat vs last month";
  }

  const direction = delta > 0
    ? locale === "zh" ? "高于上月" : "up vs last month"
    : locale === "zh" ? "低于上月" : "down vs last month";

  return `${Math.abs(delta)}% ${direction}`;
}

function deltaPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthRevenueSeries(
  payments: Array<{ paymentDate: Date; amountGBP: number }>,
  start: Date,
  end: Date,
  locale: Locale
) {
  const buckets = new Map<number, number>();
  const dayCount = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
  );
  const bucketCount = Math.ceil(dayCount / 7);

  for (let index = 0; index < bucketCount; index += 1) {
    buckets.set(index, 0);
  }

  for (const payment of payments) {
    const date = new Date(payment.paymentDate);
    const offset = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
    const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(offset / 7)));
    buckets.set(bucketIndex, (buckets.get(bucketIndex) ?? 0) + Number(payment.amountGBP));
  }

  return Array.from(buckets.entries()).map(([index, value]) => {
    const rangeStart = index * 7 + 1;
    const rangeEnd = Math.min((index + 1) * 7, dayCount);
    return {
      key: `week-${index + 1}`,
      label: locale === "zh" ? `${rangeStart}-${rangeEnd}日` : `${rangeStart}-${rangeEnd}`,
      value
    };
  });
}
