import { ZodError } from "zod";

import {
  FarmCharacterNotFoundError,
  listFarmOperation,
} from "@/features/farm/farm-service";
import { normalizeFarmQuery } from "@/features/farm/farm-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeFarmQuery({
      characterId: searchParams.get("characterId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const payload = await listFarmOperation(query);

    return Response.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Invalid farm query.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof FarmCharacterNotFoundError) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
