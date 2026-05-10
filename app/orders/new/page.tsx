import { Card, PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/order-form";
import { getI18n } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export default async function NewOrderPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { locale, t } = await getI18n();
  const [inventory, orders] = await Promise.all([
    prisma.inventory.findMany({ orderBy: [{ itemType: "asc" }, { size: "asc" }] }),
    prisma.order.findMany({
      where: { orderStatus: { not: "CANCELLED" }, returnStatus: { not: "RETURNED" } }
    })
  ]);
  return (
    <main className="page">
      <PageHeader title={t("addOrder")} subtitle={t("addOrderSubtitle")} />
      {params.stockError ? (
        <Card className="mb-6 border-red-100 bg-red-50">
          <p className="text-base font-bold text-red-800">{t("stockErrorTitle")}</p>
          <p className="mt-2 text-sm font-semibold text-red-700">
            {params.stockError}
          </p>
        </Card>
      ) : null}
      <Card>
        <OrderForm
          locale={locale}
          inventory={inventory}
          existingOrders={orders}
        />
      </Card>
    </main>
  );
}
