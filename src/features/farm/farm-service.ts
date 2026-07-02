import "server-only";

import { ensureDatabaseSchema } from "@/lib/database";
import { prisma } from "@/lib/prisma";

import { getCharacterClassLabel } from "@/features/characters/character-classes";

import type { FarmQuery, FarmRunInput } from "./farm-schema";
import { getNextAvailableAt, getOperationalDate, isCooldownActive } from "./farm-time";

type DatabaseExecutor = Pick<typeof prisma, "$executeRawUnsafe" | "$queryRawUnsafe">;

type RawCharacterRow = {
  id: number;
  name: string;
  level: number;
  classId: number;
};

type RawInstanceRow = {
  id: number;
  name: string;
  minimumLevel: number;
  cooldownDays: number;
};

type RawInstanceItemRow = {
  instanceId: number;
  itemId: number;
  itemName: string;
  divinePrideId: number | null;
};

type RawLatestRunRow = {
  instanceId: number;
  executedAt: string | Date;
  nextAvailableAt: string | Date | null;
};

type RawHistoryRunRow = {
  id: number;
  instanceId: number;
  instanceName: string;
  executedAt: string | Date;
  operationalDate: string;
  nextAvailableAt: string | Date | null;
};

type RawHistoryDropRow = {
  farmRunId: number;
  itemId: number;
  itemName: string;
  divinePrideId: number | null;
  quantity: number;
};

export type FarmCardStatus = "available" | "blocked-level" | "cooldown";

export class FarmCharacterNotFoundError extends Error {
  constructor() {
    super("Character not found.");
    this.name = "FarmCharacterNotFoundError";
  }
}

export class FarmInstanceNotFoundError extends Error {
  constructor() {
    super("Instance not found.");
    this.name = "FarmInstanceNotFoundError";
  }
}

export class FarmInstanceLevelError extends Error {
  constructor() {
    super("The selected character does not meet the minimum level for this instance.");
    this.name = "FarmInstanceLevelError";
  }
}

export class FarmInstanceCooldownError extends Error {
  constructor() {
    super("This instance is still on cooldown for the selected character.");
    this.name = "FarmInstanceCooldownError";
  }
}

export class FarmInstanceItemMismatchError extends Error {
  constructor() {
    super("One or more drops do not belong to the selected instance.");
    this.name = "FarmInstanceItemMismatchError";
  }
}

export async function listFarmOperation(query: FarmQuery) {
  await ensureDatabaseSchema();

  const characters = await listFarmCharacters();

  if (!query.characterId) {
    return {
      characters,
      selectedCharacter: null,
      instances: [],
    };
  }

  const selectedCharacter = await getCharacterById(query.characterId);
  const search = query.search.trim();
  const instanceRows = search
    ? await prisma.$queryRawUnsafe<RawInstanceRow[]>(
        `
          SELECT
            "id",
            "name",
            "minimumLevel",
            "cooldownDays"
          FROM "Instance"
          WHERE "name" LIKE ?
          ORDER BY "name" ASC
        `,
        `%${search}%`,
      )
    : await prisma.$queryRawUnsafe<RawInstanceRow[]>(`
        SELECT
          "id",
          "name",
          "minimumLevel",
          "cooldownDays"
        FROM "Instance"
        ORDER BY "name" ASC
      `);

  const instances = await hydrateFarmCards(instanceRows, selectedCharacter);

  return {
    characters,
    selectedCharacter,
    instances,
  };
}

export async function createFarmRun(input: FarmRunInput) {
  await ensureDatabaseSchema();

  const character = await getCharacterById(input.characterId);
  const instance = await getFarmInstanceById(input.instanceId);
  const now = new Date();

  if (character.level < instance.minimumLevel) {
    throw new FarmInstanceLevelError();
  }

  if (!areAllDropsValid(instance.items, input.drops)) {
    throw new FarmInstanceItemMismatchError();
  }

  const latestRun = await getLatestFarmRun(input.characterId, input.instanceId);
  const latestNextAvailableAt = parseDateValue(latestRun?.nextAvailableAt ?? null);

  if (isCooldownActive(latestNextAvailableAt, now)) {
    throw new FarmInstanceCooldownError();
  }

  const operationalDate = getOperationalDate(now);
  const nextAvailableAt = getNextAvailableAt(now, instance.cooldownDays);
  const positiveDrops = input.drops.filter((drop) => drop.quantity > 0);

  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "FarmRun" (
          "characterId",
          "instanceId",
          "executedAt",
          "operationalDate",
          "nextAvailableAt"
        ) VALUES (?, ?, ?, ?, ?)
      `,
      input.characterId,
      input.instanceId,
      now.toISOString(),
      operationalDate,
      nextAvailableAt?.toISOString() ?? null,
    );

    const [insertedRow] = await transaction.$queryRawUnsafe<{ id: number }[]>(
      `SELECT last_insert_rowid() AS "id"`,
    );

    const farmRunId = Number(insertedRow?.id);

    if (!farmRunId) {
      throw new Error("Failed to create the farm run.");
    }

    if (positiveDrops.length > 0) {
      const placeholders = positiveDrops.map(() => "(?, ?, ?)").join(", ");
      const values = positiveDrops.flatMap((drop) => [farmRunId, drop.itemId, drop.quantity]);

      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "FarmRunItem" (
            "farmRunId",
            "itemId",
            "quantity"
          ) VALUES ${placeholders}
        `,
        ...values,
      );
    }

    return getFarmHistoryRunById(transaction, farmRunId);
  });
}

export async function listFarmHistory(characterId: number) {
  await ensureDatabaseSchema();
  await getCharacterById(characterId);

  const runRows = await prisma.$queryRawUnsafe<RawHistoryRunRow[]>(
    `
      SELECT
        fr."id" AS "id",
        fr."instanceId" AS "instanceId",
        i."name" AS "instanceName",
        fr."executedAt" AS "executedAt",
        fr."operationalDate" AS "operationalDate",
        fr."nextAvailableAt" AS "nextAvailableAt"
      FROM "FarmRun" fr
      INNER JOIN "Instance" i ON i."id" = fr."instanceId"
      WHERE fr."characterId" = ?
      ORDER BY fr."executedAt" DESC, fr."id" DESC
    `,
    characterId,
  );

  return hydrateFarmHistory(prisma, runRows);
}

async function listFarmCharacters() {
  const rows = await prisma.$queryRawUnsafe<RawCharacterRow[]>(`
    SELECT
      "id",
      "name",
      "level",
      "classId"
    FROM "Character"
    ORDER BY "name" ASC
  `);

  return rows.map(mapCharacterRow);
}

async function getCharacterById(id: number) {
  const rows = await prisma.$queryRawUnsafe<RawCharacterRow[]>(
    `
      SELECT
        "id",
        "name",
        "level",
        "classId"
      FROM "Character"
      WHERE "id" = ?
    `,
    id,
  );

  if (rows.length === 0) {
    throw new FarmCharacterNotFoundError();
  }

  return mapCharacterRow(rows[0]);
}

async function hydrateFarmCards(
  rows: RawInstanceRow[],
  selectedCharacter: ReturnType<typeof mapCharacterRow>,
) {
  if (rows.length === 0) {
    return [];
  }

  const instanceIds = rows.map((row) => row.id);
  const placeholders = instanceIds.map(() => "?").join(", ");
  const [itemRows, latestRuns] = await Promise.all([
    prisma.$queryRawUnsafe<RawInstanceItemRow[]>(
      `
        SELECT
          ii."instanceId" AS "instanceId",
          item."id" AS "itemId",
          item."name" AS "itemName",
          item."divinePrideId" AS "divinePrideId"
        FROM "InstanceItem" ii
        INNER JOIN "Item" item ON item."id" = ii."itemId"
        WHERE ii."instanceId" IN (${placeholders})
        ORDER BY item."name" ASC
      `,
      ...instanceIds,
    ),
    prisma.$queryRawUnsafe<RawLatestRunRow[]>(
      `
        SELECT
          fr."instanceId" AS "instanceId",
          fr."executedAt" AS "executedAt",
          fr."nextAvailableAt" AS "nextAvailableAt"
        FROM "FarmRun" fr
        INNER JOIN (
          SELECT
            "instanceId",
            MAX("id") AS "latestId"
          FROM "FarmRun"
          WHERE "characterId" = ?
          GROUP BY "instanceId"
        ) latest ON latest."latestId" = fr."id"
      `,
      selectedCharacter.id,
    ),
  ]);

  const itemsByInstanceId = new Map<number, RawInstanceItemRow[]>();
  const latestRunByInstanceId = new Map<number, RawLatestRunRow>();
  const now = new Date();

  for (const itemRow of itemRows) {
    const currentItems = itemsByInstanceId.get(itemRow.instanceId) ?? [];
    currentItems.push(itemRow);
    itemsByInstanceId.set(itemRow.instanceId, currentItems);
  }

  for (const latestRun of latestRuns) {
    latestRunByInstanceId.set(latestRun.instanceId, latestRun);
  }

  return rows.map((row) => {
    const latestRun = latestRunByInstanceId.get(row.id);
    const nextAvailableAt = parseDateValue(latestRun?.nextAvailableAt ?? null);
    const eligibleByLevel = selectedCharacter.level >= row.minimumLevel;
    const onCooldown =
      eligibleByLevel && row.cooldownDays > 0 && isCooldownActive(nextAvailableAt, now);
    const status: FarmCardStatus = !eligibleByLevel
      ? "blocked-level"
      : onCooldown
        ? "cooldown"
        : "available";

    return {
      instanceId: row.id,
      instanceName: row.name,
      minimumLevel: row.minimumLevel,
      characterLevel: selectedCharacter.level,
      eligibleByLevel,
      cooldownDays: row.cooldownDays,
      isOnCooldown: onCooldown,
      nextAvailableAt: nextAvailableAt?.toISOString() ?? null,
      status,
      items: (itemsByInstanceId.get(row.id) ?? []).map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        divinePrideId: item.divinePrideId,
      })),
    };
  });
}

async function getFarmInstanceById(instanceId: number) {
  const rows = await prisma.$queryRawUnsafe<RawInstanceRow[]>(
    `
      SELECT
        "id",
        "name",
        "minimumLevel",
        "cooldownDays"
      FROM "Instance"
      WHERE "id" = ?
    `,
    instanceId,
  );

  if (rows.length === 0) {
    throw new FarmInstanceNotFoundError();
  }

  const itemRows = await prisma.$queryRawUnsafe<RawInstanceItemRow[]>(
    `
      SELECT
        ii."instanceId" AS "instanceId",
        item."id" AS "itemId",
        item."name" AS "itemName",
        item."divinePrideId" AS "divinePrideId"
      FROM "InstanceItem" ii
      INNER JOIN "Item" item ON item."id" = ii."itemId"
      WHERE ii."instanceId" = ?
      ORDER BY item."name" ASC
    `,
    instanceId,
  );

  return {
    ...rows[0],
    items: itemRows.map((itemRow) => ({
      itemId: itemRow.itemId,
      itemName: itemRow.itemName,
      divinePrideId: itemRow.divinePrideId,
    })),
  };
}

async function getLatestFarmRun(characterId: number, instanceId: number) {
  const rows = await prisma.$queryRawUnsafe<RawLatestRunRow[]>(
    `
      SELECT
        "instanceId",
        "executedAt",
        "nextAvailableAt"
      FROM "FarmRun"
      WHERE "characterId" = ? AND "instanceId" = ?
      ORDER BY "id" DESC
      LIMIT 1
    `,
    characterId,
    instanceId,
  );

  return rows[0] ?? null;
}

async function getFarmHistoryRunById(db: DatabaseExecutor, farmRunId: number) {
  const rows = await db.$queryRawUnsafe<RawHistoryRunRow[]>(
    `
      SELECT
        fr."id" AS "id",
        fr."instanceId" AS "instanceId",
        i."name" AS "instanceName",
        fr."executedAt" AS "executedAt",
        fr."operationalDate" AS "operationalDate",
        fr."nextAvailableAt" AS "nextAvailableAt"
      FROM "FarmRun" fr
      INNER JOIN "Instance" i ON i."id" = fr."instanceId"
      WHERE fr."id" = ?
    `,
    farmRunId,
  );

  const [farmRun] = await hydrateFarmHistory(db, rows);

  if (!farmRun) {
    throw new Error("Farm run not found after creation.");
  }

  return farmRun;
}

async function hydrateFarmHistory(db: DatabaseExecutor, rows: RawHistoryRunRow[]) {
  if (rows.length === 0) {
    return [];
  }

  const runIds = rows.map((row) => row.id);
  const placeholders = runIds.map(() => "?").join(", ");
  const dropRows = await db.$queryRawUnsafe<RawHistoryDropRow[]>(
    `
      SELECT
        fri."farmRunId" AS "farmRunId",
        item."id" AS "itemId",
        item."name" AS "itemName",
        item."divinePrideId" AS "divinePrideId",
        fri."quantity" AS "quantity"
      FROM "FarmRunItem" fri
      INNER JOIN "Item" item ON item."id" = fri."itemId"
      WHERE fri."farmRunId" IN (${placeholders})
      ORDER BY item."name" ASC
    `,
    ...runIds,
  );

  const dropsByRunId = new Map<number, RawHistoryDropRow[]>();

  for (const dropRow of dropRows) {
    const currentDrops = dropsByRunId.get(dropRow.farmRunId) ?? [];
    currentDrops.push(dropRow);
    dropsByRunId.set(dropRow.farmRunId, currentDrops);
  }

  return rows.map((row) => {
    const drops = (dropsByRunId.get(row.id) ?? []).map((drop) => ({
      itemId: drop.itemId,
      itemName: drop.itemName,
      divinePrideId: drop.divinePrideId,
      quantity: drop.quantity,
    }));

    return {
      id: row.id,
      instanceId: row.instanceId,
      instanceName: row.instanceName,
      executedAt: parseDateValue(row.executedAt)?.toISOString() ?? String(row.executedAt),
      operationalDate: row.operationalDate,
      nextAvailableAt: parseDateValue(row.nextAvailableAt)?.toISOString() ?? null,
      drops,
      totalDropTypes: drops.length,
      totalQuantity: drops.reduce((sum, drop) => sum + drop.quantity, 0),
    };
  });
}

function mapCharacterRow(row: RawCharacterRow) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    classId: row.classId,
    classLabel: getCharacterClassLabel(row.classId),
  };
}

function parseDateValue(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function areAllDropsValid(
  items: Array<{ itemId: number }>,
  drops: FarmRunInput["drops"],
) {
  const allowedItemIds = new Set(items.map((item) => item.itemId));

  return drops.every((drop) => allowedItemIds.has(drop.itemId));
}
