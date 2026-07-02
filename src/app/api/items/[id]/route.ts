import { z, ZodError } from "zod";

import {
  deleteItem,
  DuplicateItemNameError,
  ItemInUseError,
  ItemNotFoundError,
  updateItem,
} from "@/features/items/item-service";
import { itemInputSchema } from "@/features/items/item-schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const itemIdSchema = z.coerce.number().int().positive();

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = parseItemId(id);
    const json = await request.json();
    const input = itemInputSchema.parse(json);
    const item = await updateItem(itemId, input);

    return Response.json({ item });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = parseItemId(id);

    await deleteItem(itemId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function parseItemId(id: string) {
  return itemIdSchema.parse(id);
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Invalid item payload.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof DuplicateItemNameError) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof ItemInUseError) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof ItemNotFoundError) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
