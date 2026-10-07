import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";

@Injectable()
export class ProducerCodeThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    const body = request.body as { code?: unknown } | undefined;
    const code =
      typeof body?.code === "string"
        ? body.code.trim().toUpperCase().replace(/-/g, "")
        : "";
    return createHash("sha256").update(code).digest("hex");
  }
}
