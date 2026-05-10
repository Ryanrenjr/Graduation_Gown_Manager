import { PrismaClient } from "@prisma/client";
import { importHistoricalOrders } from "../scripts/importHistoricalOrders";

const prisma = new PrismaClient();

async function main() {
  const items = [
    {
      itemType: "MASTER_GOWN",
      itemNameZh: "硕士学士袍",
      size: "M",
      sizeLabel: "M号 / 48码",
      totalQty: 6,
      notes: "180以下均可"
    },
    {
      itemType: "MASTER_GOWN",
      itemNameZh: "硕士学士袍",
      size: "L",
      sizeLabel: "L号 / 51码",
      totalQty: 1,
      notes: ""
    },
    {
      itemType: "BACHELOR_GOWN",
      itemNameZh: "本科学士袍",
      size: "M",
      sizeLabel: "M号 / 48码",
      totalQty: 2,
      notes: "180以下均可"
    },
    {
      itemType: "BACHELOR_GOWN",
      itemNameZh: "本科学士袍",
      size: "L",
      sizeLabel: "L号 / 51码",
      totalQty: 1,
      notes: ""
    },
    {
      itemType: "HAT",
      itemNameZh: "学士帽",
      size: "ONE_SIZE",
      sizeLabel: "One Size",
      totalQty: 10,
      notes: "本科/硕士通用"
    },
    {
      itemType: "SASH",
      itemNameZh: "袖带",
      size: "ONE_SIZE",
      sizeLabel: "One Size",
      totalQty: 10,
      notes: "本科/硕士通用"
    },
    {
      itemType: "BEAR",
      itemNameZh: "毕业小熊",
      size: "NONE",
      sizeLabel: "—",
      totalQty: 3,
      notes: "装饰，出租附加。注意：原图为4个，但当前实际库存改为3个。"
    },
    {
      itemType: "FLAG",
      itemNameZh: "毕业小旗子",
      size: "NONE",
      sizeLabel: "—",
      totalQty: 10,
      notes: "装饰，出租附加"
    }
  ];

  await prisma.inventory.deleteMany({
    where: {
      OR: [
        { itemType: "BEAR", size: "ONE_SIZE" },
        { itemType: "FLAG", size: "ONE_SIZE" }
      ]
    }
  });

  for (const item of items) {
    await prisma.inventory.upsert({
      where: { itemType_size: { itemType: item.itemType, size: item.size } },
      update: {
        itemNameZh: item.itemNameZh,
        sizeLabel: item.sizeLabel,
        totalQty: item.totalQty,
        availableQty: item.totalQty,
        notes: item.notes
      },
      create: {
        itemType: item.itemType,
        itemNameZh: item.itemNameZh,
        size: item.size,
        sizeLabel: item.sizeLabel,
        totalQty: item.totalQty,
        rentedQty: 0,
        availableQty: item.totalQty,
        notes: item.notes
      }
    });
  }

  await importHistoricalOrders(prisma);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
