import { notFound } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { Card, PageHeader } from "@/components/ui";
import { getI18n } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export default async function EditOrderPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { locale, t } = await getI18n();
  const [order, inventory, orders] = await Promise.all([
    prisma.order.findUnique({ where: { id: Number(id) } }),
    prisma.inventory.findMany({ orderBy: [{ itemType: "asc" }, { size: "asc" }] }),
    prisma.order.findMany({
      where: { orderStatus: { not: "CANCELLED" }, returnStatus: { not: "RETURNED" } }
    })
  ]);
  if (!order) notFound();

  return (
    <main className="page">
      <PageHeader title={`${t("edit")} ${order.customerName}`} subtitle={t("editOrderSubtitle")} />
      {query.stockError ? (
        <Card className="mb-6 border-red-100 bg-red-50">
          <p className="text-base font-bold text-red-800">{t("stockErrorTitle")}</p>
          <p className="mt-2 text-sm font-semibold text-red-700">
            {query.stockError}
          </p>
        </Card>
      ) : null}
      <Card>
        <OrderForm
          order={order}
          locale={locale}
          inventory={inventory}
          existingOrders={orders}
        />
      </Card>
    </main>
  );
}
