"use client";

import { Inventory, Order } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { saveOrder } from "@/app/actions";
import { getT, Locale } from "@/lib/i18n";

function dateInput(date?: Date | string) {
  return dateKey(date ? new Date(date) : new Date());
}

type ExistingOrder = Pick<
  Order,
  | "id"
  | "orderDate"
  | "masterMQty"
  | "masterLQty"
  | "bachelorMQty"
  | "bachelorLQty"
  | "bearQty"
  | "flagQty"
  | "orderStatus"
  | "returnStatus"
>;

type QtyName =
  | "masterMQty"
  | "masterLQty"
  | "bachelorMQty"
  | "bachelorLQty"
  | "bearQty"
  | "flagQty";

type QtyState = Record<QtyName, number>;

const gownPriceGBP = 25;
const accessoryPriceGBP = 5;

export function OrderForm({
  order,
  locale = "en",
  inventory = [],
  existingOrders = []
}: {
  order?: Order;
  locale?: Locale;
  inventory?: Inventory[];
  existingOrders?: ExistingOrder[];
}) {
  const t = getT(locale);
  const [standard, setStandard] = useState(String(order?.standardPriceGBP ?? 0));
  const [adjustment, setAdjustment] = useState(
    String(order?.adjustmentGBP ?? 0)
  );
  const [orderDate, setOrderDate] = useState(dateInput(order?.orderDate));
  const [qty, setQty] = useState<QtyState>({
    masterMQty: order?.masterMQty ?? 0,
    masterLQty: order?.masterLQty ?? 0,
    bachelorMQty: order?.bachelorMQty ?? 0,
    bachelorLQty: order?.bachelorLQty ?? 0,
    bearQty: order?.bearQty ?? 0,
    flagQty: order?.flagQty ?? 0
  });
  const autoPrice = useMemo(() => calculateAutoPrice(qty), [qty]);

  useEffect(() => {
    if (!order) setStandard(autoPrice.toFixed(2));
  }, [autoPrice, order]);

  const finalPrice = useMemo(() => {
    const total = Number(standard || 0) + Number(adjustment || 0);
    return Number.isFinite(total) ? total.toFixed(2) : "0.00";
  }, [standard, adjustment]);
  const dailyAvailability = useMemo(
    () => availabilityForDate(inventory, existingOrders, orderDate, order?.id, qty),
    [inventory, existingOrders, orderDate, order?.id, qty]
  );
  const updateQty = (name: QtyName, value: number) => {
    setQty((current) => ({ ...current, [name]: Math.max(0, value || 0) }));
  };

  return (
    <form action={saveOrder} className="grid gap-5">
      {order ? <input type="hidden" name="id" value={order.id} /> : null}
      <p className="rounded-[20px] bg-[#f6f9fc] px-5 py-4 text-sm font-semibold text-app-secondary">
        {t("stockCheckHint")}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("orderDate")}>
          <input
            className="input"
            type="date"
            name="orderDate"
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
            required
          />
        </Field>
        <Field label={t("customerName")}>
          <input
            className="input"
            name="customerName"
            defaultValue={order?.customerName}
            required
          />
        </Field>
        <Field label={t("businessPeriod")}>
          <select
            className="select"
            name="businessPeriod"
            defaultValue={order?.businessPeriod ?? "XIONG_PERIOD"}
          >
            <option value="XIONG_PERIOD">Fay 合作期</option>
            <option value="RYAN_SOLO">Ryan 自营期</option>
            <option value="GAO_PERIOD">Gao 合作期</option>
          </select>
        </Field>
        <Field label={t("customerSource")}>
          <select
            className="select"
            name="customerSource"
            defaultValue={order?.customerSource ?? "Ryan"}
          >
            <option value="Ryan">Ryan</option>
            <option value="Xiong">Fay</option>
            <option value="Gao">Gao</option>
          </select>
        </Field>
        <Field label={t("handoverPerson")}>
          <select
            className="select"
            name="handoverPerson"
            defaultValue={order?.handoverPerson ?? "Ryan"}
          >
            <option value="Ryan">Ryan</option>
            <option value="Xiong">Fay</option>
            <option value="Gao">Gao</option>
          </select>
        </Field>
        <Field label={t("degreeType")}>
          <select
            className="select"
            name="degreeType"
            defaultValue={order?.degreeType ?? "Master"}
          >
            <option value="Master">Master</option>
            <option value="Bachelor">Bachelor</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-6">
        <Qty label="Master M" name="masterMQty" value={qty.masterMQty} onChange={updateQty} />
        <Qty label="Master L" name="masterLQty" value={qty.masterLQty} onChange={updateQty} />
        <Qty label="Bachelor M" name="bachelorMQty" value={qty.bachelorMQty} onChange={updateQty} />
        <Qty label="Bachelor L" name="bachelorLQty" value={qty.bachelorLQty} onChange={updateQty} />
        <Qty label="Bear" name="bearQty" value={qty.bearQty} onChange={updateQty} />
        <Qty label="Flag" name="flagQty" value={qty.flagQty} onChange={updateQty} />
      </div>

      {dailyAvailability.length ? (
        <section className="rounded-[24px] border border-app-border bg-[#f6f9fc] p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {locale === "zh" ? "当天可用库存" : "Available on selected date"}
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#0a2540]">
                {orderDate}
              </h3>
            </div>
            <p className="text-sm font-semibold text-app-secondary">
              {locale === "zh" ? "按已预约未归还订单实时估算" : "Calculated from active bookings"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dailyAvailability.map((item) => (
              <div key={item.key} className="rounded-[18px] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(50,50,93,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[#0a2540]">{item.label}</p>
                  <span className={item.available <= 0 ? "text-app-red" : item.available <= 1 ? "text-app-orange" : "text-app-green"}>
                    {item.available}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#635bff,#80e9ff)]"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-app-secondary">
                  {locale === "zh" ? "已占用" : "Booked"} {item.used} / {locale === "zh" ? "总数" : "Total"} {item.total}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Field label={order ? t("standardPrice") : t("totalPrice")}>
          <input
            className="input"
            type="number"
            step="0.01"
            name="standardPriceGBP"
            value={standard}
            onChange={(event) => setStandard(event.target.value)}
            required
            readOnly={!order}
          />
        </Field>
        {order ? (
          <>
            <Field label={t("adjustment")}>
              <input
                className="input"
                type="number"
                step="0.01"
                name="adjustmentGBP"
                value={adjustment}
                onChange={(event) => setAdjustment(event.target.value)}
              />
            </Field>
            <Field label={t("finalPrice")}>
              <input className="input bg-gray-50" value={finalPrice} readOnly />
            </Field>
          </>
        ) : (
          <input type="hidden" name="adjustmentGBP" value="0" />
        )}
      </div>

      {!order ? (
        <div className="rounded-[24px] border border-app-border bg-gray-50 p-5">
          <div className="grid gap-5 md:grid-cols-4">
            <Field label={t("initialPaymentDate")}>
              <input
                className="input"
                type="date"
                name="initialPaymentDate"
                defaultValue={dateInput()}
              />
            </Field>
            <Field label={t("initialPaid")}>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                name="initialPaidGBP"
                defaultValue="0"
              />
            </Field>
            <Field label={t("initialPaymentCurrency")}>
              <select className="select" name="initialCurrencyLabel" defaultValue="GBP">
                <option value="GBP">GBP</option>
                <option value="RMB">RMB</option>
              </select>
            </Field>
            <label className="flex min-h-12 items-center gap-3 pt-7">
              <input
                className="h-5 w-5 accent-app-blue"
                type="checkbox"
                name="paidInFull"
                value="1"
              />
              <span className="text-sm font-semibold text-app-primary">
                {t("paidInFull")}
              </span>
            </label>
          </div>
          <p className="mt-3 text-sm text-app-secondary">{t("paidInFullHint")}</p>
          <div className="mt-5">
            <Field label={t("initialPaymentNote")}>
              <input
                className="input"
                name="initialPaymentNote"
                placeholder={t("actualPaymentPlaceholder")}
              />
            </Field>
          </div>
        </div>
      ) : null}

      <Field label={t("notes")}>
        <textarea className="textarea" name="notes" defaultValue={order?.notes ?? ""} />
      </Field>

      <div className="flex justify-end gap-3">
        <button className="btn-primary" type="submit">
          {t("saveOrder")}
        </button>
      </div>
    </form>
  );
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addUsage(usage: Map<string, number>, key: string, qty: number) {
  usage.set(key, (usage.get(key) ?? 0) + qty);
}

function calculateAutoPrice(qty: QtyState) {
  const gownCount =
    qty.masterMQty + qty.masterLQty + qty.bachelorMQty + qty.bachelorLQty;
  const accessoryCount = qty.bearQty + qty.flagQty;
  return gownCount * gownPriceGBP + accessoryCount * accessoryPriceGBP;
}

function selectedUsage(qty: QtyState) {
  const usage = new Map<string, number>();
  addUsage(usage, "MASTER_GOWN:M", qty.masterMQty);
  addUsage(usage, "MASTER_GOWN:L", qty.masterLQty);
  addUsage(usage, "BACHELOR_GOWN:M", qty.bachelorMQty);
  addUsage(usage, "BACHELOR_GOWN:L", qty.bachelorLQty);
  addUsage(usage, "BEAR:NONE", qty.bearQty);
  addUsage(usage, "FLAG:NONE", qty.flagQty);

  const gownCount =
    qty.masterMQty + qty.masterLQty + qty.bachelorMQty + qty.bachelorLQty;
  addUsage(usage, "HAT:ONE_SIZE", gownCount);
  addUsage(usage, "SASH:ONE_SIZE", gownCount);
  return usage;
}

function availabilityForDate(
  inventory: Inventory[],
  orders: ExistingOrder[],
  selectedDate: string,
  excludeOrderId?: number,
  currentQty?: QtyState
) {
  const totals = new Map<string, number>();
  for (const item of inventory) {
    totals.set(`${item.itemType}:${item.size}`, Number(item.totalQty));
  }

  const usage = new Map<string, number>();
  for (const activeOrder of orders) {
    if (activeOrder.id === excludeOrderId) continue;
    if (activeOrder.orderStatus === "CANCELLED" || activeOrder.returnStatus === "RETURNED") continue;
    if (dateInput(activeOrder.orderDate) !== selectedDate) continue;

    addUsage(usage, "MASTER_GOWN:M", activeOrder.masterMQty);
    addUsage(usage, "MASTER_GOWN:L", activeOrder.masterLQty);
    addUsage(usage, "BACHELOR_GOWN:M", activeOrder.bachelorMQty);
    addUsage(usage, "BACHELOR_GOWN:L", activeOrder.bachelorLQty);
    addUsage(usage, "BEAR:NONE", activeOrder.bearQty);
    addUsage(usage, "FLAG:NONE", activeOrder.flagQty);
    const gownCount =
      activeOrder.masterMQty +
      activeOrder.masterLQty +
      activeOrder.bachelorMQty +
      activeOrder.bachelorLQty;
    addUsage(usage, "HAT:ONE_SIZE", gownCount);
    addUsage(usage, "SASH:ONE_SIZE", gownCount);
  }

  const items = [
    ["MASTER_GOWN:M", "硕士 M"],
    ["MASTER_GOWN:L", "硕士 L"],
    ["BACHELOR_GOWN:M", "本科 M"],
    ["BACHELOR_GOWN:L", "本科 L"],
    ["HAT:ONE_SIZE", "学士帽"],
    ["SASH:ONE_SIZE", "袖带"],
    ["BEAR:NONE", "小熊"],
    ["FLAG:NONE", "小旗"]
  ];
  const currentUsage = currentQty ? selectedUsage(currentQty) : new Map<string, number>();

  return items.map(([key, label]) => {
    const total = totals.get(key) ?? 0;
    const used = usage.get(key) ?? 0;
    const selected = currentUsage.get(key) ?? 0;
    const available = Math.max(total - used - selected, 0);
    return {
      key,
      label,
      total,
      used,
      selected,
      available,
      percent: total > 0 ? Math.round((available / total) * 100) : 0
    };
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Qty({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: QtyName;
  value: number;
  onChange: (name: QtyName, value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="input"
        type="number"
        min="0"
        name={name}
        value={value}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
    </Field>
  );
}
