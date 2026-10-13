import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

describe("commercial photo multipart transport", () => {
  it("accepts one bounded file and rejects an oversized one", async () => {
    const app = Fastify();
    await app.register(multipart as unknown as Parameters<typeof app.register>[0], {
      limits: { files: 1, fields: 0, parts: 1, fileSize: 10 }
    });
    app.post("/photo", async (request, reply) => {
      try {
        const part = await request.file();
        return { size: (await part!.toBuffer()).length };
      } catch {
        return reply.code(413).send({ error: "too large" });
      }
    });
    const payload = (content: string) => Buffer.from(
      `--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n${content}\r\n--test-boundary--\r\n`
    );
    const headers = { "content-type": "multipart/form-data; boundary=test-boundary" };
    try {
      const accepted = await app.inject({ method: "POST", url: "/photo", headers, payload: payload("photo") });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json()).toEqual({ size: 5 });
      const rejected = await app.inject({ method: "POST", url: "/photo", headers, payload: payload("a".repeat(11)) });
      expect(rejected.statusCode).toBe(413);
    } finally {
      await app.close();
    }
  });
});
