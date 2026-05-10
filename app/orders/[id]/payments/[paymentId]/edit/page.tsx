import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n-server";
import { money } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function EditPaymentPage({
  params
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const { locale, t } = await getI18n();
  const payment = await prisma.payment.findUnique({
    where: { id: Number(paymentId) },
    include: { order: true }
  });

  if (!payment || payment.orderId !== Number(id)) notFound();

  const isLocked = payment.settlementStatus !== "UNSETTLED";

  return (
    <main className="page">
      <PageHeader
        title={`${t("editPayment")}: ${payment.order.customerName}`}
        subtitle={t("editPaymentSubtitle")}
        action={
          <Link href={`/orders/${payment.orderId}`} className="btn-secondary">
            {t("orderDetails")}
          </Link>
        }
      />

      <Card>
        <div className="mb-6 grid gap-3 rounded-[22px] bg-[#f6f9fc] p-5 text-[#0a2540] md:grid-cols-4">
          <SummaryItem label={t("paymentDate")} value={formatDate(payment.paymentDate)} />
          <SummaryItem label={t("amount")} value={`£${money(payment.amountGBP)}`} />
          <SummaryItem label={t("type")} value={labelStatus(payment.paymentType, locale)} />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {t("status")}
            </p>
            <div className="mt-2">
              <Badge tone={isLocked ? "green" : "orange"}>
                {labelStatus(payment.settlementStatus, locale)}
              </Badge>
            </div>
          </div>
        </div>

        {isLocked ? (
          <div className="rounded-[22px] border border-orange-200 bg-orange-50 p-5 text-base font-semibold text-orange-800">
            {t("settledPaymentLocked")}
          </div>
        ) : (
          <PaymentForm
            orderId={payment.orderId}
            payment={{
              id: payment.id,
              paymentDate: payment.paymentDate,
              amountGBP: Number(payment.amountGBP),
              currencyLabel: payment.currencyLabel,
              paymentType: payment.paymentType,
              actualPaymentNote: payment.actualPaymentNote,
              notes: payment.notes
            }}
            locale={locale}
          />
        )}
      </Card>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
