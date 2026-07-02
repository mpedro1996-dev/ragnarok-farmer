import "server-only";

import { Prisma } from "@prisma/client";

import { ensureDatabaseSchema } from "@/lib/database";
import { prisma } from "@/lib/prisma";

import { getCharacterClassLabel, isCharacterClassId } from "./character-classes";
import type {
  CharacterInput,
  CharacterQuery,
  CharacterSortBy,
} from "./character-schema";

type RawCharacterRow = {
  id: number;
  name: string;
  level: number;
  classId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const characterSortColumnMap: Record<CharacterSortBy, string> = {
  name: "name",
  level: "level",
  classId: "classId",
};

export class DuplicateCharacterNameError extends Error {
  constructor() {
    super("A character with this name already exists.");
    this.name = "DuplicateCharacterNameError";
  }
}

export class CharacterNotFoundError extends Error {
  constructor() {
    super("Character not found.");
    this.name = "CharacterNotFoundError";
  }
}

export class CharacterInUseError extends Error {
  constructor() {
    super("This character is linked to one or more farm runs.");
    this.name = "CharacterInUseError";
  }
}

export class InvalidCharacterClassError extends Error {
  constructor() {
    super("The selected class is invalid.");
    this.name = "InvalidCharacterClassError";
  }
}

export async function listCharacters(query: CharacterQuery) {
  await ensureDatabaseSchema();
  const search = query.search.trim();
  const orderByColumn = characterSortColumnMap[query.sortBy];
  const sortDirection = query.sortOrder.toUpperCase();

  const rows = search
    ? await prisma.$queryRawUnsafe<RawCharacterRow[]>(
        `
          SELECT
            "id",
            "name",
            "level",
            "classId",
            "createdAt",
            "updatedAt"
          FROM "Character"
          WHERE "name" LIKE ?
          ORDER BY "${orderByColumn}" ${sortDirection}
        `,
        `%${search}%`,
      )
    : await prisma.$queryRawUnsafe<RawCharacterRow[]>(`
        SELECT
          "id",
          "name",
          "level",
          "classId",
          "createdAt",
          "updatedAt"
        FROM "Character"
        ORDER BY "${orderByColumn}" ${sortDirection}
      `);

  return rows.map(mapCharacterRow);
}

export async function createCharacter(input: CharacterInput) {
  await ensureDatabaseSchema();
  assertCharacterClassExists(input.classId);

  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Character" (
          "name",
          "level",
          "classId"
        ) VALUES (?, ?, ?)
      `,
      input.name,
      input.level,
      input.classId,
    );

    const [insertedRow] = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT last_insert_rowid() AS "id"`,
    );

    const characterId = Number(insertedRow?.id);

    if (!characterId) {
      throw new CharacterNotFoundError();
    }

    return getCharacterById(characterId);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateCharacter(id: number, input: CharacterInput) {
  await ensureDatabaseSchema();
  assertCharacterClassExists(input.classId);

  try {
    const updatedRows = await prisma.$executeRawUnsafe(
      `
        UPDATE "Character"
        SET
          "name" = ?,
          "level" = ?,
          "classId" = ?,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ?
      `,
      input.name,
      input.level,
      input.classId,
      id,
    );

    if (updatedRows === 0) {
      throw new CharacterNotFoundError();
    }

    return getCharacterById(id);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteCharacter(id: number) {
  await ensureDatabaseSchema();

  try {
    const [usageRow] = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      `
        SELECT COUNT(*) AS "count"
        FROM "FarmRun"
        WHERE "characterId" = ?
      `,
      id,
    );

    if (Number(usageRow?.count ?? 0) > 0) {
      throw new CharacterInUseError();
    }

    const deletedRows = await prisma.$executeRawUnsafe(
      `DELETE FROM "Character" WHERE "id" = ?`,
      id,
    );

    if (deletedRows === 0) {
      throw new CharacterNotFoundError();
    }
  } catch (error) {
    throw mapPrismaError(error);
  }
}

async function getCharacterById(id: number) {
  const rows = await prisma.$queryRawUnsafe<RawCharacterRow[]>(
    `
      SELECT
        "id",
        "name",
        "level",
        "classId",
        "createdAt",
        "updatedAt"
      FROM "Character"
      WHERE "id" = ?
    `,
    id,
  );

  if (rows.length === 0) {
    throw new CharacterNotFoundError();
  }

  return mapCharacterRow(rows[0]);
}

function mapCharacterRow(row: RawCharacterRow) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    classId: row.classId,
    classLabel: getCharacterClassLabel(row.classId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertCharacterClassExists(classId: number) {
  if (!isCharacterClassId(classId)) {
    throw new InvalidCharacterClassError();
  }
}

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new DuplicateCharacterNameError();
    }

    if (error.code === "P2025") {
      return new CharacterNotFoundError();
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new InvalidCharacterClassError();
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("unique") && normalizedMessage.includes("character.name")) {
      return new DuplicateCharacterNameError();
    }
  }

  return error;
}
