import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { AuthenticatedRequest } from "../../types/auth.types";

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user
);
