CREATE TABLE IF NOT EXISTS "Instance" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "minimumLevel" INTEGER NOT NULL,
  "cooldownDays" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Instance_name_key" ON "Instance"("name");
CREATE INDEX IF NOT EXISTS "Instance_name_idx" ON "Instance"("name");
CREATE INDEX IF NOT EXISTS "Instance_minimumLevel_idx" ON "Instance"("minimumLevel");
CREATE INDEX IF NOT EXISTS "Instance_cooldownDays_idx" ON "Instance"("cooldownDays");

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
);

CREATE INDEX IF NOT EXISTS "InstanceItem_itemId_idx" ON "InstanceItem"("itemId");
