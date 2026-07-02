import { ZodError } from "zod";

import { createItem, DuplicateItemNameError, listItems } from "@/features/items/item-service";
import { itemInputSchema, normalizeItemQuery } from "@/features/items/item-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeItemQuery({
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    const items = await listItems(query);

    return Response.json({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = itemInputSchema.parse(json);
    const item = await createItem(input);

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
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

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
