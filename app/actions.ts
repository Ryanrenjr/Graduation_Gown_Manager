"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildItemSummary,
  calculateShares,
  partnerForPeriod,
  paymentStatusFor
} from "@/lib/business";
import { parseMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type {
  BusinessPeriod,
  CurrencyLabel,
  DegreeType,
  PaymentType,
  Person,
  ReturnStatus
} from "@/lib/types";

export async function toggleLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en") === "zh" ? "zh" : "en";
  const store = await cookies();
  store.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  revalidatePath("/", "layout");
}

export async function updateInventoryItem(inventoryId: number, formData: FormData) {
  const totalQty = intValue(formData, "totalQty");
  if (totalQty < 0) throw new Error("Inventory total cannot be negative");

  await prisma.inventory.update({
    where: { id: inventoryId },
    data: {
      itemNameZh: text(formData, "itemNameZh") || null,
      sizeLabel: text(formData, "sizeLabel") || null,
      totalQty,
      availableQty: totalQty,
      notes: text(formData, "notes") || null
    }
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/orders/new");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function intValue(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return new Date(`${value}T00:00:00`);
}

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function stockRequirements(input: {
  masterMQty: number;
  masterLQty: number;
  bachelorMQty: number;
  bachelorLQty: number;
  bearQty: number;
  flagQty: number;
}) {
  const gownCount =
    input.masterMQty +
    input.masterLQty +
    input.bachelorMQty +
    input.bachelorLQty;

  return [
    {
      itemType: "MASTER_GOWN",
      size: "M",
      label: "硕士袍 M",
      qty: input.masterMQty
    },
    {
      itemType: "MASTER_GOWN",
      size: "L",
      label: "硕士袍 L",
      qty: input.masterLQty
    },
    {
      itemType: "BACHELOR_GOWN",
      size: "M",
      label: "本科袍 M",
      qty: input.bachelorMQty
    },
    {
      itemType: "BACHELOR_GOWN",
      size: "L",
      label: "本科袍 L",
      qty: input.bachelorLQty
    },
    { itemType: "HAT", size: "ONE_SIZE", label: "学士帽", qty: gownCount },
    { itemType: "SASH", size: "ONE_SIZE", label: "袖带", qty: gownCount },
    { itemType: "BEAR", size: "NONE", label: "毕业小熊", qty: input.bearQty },
    { itemType: "FLAG", size: "NONE", label: "毕业小旗子", qty: input.flagQty }
  ].filter((item) => item.qty > 0);
}

function addStockUsage(
  usage: Map<string, number>,
  input: {
    masterMQty: number;
    masterLQty: number;
    bachelorMQty: number;
    bachelorLQty: number;
    bearQty: number;
    flagQty: number;
  }
) {
  for (const item of stockRequirements(input)) {
    const key = `${item.itemType}:${item.size}`;
    usage.set(key, (usage.get(key) ?? 0) + item.qty);
  }
}

async function checkStockAvailableForOrder(input: {
  orderDate: Date;
  excludeOrderId?: number;
  masterMQty: number;
  masterLQty: number;
  bachelorMQty: number;
  bachelorLQty: number;
  bearQty: number;
  flagQty: number;
}) {
  const requirements = stockRequirements(input);
  if (!requirements.length) return null;

  const { start, end } = dayRange(input.orderDate);
  const [inventory, sameDayOrders] = await Promise.all([
    prisma.inventory.findMany(),
    prisma.order.findMany({
      where: {
        id: input.excludeOrderId ? { not: input.excludeOrderId } : undefined,
        orderStatus: { not: "CANCELLED" },
        returnStatus: { not: "RETURNED" },
        orderDate: { gte: start, lte: end }
      }
    })
  ]);

  const total = new Map<string, number>();
  for (const item of inventory) {
    total.set(`${item.itemType}:${item.size}`, item.totalQty);
  }

  const used = new Map<string, number>();
  for (const order of sameDayOrders) {
    addStockUsage(used, order);
  }

  const errors = requirements.flatMap((item) => {
    const key = `${item.itemType}:${item.size}`;
    const totalQty = total.get(key) ?? 0;
    const usedQty = used.get(key) ?? 0;
    const availableQty = totalQty - usedQty;

    if (item.qty <= availableQty) return [];

    return [
      `${item.label} 库存不足：需要 ${item.qty}，当天已占用 ${usedQty}，总库存 ${totalQty}，可用 ${Math.max(availableQty, 0)}`
    ];
  });

  return errors.length ? errors.join("；") : null;
}

async function refreshOrderPaymentState(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true }
  });
  if (!order) return;

  const totalPaidGBP =
    Math.round(
      order.payments.reduce((sum, payment) => sum + Number(payment.amountGBP), 0) *
        100
    ) / 100;
  const finalPriceGBP = Number(order.finalPriceGBP);
  const remainingGBP = Math.round((finalPriceGBP - totalPaidGBP) * 100) / 100;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      totalPaidGBP,
      remainingGBP,
      paymentStatus: paymentStatusFor(totalPaidGBP, finalPriceGBP)
    }
  });
}

export async function saveOrder(formData: FormData) {
  const id = text(formData, "id");
  const businessPeriod = text(formData, "businessPeriod") as BusinessPeriod;
  const degreeType = text(formData, "degreeType") as DegreeType;
  const masterMQty = intValue(formData, "masterMQty");
  const masterLQty = intValue(formData, "masterLQty");
  const bachelorMQty = intValue(formData, "bachelorMQty");
  const bachelorLQty = intValue(formData, "bachelorLQty");
  const bearQty = intValue(formData, "bearQty");
  const flagQty = intValue(formData, "flagQty");
  const standardPriceGBP = parseMoney(formData.get("standardPriceGBP"));
  const adjustmentGBP = parseMoney(formData.get("adjustmentGBP"));
  const finalPriceGBP =
    Math.round((standardPriceGBP + adjustmentGBP) * 100) / 100;
  const orderDate = dateValue(formData, "orderDate");
  const paidInFull = text(formData, "paidInFull") === "1";
  const initialPaidGBP = parseMoney(formData.get("initialPaidGBP"));
  const initialPaymentAmountGBP = paidInFull
    ? finalPriceGBP
    : Math.round(initialPaidGBP * 100) / 100;

  if (!text(formData, "customerName")) {
    throw new Error("Customer name is required");
  }

  const data = {
    orderDate,
    customerName: text(formData, "customerName"),
    businessPeriod,
    partnerName: partnerForPeriod(businessPeriod),
    customerSource: text(formData, "customerSource") as Person,
    handoverPerson: text(formData, "handoverPerson") as Person,
    degreeType,
    masterMQty,
    masterLQty,
    bachelorMQty,
    bachelorLQty,
    bearQty,
    flagQty,
    itemSummary: buildItemSummary({
      degreeType,
      masterMQty,
      masterLQty,
      bachelorMQty,
      bachelorLQty,
      bearQty,
      flagQty
    }),
    standardPriceGBP,
    adjustmentGBP,
    finalPriceGBP,
    remainingGBP: finalPriceGBP,
    notes: text(formData, "notes") || null
  };

  const stockError = await checkStockAvailableForOrder({
    orderDate,
    excludeOrderId: id ? Number(id) : undefined,
    masterMQty,
    masterLQty,
    bachelorMQty,
    bachelorLQty,
    bearQty,
    flagQty
  });
  if (stockError) {
    const target = id ? `/orders/${id}/edit` : "/orders/new";
    redirect(`${target}?stockError=${encodeURIComponent(stockError)}`);
  }

  let orderId: number;
  if (id) {
    const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new Error("Order not found");
    const currentPaid = Number(existing.totalPaidGBP);
    const remainingGBP = Math.round((finalPriceGBP - currentPaid) * 100) / 100;
    const updated = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        ...data,
        totalPaidGBP: currentPaid,
        remainingGBP,
        paymentStatus: paymentStatusFor(currentPaid, finalPriceGBP)
      }
    });
    orderId = updated.id;
  } else {
    const totalPaidGBP = Math.max(initialPaymentAmountGBP, 0);
    const remainingGBP = Math.round((finalPriceGBP - totalPaidGBP) * 100) / 100;
    const order = await prisma.order.create({
      data: {
        ...data,
        totalPaidGBP,
        remainingGBP,
        paymentStatus: paymentStatusFor(totalPaidGBP, finalPriceGBP)
      }
    });
    orderId = order.id;

    if (totalPaidGBP > 0) {
      const shares = calculateShares(totalPaidGBP, businessPeriod, data.customerSource);
      const currencyLabel = (text(formData, "initialCurrencyLabel") ||
        "GBP") as CurrencyLabel;
      const initialPaymentDate = text(formData, "initialPaymentDate")
        ? dateValue(formData, "initialPaymentDate")
        : new Date();
      const actualPaymentNote =
        text(formData, "initialPaymentNote") ||
        (currencyLabel === "RMB" ? "人民币支付" : null);

      await prisma.payment.create({
        data: {
          orderId,
          paymentDate: initialPaymentDate,
          amountGBP: totalPaidGBP,
          currencyLabel,
          actualPaymentNote,
          paymentType:
            paidInFull || totalPaidGBP >= finalPriceGBP
              ? "FULL_PAYMENT"
              : "DEPOSIT",
          receiver: "Ryan",
          customerSource: data.customerSource,
          partnerName: data.partnerName,
          businessPeriod,
          ryanShareGBP: shares.ryanShareGBP,
          partnerShareGBP: shares.partnerShareGBP,
          notes: paidInFull ? "新增订单时勾选已结清自动创建。" : "新增订单时录入已付金额自动创建。"
        }
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/settlements");
  redirect(`/orders/${orderId}`);
}

export async function addPayment(orderId: number, formData: FormData) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  const amountGBP = parseMoney(formData.get("amountGBP"));
  if (amountGBP === 0) throw new Error("Payment amount cannot be zero");
  const shares = calculateShares(
    amountGBP,
    order.businessPeriod,
    order.customerSource
  );

  await prisma.payment.create({
    data: {
      orderId,
      paymentDate: dateValue(formData, "paymentDate"),
      amountGBP,
      currencyLabel: text(formData, "currencyLabel") as CurrencyLabel,
      actualPaymentNote: text(formData, "actualPaymentNote") || null,
      paymentType: text(formData, "paymentType") as PaymentType,
      receiver: "Ryan",
      customerSource: order.customerSource,
      partnerName: order.partnerName,
      businessPeriod: order.businessPeriod,
      ryanShareGBP: shares.ryanShareGBP,
      partnerShareGBP: shares.partnerShareGBP,
      notes: text(formData, "notes") || null
    }
  });

  await refreshOrderPaymentState(orderId);
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/settlements");
  redirect(`/orders/${orderId}`);
}

export async function settleRemaining(orderId: number, formData: FormData) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.orderStatus === "CANCELLED") return;

  const amountGBP = Math.round(Number(order.remainingGBP) * 100) / 100;
  if (amountGBP <= 0) return;

  const paymentDate = new Date();
  paymentDate.setHours(0, 0, 0, 0);
  const currencyLabel = (text(formData, "currencyLabel") || "GBP") as CurrencyLabel;
  const shares = calculateShares(
    amountGBP,
    order.businessPeriod,
    order.customerSource
  );

  await prisma.payment.create({
    data: {
      orderId,
      paymentDate,
      amountGBP,
      currencyLabel,
      actualPaymentNote: currencyLabel === "RMB" ? "人民币支付" : null,
      paymentType: Number(order.totalPaidGBP) > 0 ? "BALANCE" : "FULL_PAYMENT",
      receiver: "Ryan",
      customerSource: order.customerSource,
      partnerName: order.partnerName,
      businessPeriod: order.businessPeriod,
      ryanShareGBP: shares.ryanShareGBP,
      partnerShareGBP: shares.partnerShareGBP,
      notes: "订单页一键结清自动创建。"
    }
  });

  await refreshOrderPaymentState(orderId);
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/settlements");
}

export async function updatePayment(paymentId: number, formData: FormData) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true }
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.settlementStatus !== "UNSETTLED") {
    throw new Error("Settled payments cannot be edited because they are already tied to a settlement.");
  }

  const amountGBP = parseMoney(formData.get("amountGBP"));
  if (amountGBP === 0) throw new Error("Payment amount cannot be zero");

  const shares = calculateShares(
    amountGBP,
    payment.order.businessPeriod,
    payment.order.customerSource
  );

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      paymentDate: dateValue(formData, "paymentDate"),
      amountGBP,
      currencyLabel: text(formData, "currencyLabel") as CurrencyLabel,
      actualPaymentNote: text(formData, "actualPaymentNote") || null,
      paymentType: text(formData, "paymentType") as PaymentType,
      receiver: "Ryan",
      customerSource: payment.order.customerSource,
      partnerName: payment.order.partnerName,
      businessPeriod: payment.order.businessPeriod,
      ryanShareGBP: shares.ryanShareGBP,
      partnerShareGBP: shares.partnerShareGBP,
      notes: text(formData, "notes") || null
    }
  });

  await refreshOrderPaymentState(payment.orderId);
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${payment.orderId}`);
  revalidatePath(`/orders/${payment.orderId}/payments/${payment.id}/edit`);
  revalidatePath("/settlements");
  redirect(`/orders/${payment.orderId}`);
}

export async function updateReturnStatus(orderId: number, formData: FormData) {
  await prisma.order.update({
    where: { id: orderId },
    data: { returnStatus: text(formData, "returnStatus") as ReturnStatus }
  });
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/inventory");
}

export async function cancelOrder(orderId: number) {
  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: "CANCELLED" }
  });
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/settlements");
  redirect("/orders");
}

function appendQueryFlag(path: string, key: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=1`;
}

export async function deleteOrder(orderId: number, formData: FormData) {
  const redirectTo = text(formData, "redirectTo") || "/orders";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true }
  });

  if (!order) {
    redirect("/orders");
  }

  const hasSettledPayments = order.payments.some(
    (payment) => payment.settlementStatus === "SETTLED" || payment.settlementId
  );

  if (hasSettledPayments) {
    redirect(appendQueryFlag(redirectTo, "deleteBlocked"));
  }

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/settlements");
  revalidatePath("/inventory");
  redirect("/orders?deleted=1");
}

export async function generateSettlement(formData: FormData) {
  const weekStartDate = dateValue(formData, "weekStartDate");
  const weekEndDate = new Date(`${text(formData, "weekEndDate")}T23:59:59`);
  const partnerName = (text(formData, "partnerName") || "Xiong") as Person;

  const payments = await prisma.payment.findMany({
    where: {
      settlementStatus: "UNSETTLED",
      partnerName,
      paymentDate: { gte: weekStartDate, lte: weekEndDate },
      order: { orderStatus: { not: "CANCELLED" } }
    }
  });

  if (!payments.length) {
    redirect("/settlements?empty=1");
  }

  const totalPaymentGBP = Math.round(
    payments.reduce((sum, payment) => sum + Number(payment.amountGBP), 0) * 100
  ) / 100;
  const totalRyanShareGBP = Math.round(
    payments.reduce((sum, payment) => sum + Number(payment.ryanShareGBP), 0) *
      100
  ) / 100;
  const totalPartnerShareGBP = Math.round(
    payments.reduce((sum, payment) => sum + Number(payment.partnerShareGBP), 0) *
      100
  ) / 100;

  const settlement = await prisma.weeklySettlement.create({
    data: {
      weekStartDate,
      weekEndDate,
      partnerName,
      totalPaymentGBP,
      totalRyanShareGBP,
      totalPartnerShareGBP,
      amountRyanShouldTransferGBP: totalPartnerShareGBP,
      status: "CONFIRMED",
      confirmedAt: new Date()
    }
  });

  await prisma.payment.updateMany({
    where: { id: { in: payments.map((payment) => payment.id) } },
    data: {
      settlementStatus: "SETTLED",
      settlementId: settlement.id
    }
  });

  revalidatePath("/");
  revalidatePath("/settlements");
  revalidatePath("/settlements/history");
  redirect(`/settlements/history/${settlement.id}`);
}

export async function markSettlementPaid(settlementId: number) {
  await prisma.weeklySettlement.update({
    where: { id: settlementId },
    data: { status: "PAID", paidAt: new Date() }
  });
  revalidatePath("/");
  revalidatePath("/settlements/history");
  revalidatePath(`/settlements/history/${settlementId}`);
}

export async function undoSettlement(settlementId: number) {
  const settlement = await prisma.weeklySettlement.findUnique({
    where: { id: settlementId },
    include: { payments: true }
  });
  if (!settlement) redirect("/settlements/history");

  if (settlement.status === "PAID") {
    redirect(`/settlements/history/${settlementId}?paidBlocked=1`);
  }

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { settlementId },
      data: {
        settlementStatus: "UNSETTLED",
        settlementId: null
      }
    }),
    prisma.weeklySettlement.delete({ where: { id: settlementId } })
  ]);

  revalidatePath("/");
  revalidatePath("/settlements");
  revalidatePath("/settlements/history");
  revalidatePath(`/settlements/history/${settlementId}`);
  redirect(
    `/settlements?weekStartDate=${settlement.weekStartDate.toISOString().slice(0, 10)}&weekEndDate=${settlement.weekEndDate.toISOString().slice(0, 10)}&settlementUndone=1`
  );
}
