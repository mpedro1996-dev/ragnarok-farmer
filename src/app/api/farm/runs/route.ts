import { z, ZodError } from "zod";

import {
  createFarmRun,
  FarmCharacterNotFoundError,
  FarmInstanceCooldownError,
  FarmInstanceItemMismatchError,
  FarmInstanceLevelError,
  FarmInstanceNotFoundError,
  listFarmHistory,
} from "@/features/farm/farm-service";
import { farmRunInputSchema } from "@/features/farm/farm-schema";

const characterIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = characterIdSchema.parse(searchParams.get("characterId"));
    const runs = await listFarmHistory(characterId);

    return Response.json({ runs });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = farmRunInputSchema.parse(json);
    const run = await createFarmRun(input);

    return Response.json({ run }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Invalid farm payload.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    error instanceof FarmInstanceCooldownError ||
    error instanceof FarmInstanceItemMismatchError ||
    error instanceof FarmInstanceLevelError
  ) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  if (
    error instanceof FarmCharacterNotFoundError ||
    error instanceof FarmInstanceNotFoundError
  ) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
