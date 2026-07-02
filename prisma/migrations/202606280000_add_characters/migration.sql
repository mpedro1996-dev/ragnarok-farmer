CREATE TABLE IF NOT EXISTS "Character" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Character_name_key" ON "Character"("name");
CREATE INDEX IF NOT EXISTS "Character_name_idx" ON "Character"("name");
CREATE INDEX IF NOT EXISTS "Character_level_idx" ON "Character"("level");
CREATE INDEX IF NOT EXISTS "Character_classId_idx" ON "Character"("classId");
