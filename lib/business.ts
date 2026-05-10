import type { BusinessPeriod, Person } from "@/lib/types";

export function displayPerson(person: string) {
  if (person === "Xiong") return "Fay";
  if (person === "None") return "None";
  return person;
}

export function displayPeriod(period: string) {
  if (period === "GAO_PERIOD") return "Gao 合作期";
  if (period === "RYAN_SOLO") return "Ryan 自营期";
  return "Fay 合作期";
}

export function calculateShares(
  paymentAmountGBP: number,
  businessPeriod: string,
  customerSource: string
) {
  let ryanRate = 1;
  let partnerRate = 0;

  if (businessPeriod === "GAO_PERIOD") {
    ryanRate = 0.6;
    partnerRate = 0.4;
  }

  if (businessPeriod === "XIONG_PERIOD") {
    if (customerSource === "Xiong") {
      ryanRate = 0.4;
      partnerRate = 0.6;
    } else {
      ryanRate = 0.6;
      partnerRate = 0.4;
    }
  }

  const ryanShareGBP = Math.round(paymentAmountGBP * ryanRate * 100) / 100;
  const partnerShareGBP = Math.round(paymentAmountGBP * partnerRate * 100) / 100;

  return { ryanShareGBP, partnerShareGBP };
}

export function partnerForPeriod(period: BusinessPeriod | string): Person {
  if (period === "GAO_PERIOD") return "Gao";
  if (period === "RYAN_SOLO") return "None";
  return "Xiong";
}

export function paymentStatusFor(totalPaid: number, finalPrice: number) {
  if (totalPaid <= 0) return "UNPAID" as const;
  if (totalPaid < finalPrice) return "PARTIAL" as const;
  if (totalPaid === finalPrice) return "PAID" as const;
  return "OVERPAID" as const;
}

export function buildItemSummary(input: {
  degreeType: string;
  masterMQty: number;
  masterLQty: number;
  bachelorMQty: number;
  bachelorLQty: number;
  bearQty: number;
  flagQty: number;
}) {
  const parts: string[] = [];
  if (input.masterMQty) parts.push(`硕士 ${input.masterMQty}M`);
  if (input.masterLQty) parts.push(`硕士 ${input.masterLQty}L`);
  if (input.bachelorMQty) parts.push(`本科 ${input.bachelorMQty}M`);
  if (input.bachelorLQty) parts.push(`本科 ${input.bachelorLQty}L`);
  if (input.bearQty) parts.push(`小熊 x${input.bearQty}`);
  if (input.flagQty) parts.push(`小旗 x${input.flagQty}`);
  return parts.length ? parts.join(" + ") : input.degreeType;
}
