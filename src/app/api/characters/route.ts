import { ZodError } from "zod";

import {
  createCharacter,
  DuplicateCharacterNameError,
  InvalidCharacterClassError,
  listCharacters,
} from "@/features/characters/character-service";
import {
  characterInputSchema,
  normalizeCharacterQuery,
} from "@/features/characters/character-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeCharacterQuery({
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    const characters = await listCharacters(query);

    return Response.json({ characters });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = characterInputSchema.parse(json);
    const character = await createCharacter(input);

    return Response.json({ character }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Invalid character payload.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    error instanceof DuplicateCharacterNameError ||
    error instanceof InvalidCharacterClassError
  ) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
