import { z, ZodError } from "zod";

import {
  deleteInstance,
  InstanceInUseError,
  DuplicateInstanceNameError,
  InstanceNotFoundError,
  InvalidInstanceItemsError,
  updateInstance,
} from "@/features/instances/instance-service";
import { instanceInputSchema } from "@/features/instances/instance-schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const instanceIdSchema = z.coerce.number().int().positive();

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const instanceId = parseInstanceId(id);
    const json = await request.json();
    const input = instanceInputSchema.parse(json);
    const instance = await updateInstance(instanceId, input);

    return Response.json({ instance });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const instanceId = parseInstanceId(id);

    await deleteInstance(instanceId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}

function parseInstanceId(id: string) {
  return instanceIdSchema.parse(id);
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
    error instanceof InstanceInUseError ||
    error instanceof DuplicateInstanceNameError ||
    error instanceof InvalidInstanceItemsError
  ) {
    return Response.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof InstanceNotFoundError) {
    return Response.json({ message: error.message }, { status: 404 });
  }

  console.error(error);

  return Response.json({ message: "Unexpected server error." }, { status: 500 });
}
