import { PrismaClient } from "@prisma/client";
import { calculateShares, paymentStatusFor } from "@/lib/business";

type HistoricalOrderInput = {
  originalDateText: string;
  orderDate: string;
  businessPeriod: string;
  partnerName: string;
  customerSource: string;
  customerName?: string;
  degreeType: string;
  itemSummary: string;
  masterMQty: number;
  masterLQty: number;
  bachelorMQty: number;
  bachelorLQty: number;
  bearQty: number;
  flagQty: number;
  standardPriceGBP: number;
  adjustmentGBP: number;
  finalPriceGBP: number;
  paymentAmountGBP: number;
  currencyLabel: string;
  actualPaymentNote?: string;
  paymentType: string | null;
  paymentStatus: string;
  returnStatus: string;
  orderStatus: string;
  notes: string;
};

const IMPORT_MARKER = "历史导入批次:2025-2026";

// 未识别原始记录：14.4
const historicalOrders: HistoricalOrderInput[] = [
  { originalDateText: "6.10", orderDate: "2025-06-10", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 2M1L", bachelorMQty: 2, bachelorLQty: 1, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 51, adjustmentGBP: 0, finalPriceGBP: 51, paymentAmountGBP: 51, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：6.10 2m1l 本科 £51 已清" },
  { originalDateText: "6.14", orderDate: "2025-06-14", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 1M", bachelorMQty: 1, bachelorLQty: 0, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 25, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：6.14 1m 本科 £25 已清" },
  { originalDateText: "6.22", orderDate: "2025-06-22", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 1M", bachelorMQty: 1, bachelorLQty: 0, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 15, adjustmentGBP: 0, finalPriceGBP: 15, paymentAmountGBP: 15, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：6.22 1m本科 £15 已清" },
  { originalDateText: "7.8", orderDate: "2025-07-08", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 20, adjustmentGBP: 0, finalPriceGBP: 20, paymentAmountGBP: 20, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.8 1m硕士 £20 已清" },
  { originalDateText: "7.14和15", orderDate: "2025-07-14", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 92, adjustmentGBP: 0, finalPriceGBP: 92, paymentAmountGBP: 92, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.14和15 3m硕士 £92 已付92 已清" },
  { originalDateText: "7.15", orderDate: "2025-07-15", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M1L + 小熊1个", masterMQty: 1, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 55, adjustmentGBP: 0, finalPriceGBP: 55, paymentAmountGBP: 55, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.15 1m1l 硕士1小熊 英镑55 已付55 已清" },
  { originalDateText: "7.16", orderDate: "2025-07-16", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 2M1L", bachelorMQty: 2, bachelorLQty: 1, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.16 2m1l 本科 £69 已付69 已清" },
  { originalDateText: "7.17", orderDate: "2025-07-17", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 2M1L", bachelorMQty: 2, bachelorLQty: 1, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 55, adjustmentGBP: 0, finalPriceGBP: 55, paymentAmountGBP: 55, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.17 2m1l 本科 £55 已付27.5 已清。按已清录入，原已付金额可能为历史到账/分账记录，需人工核对。" },
  { originalDateText: "7.18", orderDate: "2025-07-18", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 2M1L", bachelorMQty: 2, bachelorLQty: 1, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 51, adjustmentGBP: 0, finalPriceGBP: 51, paymentAmountGBP: 51, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.18 2m1l 本科 £51 已付25.5 已清。按已清录入，原已付金额可能为历史到账/分账记录，需人工核对。" },
  { originalDateText: "7.18", orderDate: "2025-07-18", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.18 3m硕士 £69 已付37.5 已清。按已清录入，原已付金额可能为历史到账/分账记录，需人工核对。" },
  { originalDateText: "7.18", orderDate: "2025-07-18", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 23, adjustmentGBP: 0, finalPriceGBP: 23, paymentAmountGBP: 23, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.18 1m硕士 £23 已付11.5 已清。按已清录入，原已付金额可能为历史到账/分账记录，需人工核对。" },
  { originalDateText: "7.18", orderDate: "2025-07-18", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 2M1L", masterMQty: 2, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.18 2m1l硕士 £69 已付34.5 已清。按已清录入，原已付金额可能为历史到账/分账记录，需人工核对。" },
  { originalDateText: "7.21", orderDate: "2025-07-21", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Bachelor", itemSummary: "本科 1L", bachelorMQty: 0, bachelorLQty: 1, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 25, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.21 1l本科 英镑25 已付25 已清" },
  { originalDateText: "7.22", orderDate: "2025-07-22", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M1L", masterMQty: 1, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 50, adjustmentGBP: 0, finalPriceGBP: 50, paymentAmountGBP: 50, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：7.22 1m1l硕士 £50 已付50 已清" },
  { originalDateText: "8.5", orderDate: "2025-08-05", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.5 3m硕士 £69 已付69 已清" },
  { originalDateText: "8.15", orderDate: "2025-08-15", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 74, adjustmentGBP: 0, finalPriceGBP: 74, paymentAmountGBP: 74, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.15 3m硕士 £74 已付74 已清" },
  { originalDateText: "8.17", orderDate: "2025-08-17", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 25, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.17 1m硕士 £25 已付25 已清" },
  { originalDateText: "8.17", orderDate: "2025-08-17", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 30, adjustmentGBP: 0, finalPriceGBP: 30, paymentAmountGBP: 30, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.17 1m硕士 英镑30 已付30 已清" },
  { originalDateText: "8.19", orderDate: "2025-08-19", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 5M + 小熊1个", masterMQty: 5, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 120, adjustmentGBP: 0, finalPriceGBP: 120, paymentAmountGBP: 120, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.19 5m硕士加一个小熊 £120 已付120给gao。备注：钱可能由 Gao 收到或已给 Gao，需人工核对。" },
  { originalDateText: "8.21", orderDate: "2025-08-21", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 2M", masterMQty: 2, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 50, adjustmentGBP: 0, finalPriceGBP: 50, paymentAmountGBP: 50, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.21 2m硕士 £50 已付50 已清" },
  { originalDateText: "8.24", orderDate: "2025-08-24", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 25, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.24 1m硕士 £25 已付25 已清" },
  { originalDateText: "8.24", orderDate: "2025-08-24", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 30, adjustmentGBP: 0, finalPriceGBP: 30, paymentAmountGBP: 30, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.24 1m硕士 £30 已付30 已清" },
  { originalDateText: "8.24", orderDate: "2025-08-24", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M + 小熊", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 30, adjustmentGBP: 0, finalPriceGBP: 30, paymentAmountGBP: 30, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.24 1m硕士加熊 £30 已付30 已清" },
  { originalDateText: "8.28", orderDate: "2025-08-28", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M + 小熊", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 30, adjustmentGBP: 0, finalPriceGBP: 30, paymentAmountGBP: 30, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：8.28 1m硕士加熊 £30 已付30 已清" },
  { originalDateText: "9.2", orderDate: "2025-09-02", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M + 小熊", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 74, adjustmentGBP: 0, finalPriceGBP: 74, paymentAmountGBP: 74, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：9.2 3m硕士加熊 £74 已付74 已清" },
  { originalDateText: "9.8", orderDate: "2025-09-08", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 3M", masterMQty: 3, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：9.8 3m硕士 £69 已付69 已清" },
  { originalDateText: "9.10", orderDate: "2025-09-10", businessPeriod: "GAO_PERIOD", partnerName: "Gao", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 2M1L", masterMQty: 2, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 69, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：9.10 2m1l硕士 £69 已付69 已清" },
  { originalDateText: "1.12", orderDate: "2026-01-12", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", degreeType: "Master", itemSummary: "硕士 1M + 小熊", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 28, adjustmentGBP: 0, finalPriceGBP: 28, paymentAmountGBP: 28, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.12 1m 硕士 + 熊 £28 已付28" },
  { originalDateText: "1.22", orderDate: "2026-01-22", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "sij", degreeType: "Master", itemSummary: "硕士 1M1L", masterMQty: 1, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 50, adjustmentGBP: 0, finalPriceGBP: 50, paymentAmountGBP: 50, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.22 sij 硕士1m1l £50 已付50（已取 23号还）" },
  { originalDateText: "1.22&23", orderDate: "2026-01-22", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "00", degreeType: "Master", itemSummary: "硕士 1M + 小熊", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 1, flagQty: 0, standardPriceGBP: 50, adjustmentGBP: 0, finalPriceGBP: 50, paymentAmountGBP: 50, currencyLabel: "RMB", actualPaymentNote: "人民币支付", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.22&23 00 硕士1m + 熊 £50 已付50 rmb（已取 23号下午还）" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "李玉天香", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 20, adjustmentGBP: 0, finalPriceGBP: 20, paymentAmountGBP: 20, currencyLabel: "GBP", paymentType: "FULL_PAYMENT", paymentStatus: "PAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 李玉天香 硕士1m 20 20" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "swain", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 12.5, currencyLabel: "GBP", paymentType: "DEPOSIT", paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 swain 硕士1m £25 已付12.5" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "可可西里", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 12.5, currencyLabel: "GBP", paymentType: "DEPOSIT", paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 可可西里 硕士1m £25 已付12.5" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "冒", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 12.5, adjustmentGBP: 0, finalPriceGBP: 12.5, paymentAmountGBP: 0, currencyLabel: "GBP", paymentType: null, paymentStatus: "UNPAID", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 冒 硕士1m £12.5 未付" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "卢", degreeType: "Master", itemSummary: "硕士 1M", masterMQty: 1, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 0, currencyLabel: "GBP", paymentType: null, paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 卢 硕士1m £25 已付定金。定金金额未知，需人工补录。" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "杨", degreeType: "Master", itemSummary: "硕士 1L", masterMQty: 0, masterLQty: 1, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 12.5, currencyLabel: "GBP", paymentType: "DEPOSIT", paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 杨 硕士1l £25 已付12.5" },
  { originalDateText: "1.23", orderDate: "2026-01-23", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", customerName: "suyi", degreeType: "Bachelor", itemSummary: "本科 1M", bachelorMQty: 1, bachelorLQty: 0, masterMQty: 0, masterLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 25, adjustmentGBP: 0, finalPriceGBP: 25, paymentAmountGBP: 12.5, currencyLabel: "GBP", paymentType: "DEPOSIT", paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.23 suyi 本科1m £25 已付12.5" },
  { originalDateText: "1.26", orderDate: "2026-01-26", businessPeriod: "RYAN_SOLO", partnerName: "None", customerSource: "Ryan", degreeType: "Unknown", itemSummary: "2M1L，学位类型未注明", masterMQty: 0, masterLQty: 0, bachelorMQty: 0, bachelorLQty: 0, bearQty: 0, flagQty: 0, standardPriceGBP: 69, adjustmentGBP: 0, finalPriceGBP: 69, paymentAmountGBP: 6, currencyLabel: "GBP", paymentType: "DEPOSIT", paymentStatus: "PARTIAL", returnStatus: "RETURNED", orderStatus: "COMPLETED", notes: "原始记录：1.26 2m1l 已付定金 £69 已付6。学位类型未注明，需人工补充本科/硕士和具体库存数量。" }
];

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function importHistoricalOrders(prisma: PrismaClient) {
  await prisma.order.deleteMany({
    where: { notes: { contains: IMPORT_MARKER } }
  });

  let ordersCreated = 0;
  let paymentsCreated = 0;

  for (const [index, row] of historicalOrders.entries()) {
    const paid = roundMoney(row.paymentAmountGBP);
    const finalPrice = roundMoney(row.finalPriceGBP);
    const notes = [
      row.notes,
      `originalDateText: ${row.originalDateText}`,
      IMPORT_MARKER
    ].join("\n");
    const customerName =
      row.customerName ?? `历史客户 ${row.originalDateText} #${index + 1}`;

    const order = await prisma.order.create({
      data: {
        orderDate: new Date(`${row.orderDate}T00:00:00`),
        customerName,
        businessPeriod: row.businessPeriod,
        partnerName: row.partnerName,
        customerSource: row.customerSource,
        handoverPerson: "Ryan",
        degreeType: row.degreeType,
        itemSummary: row.itemSummary,
        masterMQty: row.masterMQty,
        masterLQty: row.masterLQty,
        bachelorMQty: row.bachelorMQty,
        bachelorLQty: row.bachelorLQty,
        bearQty: row.bearQty,
        flagQty: row.flagQty,
        standardPriceGBP: roundMoney(row.standardPriceGBP),
        adjustmentGBP: roundMoney(row.adjustmentGBP),
        finalPriceGBP: finalPrice,
        totalPaidGBP: paid,
        remainingGBP: roundMoney(finalPrice - paid),
        paymentStatus: row.paymentStatus || paymentStatusFor(paid, finalPrice),
        returnStatus: row.returnStatus,
        orderStatus: row.orderStatus,
        notes
      }
    });
    ordersCreated += 1;

    if (paid > 0) {
      const shares = calculateShares(paid, row.businessPeriod, row.customerSource);
      await prisma.payment.create({
        data: {
          orderId: order.id,
          paymentDate: new Date(`${row.orderDate}T00:00:00`),
          amountGBP: paid,
          currencyLabel: row.currencyLabel,
          actualPaymentNote: row.actualPaymentNote ?? null,
          paymentType: row.paymentType ?? "FULL_PAYMENT",
          receiver: "Ryan",
          customerSource: row.customerSource,
          partnerName: row.partnerName,
          businessPeriod: row.businessPeriod,
          ryanShareGBP: shares.ryanShareGBP,
          partnerShareGBP: shares.partnerShareGBP,
          settlementStatus: "SETTLED",
          notes: [
            "历史订单，默认已处理，不进入当前周结算。",
            row.notes.includes("给gao")
              ? "原记录提到给 Gao，当前系统仍保留 receiver = Ryan，需人工核对实际收款账户。"
              : null,
            notes
          ]
            .filter(Boolean)
            .join("\n")
        }
      });
      paymentsCreated += 1;
    }
  }

  console.log(
    `Historical import complete: ${ordersCreated} orders, ${paymentsCreated} payments. 未识别原始记录：14.4`
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  importHistoricalOrders(prisma)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
