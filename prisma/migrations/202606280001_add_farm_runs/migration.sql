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
);

CREATE INDEX IF NOT EXISTS "FarmRun_characterId_idx" ON "FarmRun"("characterId");
CREATE INDEX IF NOT EXISTS "FarmRun_instanceId_idx" ON "FarmRun"("instanceId");
CREATE INDEX IF NOT EXISTS "FarmRun_executedAt_idx" ON "FarmRun"("executedAt");
CREATE INDEX IF NOT EXISTS "FarmRun_operationalDate_idx" ON "FarmRun"("operationalDate");
CREATE INDEX IF NOT EXISTS "FarmRun_nextAvailableAt_idx" ON "FarmRun"("nextAvailableAt");

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
);

CREATE INDEX IF NOT EXISTS "FarmRunItem_itemId_idx" ON "FarmRunItem"("itemId");
