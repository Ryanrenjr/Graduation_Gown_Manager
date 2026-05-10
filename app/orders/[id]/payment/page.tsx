import { notFound } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { Card, PageHeader } from "@/components/ui";
import { getI18n } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export default async function AddPaymentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const order = await prisma.order.findUnique({ where: { id: Number(id) } });
  if (!order) notFound();

  return (
    <main className="page">
      <PageHeader
        title={`${t("addPayment")}: ${order.customerName}`}
        subtitle={t("addPaymentSubtitle")}
      />
      <Card>
        <PaymentForm orderId={order.id} locale={locale} />
      </Card>
    </main>
  );
}
