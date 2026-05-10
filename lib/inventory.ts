import { Inventory, Order } from "@prisma/client";

type RentalOrder = Pick<
  Order,
  | "returnStatus"
  | "orderStatus"
  | "masterMQty"
  | "masterLQty"
  | "bachelorMQty"
  | "bachelorLQty"
  | "bearQty"
  | "flagQty"
>;

export function inventoryWithUsage(inventory: Inventory[], orders: RentalOrder[]) {
  const rented = new Map<string, number>();
  const add = (itemType: string, size: string, qty: number) => {
    const key = `${itemType}:${size}`;
    rented.set(key, (rented.get(key) ?? 0) + qty);
  };

  for (const order of orders) {
    if (
      order.orderStatus === "CANCELLED" ||
      order.returnStatus !== "COLLECTED_NOT_RETURNED"
    ) {
      continue;
    }
    add("MASTER_GOWN", "M", order.masterMQty);
    add("MASTER_GOWN", "L", order.masterLQty);
    add("BACHELOR_GOWN", "M", order.bachelorMQty);
    add("BACHELOR_GOWN", "L", order.bachelorLQty);
    add("BEAR", "NONE", order.bearQty);
    add("FLAG", "NONE", order.flagQty);

    const gownCount =
      order.masterMQty +
      order.masterLQty +
      order.bachelorMQty +
      order.bachelorLQty;
    add("HAT", "ONE_SIZE", gownCount);
    add("SASH", "ONE_SIZE", gownCount);
  }

  return inventory.map((item) => {
    const rentedQty = rented.get(`${item.itemType}:${item.size}`) ?? 0;
    return {
      ...item,
      rentedQty,
      availableQty: item.totalQty - rentedQty
    };
  });
}

export function inventorySummaryWithUsage(
  inventory: Inventory[],
  orders: RentalOrder[]
) {
  const activeOrders = orders.filter(
    (order) =>
      order.orderStatus !== "CANCELLED" &&
      order.returnStatus === "COLLECTED_NOT_RETURNED"
  );

  const totalFor = (itemType: string) =>
    inventory
      .filter((item) => item.itemType === itemType)
      .reduce((sum, item) => sum + item.totalQty, 0);

  const noteFor = (itemType: string) =>
    inventory
      .filter((item) => item.itemType === itemType)
      .map((item) => {
        const size = item.sizeLabel ?? item.size;
        return `${size}: ${item.totalQty}`;
      })
      .join(" / ");

  const rentedMaster = activeOrders.reduce(
    (sum, order) => sum + order.masterMQty + order.masterLQty,
    0
  );
  const rentedBachelor = activeOrders.reduce(
    (sum, order) => sum + order.bachelorMQty + order.bachelorLQty,
    0
  );
  const rentedBear = activeOrders.reduce((sum, order) => sum + order.bearQty, 0);
  const rentedFlag = activeOrders.reduce((sum, order) => sum + order.flagQty, 0);

  const rows = [
    {
      id: "master-sets",
      category: "硕士套数",
      totalQty: totalFor("MASTER_GOWN"),
      rentedQty: rentedMaster,
      notes: noteFor("MASTER_GOWN")
    },
    {
      id: "bachelor-sets",
      category: "本科套数",
      totalQty: totalFor("BACHELOR_GOWN"),
      rentedQty: rentedBachelor,
      notes: noteFor("BACHELOR_GOWN")
    },
    {
      id: "bears",
      category: "毕业小熊",
      totalQty: totalFor("BEAR"),
      rentedQty: rentedBear,
      notes: inventory.find((item) => item.itemType === "BEAR")?.notes ?? ""
    },
    {
      id: "flags",
      category: "毕业小旗子",
      totalQty: totalFor("FLAG"),
      rentedQty: rentedFlag,
      notes: inventory.find((item) => item.itemType === "FLAG")?.notes ?? ""
    }
  ];

  return rows.map((row) => ({
    ...row,
    availableQty: row.totalQty - row.rentedQty
  }));
}
