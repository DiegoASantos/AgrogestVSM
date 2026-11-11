import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerModule } from "@nestjs/throttler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthService } from "../modules/auth/application/auth.service";
import { AuthController } from "../modules/auth/presentation/auth.controller";
import { LoginThrottlerGuard } from "../modules/auth/presentation/guards/login-throttler.guard";
import { LoginThrottlerStorage } from "../modules/auth/infrastructure/login-throttler.storage";

@Module({
  imports: [ThrottlerModule.forRoot({ storage: new LoginThrottlerStorage(), throttlers: [{ ttl: 60_000, limit: 5, blockDuration: 60_000 }] })],
  controllers: [AuthController],
  providers: [LoginThrottlerGuard, { provide: AuthService, useValue: { login: () => ({ ok: true }) } }]
})
class TestModule {}

describe("login limits over HTTP", () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter({ trustProxy: "192.0.2.10" }), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => { await app.close(); });

  async function login(ip: string, email: string, forwarded?: string) {
    return app.inject({ method: "POST", url: "/auth/login", remoteAddress: ip,
      headers: forwarded ? { "x-forwarded-for": forwarded } : {},
      payload: { email, password: "test" } });
  }

  it("isolates a normalized user and client IP and returns Retry-After", async () => {
    for (let i = 0; i < 5; i++) expect((await login("198.51.100.1", "USER@example.test")).statusCode).toBe(200);
    const blocked = await login("198.51.100.1", " user@example.test ");
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect((await login("198.51.100.1", "other@example.test")).statusCode).toBe(200);
    expect((await login("198.51.100.2", "user@example.test")).statusCode).toBe(200);
  });

  it("limits attempts using varied accounts on one IP", async () => {
    for (let i = 0; i < 30; i++) expect((await login("198.51.100.3", `user${i}@example.test`)).statusCode).toBe(200);
    expect((await login("198.51.100.3", "another@example.test")).statusCode).toBe(429);
  });

  it("only trusts forwarded IPs from the configured proxy", async () => {
    for (let i = 0; i < 5; i++) expect((await login("198.51.100.4", "direct@example.test", `203.0.113.${i + 1}`)).statusCode).toBe(200);
    expect((await login("198.51.100.4", "direct@example.test", "203.0.113.9")).statusCode).toBe(429);
    for (let i = 0; i < 5; i++) expect((await login("192.0.2.10", "proxy@example.test", "203.0.113.10")).statusCode).toBe(200);
    expect((await login("192.0.2.10", "proxy@example.test", "203.0.113.10")).statusCode).toBe(429);
    expect((await login("192.0.2.10", "proxy@example.test", "203.0.113.11")).statusCode).toBe(200);
  });
});
