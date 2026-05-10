import { Card, PageHeader, StatCard } from "@/components/ui";
import { updateInventoryItem } from "@/app/actions";
import { inventorySummaryWithUsage, inventoryWithUsage } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const [inventory, orders] = await Promise.all([
    prisma.inventory.findMany({ orderBy: [{ itemType: "asc" }, { size: "asc" }] }),
    prisma.order.findMany()
  ]);
  const stock = inventorySummaryWithUsage(inventory, orders);
  const detailStock = inventoryWithUsage(inventory, orders);
  const total = stock.reduce((sum, item) => sum + item.totalQty, 0);
  const rented = stock.reduce((sum, item) => sum + item.rentedQty, 0);
  const available = stock.reduce((sum, item) => sum + item.availableQty, 0);

  return (
    <main className="page">
      <PageHeader
        title="库存"
        subtitle="按业务可出租数量统计：本科套数、硕士套数、小熊和小旗子。只有“已领取未归还”的订单会占用库存。"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="总数量" value={String(total)} />
        <StatCard label="已出租" value={String(rented)} tone="orange" />
        <StatCard label="可用库存" value={String(available)} tone="green" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stock.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{item.category}</p>
                <p className="mt-1 text-sm text-app-secondary">{item.notes}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Mini label="总数量" value={item.totalQty} />
              <Mini label="已出租" value={item.rentedQty} />
              <Mini label="可用库存" value={item.availableQty} />
            </div>
          </Card>
        ))}
      </div>

      <div className="table-wrap mt-6">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>类别</th>
              <th>尺码</th>
              <th>总数量</th>
              <th>已出租</th>
              <th>可用库存</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const usage = detailStock.find((row) => row.id === item.id);
              const rentedQty = usage?.rentedQty ?? 0;
              const availableQty = Number(item.totalQty) - rentedQty;

              return (
              <tr key={item.id}>
                <td data-label="编号">{item.id}</td>
                <td data-label="类别">
                  <form id={`inventory-${item.id}`} action={updateInventoryItem.bind(null, item.id)} className="grid gap-2">
                    <input
                      className="input min-h-11 px-3 text-base"
                      name="itemNameZh"
                      defaultValue={item.itemNameZh ?? labelItemType(item.itemType)}
                    />
                  </form>
                </td>
                <td data-label="尺码">
                  <input
                    form={`inventory-${item.id}`}
                    className="input min-h-11 px-3 text-base"
                    name="sizeLabel"
                    defaultValue={item.sizeLabel ?? item.size}
                  />
                </td>
                <td data-label="总数量">
                  <input
                    form={`inventory-${item.id}`}
                    className="input min-h-11 w-24 px-3 text-base"
                    type="number"
                    min="0"
                    name="totalQty"
                    defaultValue={item.totalQty}
                  />
                </td>
                <td data-label="已出租">{rentedQty}</td>
                <td data-label="可用库存">{availableQty}</td>
                <td data-label="备注">
                  <input
                    form={`inventory-${item.id}`}
                    className="input min-h-11 px-3 text-base"
                    name="notes"
                    defaultValue={item.notes ?? ""}
                  />
                </td>
                <td data-label="操作">
                  <button form={`inventory-${item.id}`} className="btn-secondary min-h-11 px-4 py-2" type="submit">
                    保存
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function labelItemType(itemType: string) {
  const labels: Record<string, string> = {
    MASTER_GOWN: "硕士学士袍",
    BACHELOR_GOWN: "本科学士袍",
    HAT: "学士帽",
    SASH: "袖带",
    BEAR: "毕业小熊",
    FLAG: "毕业小旗子"
  };
  return labels[itemType] ?? itemType;
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-3 py-4">
      <p className="text-xs text-app-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
