import "server-only";

import { ensureDatabaseSchema } from "@/lib/database";
import { prisma } from "@/lib/prisma";

import { getCharacterClassLabel } from "@/features/characters/character-classes";
import { getOperationalDate } from "@/features/farm/farm-time";

import type { ReportQuery } from "./report-schema";

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
};

type RawReportRow = {
  itemId: number;
  itemName: string;
  divinePrideId: number | null;
  averageZenny: number;
  isSoldToNpc: boolean | number | bigint;
  totalQuantity: number | bigint;
};

export class ReportCharacterFilterNotFoundError extends Error {
  constructor() {
    super("Um ou mais personagens selecionados não existem.");
    this.name = "ReportCharacterFilterNotFoundError";
  }
}

export class ReportInstanceFilterNotFoundError extends Error {
  constructor() {
    super("Uma ou mais instâncias selecionadas não existem.");
    this.name = "ReportInstanceFilterNotFoundError";
  }
}

export async function getFarmReport(query: ReportQuery) {
  await ensureDatabaseSchema();

  const [characters, instances] = await Promise.all([
    listReportCharacters(),
    listReportInstances(),
  ]);

  const selectedCharacterIds = resolveSelectedIds(
    query.characterIds,
    characters.map((character) => character.id),
    ReportCharacterFilterNotFoundError,
  );
  const selectedInstanceIds = resolveSelectedIds(
    query.instanceIds,
    instances.map((instance) => instance.id),
    ReportInstanceFilterNotFoundError,
  );

  const appliedWindow = resolveAppliedDateWindow(query);

  if (selectedCharacterIds.length === 0 || selectedInstanceIds.length === 0) {
    return {
      filters: {
        characters,
        instances,
      },
      appliedFilters: {
        dateMode: appliedWindow.dateMode,
        day: appliedWindow.day,
        startDate: appliedWindow.startDate,
        endDate: appliedWindow.endDate,
        characterIds: selectedCharacterIds,
        instanceIds: selectedInstanceIds,
      },
      rows: [],
      totals: {
        totalItemTypes: 0,
        totalQuantity: 0,
        totalValue: 0,
        totalOverchargeValue: 0,
      },
    };
  }

  const rows = await listAggregatedRows(
    appliedWindow.startDate,
    appliedWindow.endDate,
    selectedCharacterIds,
    selectedInstanceIds,
  );

  const totals = rows.reduce(
    (accumulator, row) => ({
      totalItemTypes: accumulator.totalItemTypes + 1,
      totalQuantity: accumulator.totalQuantity + row.totalQuantity,
      totalValue: accumulator.totalValue + row.totalValue,
      totalOverchargeValue:
        accumulator.totalOverchargeValue + (row.overchargeTotalValue ?? 0),
    }),
    {
      totalItemTypes: 0,
      totalQuantity: 0,
      totalValue: 0,
      totalOverchargeValue: 0,
    },
  );

  return {
    filters: {
      characters,
      instances,
    },
    appliedFilters: {
      dateMode: appliedWindow.dateMode,
      day: appliedWindow.day,
      startDate: appliedWindow.startDate,
      endDate: appliedWindow.endDate,
      characterIds: selectedCharacterIds,
      instanceIds: selectedInstanceIds,
    },
    rows,
    totals,
  };
}

async function listReportCharacters() {
  const rows = await prisma.$queryRawUnsafe<RawCharacterRow[]>(`
    SELECT
      "id",
      "name",
      "level",
      "classId"
    FROM "Character"
    ORDER BY "name" ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    classId: row.classId,
    classLabel: getCharacterClassLabel(row.classId),
  }));
}

async function listReportInstances() {
  return prisma.$queryRawUnsafe<RawInstanceRow[]>(`
    SELECT
      "id",
      "name",
      "minimumLevel"
    FROM "Instance"
    ORDER BY "name" ASC
  `);
}

async function listAggregatedRows(
  startDate: string,
  endDate: string,
  characterIds: number[],
  instanceIds: number[],
) {
  const characterPlaceholders = characterIds.map(() => "?").join(", ");
  const instancePlaceholders = instanceIds.map(() => "?").join(", ");

  const rows = await prisma.$queryRawUnsafe<RawReportRow[]>(
    `
      SELECT
        item."id" AS "itemId",
        item."name" AS "itemName",
        item."divinePrideId" AS "divinePrideId",
        item."averageZenny" AS "averageZenny",
        item."isSoldToNpc" AS "isSoldToNpc",
        SUM(fri."quantity") AS "totalQuantity"
      FROM "FarmRun" fr
      INNER JOIN "FarmRunItem" fri ON fri."farmRunId" = fr."id"
      INNER JOIN "Item" item ON item."id" = fri."itemId"
      WHERE fr."operationalDate" >= ?
        AND fr."operationalDate" <= ?
        AND fr."characterId" IN (${characterPlaceholders})
        AND fr."instanceId" IN (${instancePlaceholders})
      GROUP BY
        item."id",
        item."name",
        item."divinePrideId",
        item."averageZenny",
        item."isSoldToNpc"
      ORDER BY item."name" ASC
    `,
    startDate,
    endDate,
    ...characterIds,
    ...instanceIds,
  );

  return rows.map((row) => {
    const averageZenny = Number(row.averageZenny);
    const totalQuantity = Number(row.totalQuantity);
    const isSoldToNpc = normalizeBoolean(row.isSoldToNpc);
    const totalValue = averageZenny * totalQuantity;
    const overchargeUnitValue = isSoldToNpc ? Math.floor(averageZenny * 1.24) : null;
    const overchargeTotalValue =
      overchargeUnitValue !== null ? overchargeUnitValue * totalQuantity : null;

    return {
      itemId: row.itemId,
      itemName: row.itemName,
      divinePrideId: row.divinePrideId,
      averageZenny,
      isSoldToNpc,
      totalQuantity,
      totalValue,
      overchargeTotalValue,
    };
  });
}

function resolveAppliedDateWindow(query: ReportQuery) {
  if (query.dateMode === "range") {
    return {
      dateMode: "range" as const,
      day: null,
      startDate: query.startDate as string,
      endDate: query.endDate as string,
    };
  }

  const day = query.day ?? getOperationalDate(new Date());

  return {
    dateMode: "daily" as const,
    day,
    startDate: day,
    endDate: day,
  };
}

function resolveSelectedIds<TError extends Error>(
  explicitIds: number[] | undefined,
  availableIds: number[],
  ErrorType: new () => TError,
) {
  if (!explicitIds) {
    return [...availableIds];
  }

  const availableIdsSet = new Set(availableIds);
  const missingIds = explicitIds.filter((id) => !availableIdsSet.has(id));

  if (missingIds.length > 0) {
    throw new ErrorType();
  }

  return explicitIds;
}

function normalizeBoolean(value: boolean | number | bigint) {
  return value === true || Number(value) === 1;
}
