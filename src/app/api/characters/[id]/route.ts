import { z, ZodError } from "zod";

import {
  CharacterInUseError,
  CharacterNotFoundError,
  deleteCharacter,
  DuplicateCharacterNameError,
  InvalidCharacterClassError,
  updateCharacter,
} from "@/features/characters/character-service";
import { characterInputSchema } from "@/features/characters/character-schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const characterIdSchema = z.coerce.number().int().positive();

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const characterId = parseCharacterId(id);
    const json = await request.json();
    const input = characterInputSchema.parse(json);
    const character = await updateCharacter(characterId, input);

    return Response.json({ character });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const characterId = parseCharacterId(id);

    await deleteCharacter(characterId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function parseCharacterId(id: string) {
  return characterIdSchema.parse(id);
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
    error instanceof CharacterInUseError ||
    error instanceof DuplicateCharacterNameError ||
    error instanceof InvalidCharacterClassError
  ) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof CharacterNotFoundError) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
