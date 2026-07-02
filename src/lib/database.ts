import { prisma } from "./prisma";

let databaseSchemaReady: Promise<void> | null = null;

type SQLiteTableColumn = {
  name: string;
};

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS "Item" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "averageZenny" INTEGER NOT NULL,
      "divinePrideId" INTEGER,
      "isSoldToNpc" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Item_name_key" ON "Item"("name")`,
  `CREATE INDEX IF NOT EXISTS "Item_name_idx" ON "Item"("name")`,
  `CREATE INDEX IF NOT EXISTS "Item_averageZenny_idx" ON "Item"("averageZenny")`,
  `
    CREATE TABLE IF NOT EXISTS "ItemPriceHistory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "itemId" INTEGER NOT NULL,
      "previousAverageZenny" INTEGER NOT NULL,
      "nextAverageZenny" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ItemPriceHistory_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `,
  `CREATE INDEX IF NOT EXISTS "ItemPriceHistory_itemId_idx" ON "ItemPriceHistory"("itemId")`,
  `CREATE INDEX IF NOT EXISTS "ItemPriceHistory_createdAt_idx" ON "ItemPriceHistory"("createdAt")`,
  `
    CREATE TABLE IF NOT EXISTS "Instance" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "minimumLevel" INTEGER NOT NULL,
      "cooldownDays" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Instance_name_key" ON "Instance"("name")`,
  `CREATE INDEX IF NOT EXISTS "Instance_name_idx" ON "Instance"("name")`,
  `CREATE INDEX IF NOT EXISTS "Instance_minimumLevel_idx" ON "Instance"("minimumLevel")`,
  `CREATE INDEX IF NOT EXISTS "Instance_cooldownDays_idx" ON "Instance"("cooldownDays")`,
  `
    CREATE TABLE IF NOT EXISTS "InstanceItem" (
      "instanceId" INTEGER NOT NULL,
      "itemId" INTEGER NOT NULL,
      PRIMARY KEY ("instanceId", "itemId"),
      CONSTRAINT "InstanceItem_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "Instance" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InstanceItem_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `,
  `CREATE INDEX IF NOT EXISTS "InstanceItem_itemId_idx" ON "InstanceItem"("itemId")`,
  `
    CREATE TABLE IF NOT EXISTS "Character" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "level" INTEGER NOT NULL,
      "classId" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Character_name_key" ON "Character"("name")`,
  `CREATE INDEX IF NOT EXISTS "Character_name_idx" ON "Character"("name")`,
  `CREATE INDEX IF NOT EXISTS "Character_level_idx" ON "Character"("level")`,
  `CREATE INDEX IF NOT EXISTS "Character_classId_idx" ON "Character"("classId")`,
  `
    CREATE TABLE IF NOT EXISTS "FarmRun" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "characterId" INTEGER NOT NULL,
      "instanceId" INTEGER NOT NULL,
      "executedAt" DATETIME NOT NULL,
      "operationalDate" TEXT NOT NULL,
      "nextAvailableAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FarmRun_characterId_fkey"
        FOREIGN KEY ("characterId") REFERENCES "Character" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "FarmRun_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "Instance" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `,
  `CREATE INDEX IF NOT EXISTS "FarmRun_characterId_idx" ON "FarmRun"("characterId")`,
  `CREATE INDEX IF NOT EXISTS "FarmRun_instanceId_idx" ON "FarmRun"("instanceId")`,
  `CREATE INDEX IF NOT EXISTS "FarmRun_executedAt_idx" ON "FarmRun"("executedAt")`,
  `CREATE INDEX IF NOT EXISTS "FarmRun_operationalDate_idx" ON "FarmRun"("operationalDate")`,
  `CREATE INDEX IF NOT EXISTS "FarmRun_nextAvailableAt_idx" ON "FarmRun"("nextAvailableAt")`,
  `
    CREATE TABLE IF NOT EXISTS "FarmRunItem" (
      "farmRunId" INTEGER NOT NULL,
      "itemId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      PRIMARY KEY ("farmRunId", "itemId"),
      CONSTRAINT "FarmRunItem_farmRunId_fkey"
        FOREIGN KEY ("farmRunId") REFERENCES "FarmRun" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FarmRunItem_itemId_fkey"
        FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `,
  `CREATE INDEX IF NOT EXISTS "FarmRunItem_itemId_idx" ON "FarmRunItem"("itemId")`,
];

export async function ensureDatabaseSchema() {
  if (!databaseSchemaReady) {
    databaseSchemaReady = prisma
      .$transaction(
        schemaStatements.map((statement) => prisma.$executeRawUnsafe(statement)),
      )
      .then(async () => {
        await ensureItemNpcColumn();
        await ensureItemPriceHistoryTable();
      });
  }

  await databaseSchemaReady;
}

async function ensureItemNpcColumn() {
  const columns = await prisma.$queryRawUnsafe<SQLiteTableColumn[]>(
    `PRAGMA table_info("Item")`,
  );

  const hasNpcColumn = columns.some((column) => column.name === "isSoldToNpc");

  if (!hasNpcColumn) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Item" ADD COLUMN "isSoldToNpc" BOOLEAN NOT NULL DEFAULT false`,
    );
  }
}

async function ensureItemPriceHistoryTable() {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ItemPriceHistory" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "itemId" INTEGER NOT NULL,
        "previousAverageZenny" INTEGER NOT NULL,
        "nextAverageZenny" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ItemPriceHistory_itemId_fkey"
          FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `),
    prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ItemPriceHistory_itemId_idx" ON "ItemPriceHistory"("itemId")`,
    ),
    prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ItemPriceHistory_createdAt_idx" ON "ItemPriceHistory"("createdAt")`,
    ),
  ]);
}
