PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Order" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderDate" DATETIME NOT NULL,
  "customerName" TEXT NOT NULL,
  "businessPeriod" TEXT NOT NULL DEFAULT 'XIONG_PERIOD',
  "partnerName" TEXT NOT NULL DEFAULT 'Xiong',
  "customerSource" TEXT NOT NULL,
  "handoverPerson" TEXT NOT NULL,
  "degreeType" TEXT NOT NULL,
  "itemSummary" TEXT NOT NULL,
  "masterMQty" INTEGER NOT NULL DEFAULT 0,
  "masterLQty" INTEGER NOT NULL DEFAULT 0,
  "bachelorMQty" INTEGER NOT NULL DEFAULT 0,
  "bachelorLQty" INTEGER NOT NULL DEFAULT 0,
  "bearQty" INTEGER NOT NULL DEFAULT 0,
  "flagQty" INTEGER NOT NULL DEFAULT 0,
  "standardPriceGBP" REAL NOT NULL,
  "adjustmentGBP" REAL NOT NULL,
  "finalPriceGBP" REAL NOT NULL,
  "totalPaidGBP" REAL NOT NULL DEFAULT 0,
  "remainingGBP" REAL NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "returnStatus" TEXT NOT NULL DEFAULT 'NOT_COLLECTED',
  "orderStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "WeeklySettlement" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "weekStartDate" DATETIME NOT NULL,
  "weekEndDate" DATETIME NOT NULL,
  "partnerName" TEXT NOT NULL,
  "totalPaymentGBP" REAL NOT NULL,
  "totalRyanShareGBP" REAL NOT NULL,
  "totalPartnerShareGBP" REAL NOT NULL,
  "amountRyanShouldTransferGBP" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "confirmedAt" DATETIME,
  "paidAt" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId" INTEGER NOT NULL,
  "paymentDate" DATETIME NOT NULL,
  "amountGBP" REAL NOT NULL,
  "currencyLabel" TEXT NOT NULL,
  "actualPaymentNote" TEXT,
  "paymentType" TEXT NOT NULL,
  "receiver" TEXT NOT NULL DEFAULT 'Ryan',
  "customerSource" TEXT NOT NULL,
  "partnerName" TEXT NOT NULL,
  "businessPeriod" TEXT NOT NULL,
  "ryanShareGBP" REAL NOT NULL,
  "partnerShareGBP" REAL NOT NULL,
  "settlementStatus" TEXT NOT NULL DEFAULT 'UNSETTLED',
  "settlementId" INTEGER,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Payment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "WeeklySettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Inventory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "itemType" TEXT NOT NULL,
  "itemNameZh" TEXT,
  "size" TEXT NOT NULL,
  "sizeLabel" TEXT,
  "totalQty" INTEGER NOT NULL,
  "rentedQty" INTEGER NOT NULL DEFAULT 0,
  "availableQty" INTEGER NOT NULL,
  "notes" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_itemType_size_key" ON "Inventory"("itemType", "size");
