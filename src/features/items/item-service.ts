import "server-only";

import { Prisma } from "@prisma/client";

import { ensureDatabaseSchema } from "@/lib/database";
import { prisma } from "@/lib/prisma";

import type { ItemInput, ItemQuery } from "./item-schema";

export class DuplicateItemNameError extends Error {
  constructor() {
    super("An item with this name already exists.");
    this.name = "DuplicateItemNameError";
  }
}

export class ItemNotFoundError extends Error {
  constructor() {
    super("Item not found.");
    this.name = "ItemNotFoundError";
  }
}

export class ItemInUseError extends Error {
  constructor() {
    super("This item is linked to one or more instances or farm records.");
    this.name = "ItemInUseError";
  }
}

export async function listItems(query: ItemQuery) {
  await ensureDatabaseSchema();
  const search = query.search.trim();

  return prisma.item.findMany({
    where: search
      ? {
          name: {
            contains: search,
          },
        }
      : undefined,
    orderBy: {
      [query.sortBy]: query.sortOrder,
    },
  });
}

export async function createItem(input: ItemInput) {
  await ensureDatabaseSchema();
  try {
    return await prisma.item.create({
      data: input,
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateItem(id: number, input: ItemInput) {
  await ensureDatabaseSchema();
  try {
    return await prisma.item.update({
      where: { id },
      data: input,
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteItem(id: number) {
  await ensureDatabaseSchema();

  const [usageRow] = await prisma.$queryRawUnsafe<
    Array<{ count: number | bigint }>
  >(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM "InstanceItem"
          WHERE "itemId" = ?
        ) +
        (
          SELECT COUNT(*)
          FROM "FarmRunItem"
          WHERE "itemId" = ?
        ) AS "count"
    `,
    id,
    id,
  );

  const itemUsageCount = Number(usageRow?.count ?? 0);

  if (itemUsageCount > 0) {
    throw new ItemInUseError();
  }

  try {
    await prisma.item.delete({
      where: { id },
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new DuplicateItemNameError();
    }

    if (error.code === "P2025") {
      return new ItemNotFoundError();
    }
  }

  return error;
}
