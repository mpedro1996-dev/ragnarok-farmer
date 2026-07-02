import { ZodError } from "zod";

import {
  createInstance,
  DuplicateInstanceNameError,
  InvalidInstanceItemsError,
  listInstances,
} from "@/features/instances/instance-service";
import {
  instanceInputSchema,
  normalizeInstanceQuery,
} from "@/features/instances/instance-schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeInstanceQuery({
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    const instances = await listInstances(query);

    return Response.json({ instances });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = instanceInputSchema.parse(json);
    const instance = await createInstance(input);

    return Response.json({ instance }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Invalid instance payload.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    error instanceof DuplicateInstanceNameError ||
    error instanceof InvalidInstanceItemsError
  ) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
