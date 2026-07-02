import "server-only";

import { Prisma } from "@prisma/client";

import { ensureDatabaseSchema } from "@/lib/database";
import { prisma } from "@/lib/prisma";

import type { InstanceInput, InstanceQuery, InstanceSortBy } from "./instance-schema";

type DatabaseExecutor = Pick<
  typeof prisma,
  "$executeRawUnsafe" | "$queryRawUnsafe"
>;

type RawInstanceRow = {
  id: number;
  name: string;
  minimumLevel: number;
  cooldownDays: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  itemCount: number | bigint;
};

type RawInstanceItemRow = {
  instanceId: number;
  id: number;
  name: string;
  divinePrideId: number | null;
};

const instanceSortColumnMap: Record<InstanceSortBy, string> = {
  name: "name",
  minimumLevel: "minimumLevel",
  cooldownDays: "cooldownDays",
};

export class DuplicateInstanceNameError extends Error {
  constructor() {
    super("An instance with this name already exists.");
    this.name = "DuplicateInstanceNameError";
  }
}

export class InstanceNotFoundError extends Error {
  constructor() {
    super("Instance not found.");
    this.name = "InstanceNotFoundError";
  }
}

export class InstanceInUseError extends Error {
  constructor() {
    super("This instance is linked to one or more farm runs.");
    this.name = "InstanceInUseError";
  }
}

export class InvalidInstanceItemsError extends Error {
  constructor() {
    super("One or more selected items do not exist.");
    this.name = "InvalidInstanceItemsError";
  }
}

export async function listInstances(query: InstanceQuery) {
  await ensureDatabaseSchema();
  const search = query.search.trim();
  const orderByColumn = instanceSortColumnMap[query.sortBy];
  const sortDirection = query.sortOrder.toUpperCase();

  const instanceRows = search
    ? await prisma.$queryRawUnsafe<RawInstanceRow[]>(
        `
          SELECT
            i."id",
            i."name",
            i."minimumLevel",
            i."cooldownDays",
            i."createdAt",
            i."updatedAt",
            COUNT(ii."itemId") AS "itemCount"
          FROM "Instance" i
          LEFT JOIN "InstanceItem" ii ON ii."instanceId" = i."id"
          WHERE i."name" LIKE ?
          GROUP BY
            i."id",
            i."name",
            i."minimumLevel",
            i."cooldownDays",
            i."createdAt",
            i."updatedAt"
          ORDER BY i."${orderByColumn}" ${sortDirection}
        `,
        `%${search}%`,
      )
    : await prisma.$queryRawUnsafe<RawInstanceRow[]>(`
        SELECT
          i."id",
          i."name",
          i."minimumLevel",
          i."cooldownDays",
          i."createdAt",
          i."updatedAt",
          COUNT(ii."itemId") AS "itemCount"
        FROM "Instance" i
        LEFT JOIN "InstanceItem" ii ON ii."instanceId" = i."id"
        GROUP BY
          i."id",
          i."name",
          i."minimumLevel",
          i."cooldownDays",
          i."createdAt",
          i."updatedAt"
        ORDER BY i."${orderByColumn}" ${sortDirection}
      `);

  return hydrateInstances(prisma, instanceRows);
}

export async function createInstance(input: InstanceInput) {
  await ensureDatabaseSchema();
  await assertItemsExist(input.itemIds);

  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "Instance" (
            "name",
            "minimumLevel",
            "cooldownDays"
          ) VALUES (?, ?, ?)
        `,
        input.name,
        input.minimumLevel,
        input.cooldownDays,
      );

      const [insertedRow] = await transaction.$queryRawUnsafe<{ id: number }[]>(
        `SELECT last_insert_rowid() AS "id"`,
      );

      const instanceId = Number(insertedRow?.id);

      if (!instanceId) {
        throw new InstanceNotFoundError();
      }

      await replaceInstanceItems(transaction, instanceId, input.itemIds);

      return getInstanceById(transaction, instanceId);
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateInstance(id: number, input: InstanceInput) {
  await ensureDatabaseSchema();
  await assertItemsExist(input.itemIds);

  try {
    return await prisma.$transaction(async (transaction) => {
      const updatedRows = await transaction.$executeRawUnsafe(
        `
          UPDATE "Instance"
          SET
            "name" = ?,
            "minimumLevel" = ?,
            "cooldownDays" = ?,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ?
        `,
        input.name,
        input.minimumLevel,
        input.cooldownDays,
        id,
      );

      if (updatedRows === 0) {
        throw new InstanceNotFoundError();
      }

      await replaceInstanceItems(transaction, id, input.itemIds);

      return getInstanceById(transaction, id);
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteInstance(id: number) {
  await ensureDatabaseSchema();

  try {
    const [usageRow] = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      `
        SELECT COUNT(*) AS "count"
        FROM "FarmRun"
        WHERE "instanceId" = ?
      `,
      id,
    );

    if (Number(usageRow?.count ?? 0) > 0) {
      throw new InstanceInUseError();
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        `DELETE FROM "InstanceItem" WHERE "instanceId" = ?`,
        id,
      );

      const deletedRows = await transaction.$executeRawUnsafe(
        `DELETE FROM "Instance" WHERE "id" = ?`,
        id,
      );

      if (deletedRows === 0) {
        throw new InstanceNotFoundError();
      }
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

async function getInstanceById(db: DatabaseExecutor, id: number) {
  const rows = await db.$queryRawUnsafe<RawInstanceRow[]>(
    `
      SELECT
        i."id",
        i."name",
        i."minimumLevel",
        i."cooldownDays",
        i."createdAt",
        i."updatedAt",
        COUNT(ii."itemId") AS "itemCount"
      FROM "Instance" i
      LEFT JOIN "InstanceItem" ii ON ii."instanceId" = i."id"
      WHERE i."id" = ?
      GROUP BY
        i."id",
        i."name",
        i."minimumLevel",
        i."cooldownDays",
        i."createdAt",
        i."updatedAt"
    `,
    id,
  );

  if (rows.length === 0) {
    throw new InstanceNotFoundError();
  }

  const [instance] = await hydrateInstances(db, rows);
  return instance;
}

async function hydrateInstances(db: DatabaseExecutor, rows: RawInstanceRow[]) {
  if (rows.length === 0) {
    return [];
  }

  const instanceIds = rows.map((row) => row.id);
  const placeholders = instanceIds.map(() => "?").join(", ");
  const itemRows = await db.$queryRawUnsafe<RawInstanceItemRow[]>(
    `
      SELECT
        ii."instanceId" AS "instanceId",
        item."id" AS "id",
        item."name" AS "name",
        item."divinePrideId" AS "divinePrideId"
      FROM "InstanceItem" ii
      INNER JOIN "Item" item ON item."id" = ii."itemId"
      WHERE ii."instanceId" IN (${placeholders})
      ORDER BY item."name" ASC
    `,
    ...instanceIds,
  );

  const itemsByInstanceId = new Map<number, RawInstanceItemRow[]>();

  for (const itemRow of itemRows) {
    const currentItems = itemsByInstanceId.get(itemRow.instanceId) ?? [];
    currentItems.push(itemRow);
    itemsByInstanceId.set(itemRow.instanceId, currentItems);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    minimumLevel: row.minimumLevel,
    cooldownDays: row.cooldownDays,
    itemCount: Number(row.itemCount),
    items: (itemsByInstanceId.get(row.id) ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      divinePrideId: item.divinePrideId,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function replaceInstanceItems(
  db: DatabaseExecutor,
  instanceId: number,
  itemIds: number[],
) {
  await db.$executeRawUnsafe(
    `DELETE FROM "InstanceItem" WHERE "instanceId" = ?`,
    instanceId,
  );

  if (itemIds.length === 0) {
    return;
  }

  const valuePlaceholders = itemIds.map(() => "(?, ?)").join(", ");
  const values = itemIds.flatMap((itemId) => [instanceId, itemId]);

  await db.$executeRawUnsafe(
    `
      INSERT INTO "InstanceItem" (
        "instanceId",
        "itemId"
      ) VALUES ${valuePlaceholders}
    `,
    ...values,
  );
}

async function assertItemsExist(itemIds: number[]) {
  if (itemIds.length === 0) {
    return;
  }

  const existingItems = await prisma.item.findMany({
    where: {
      id: {
        in: itemIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingItems.length !== itemIds.length) {
    throw new InvalidInstanceItemsError();
  }
}

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new DuplicateInstanceNameError();
    }

    if (error.code === "P2025") {
      return new InstanceNotFoundError();
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new InvalidInstanceItemsError();
  }

  return error;
}
