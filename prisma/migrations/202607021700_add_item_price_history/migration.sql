CREATE TABLE "ItemPriceHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "itemId" INTEGER NOT NULL,
  "previousAverageZenny" INTEGER NOT NULL,
  "nextAverageZenny" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItemPriceHistory_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ItemPriceHistory_itemId_idx" ON "ItemPriceHistory"("itemId");
CREATE INDEX "ItemPriceHistory_createdAt_idx" ON "ItemPriceHistory"("createdAt");
