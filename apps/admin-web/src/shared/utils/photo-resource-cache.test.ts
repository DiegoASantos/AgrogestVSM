import { afterEach, describe, expect, it, vi } from "vitest";
import { createPhotoResourceCache } from "./photo-resource-cache";

const photo = (id: string) => ({ id, createdAt: "2026-10-19T12:00:00Z" });
afterEach(() => vi.restoreAllMocks());

describe("private gallery resources", () => {
  it("shares thumbnail/viewer downloads and revokes URLs when closed", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const load = vi.fn().mockResolvedValue("blob:photo-1");
    const cache = createPhotoResourceCache(load);
    const first = cache.get(photo("1"));
    expect(cache.get(photo("1"))).toBe(first);
    await first;
    expect(load).toHaveBeenCalledTimes(1);
    cache.dispose();
    expect(revoke).toHaveBeenCalledWith("blob:photo-1");
  });

  it("limits downloads and discards queued and late responses after closing", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const resolvers: Array<(url: string) => void> = [];
    const load = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)));
    const cache = createPhotoResourceCache(load);
    const requests = ["1", "2", "3", "4"].map((id) => cache.get(photo(id)));
    const finished = Promise.allSettled(requests);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    cache.dispose();
    resolvers.forEach((resolve, index) => resolve(`blob:late-${index}`));
    expect((await finished).every((result) => result.status === "rejected")).toBe(true);
    expect(load).toHaveBeenCalledTimes(3);
    expect(revoke).toHaveBeenCalledTimes(3);
    await expect(cache.get(photo("5"))).rejects.toThrow("galería se cerró");
  });

  it("allows retry after a failed download or invalid preview", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("blob:broken")
      .mockResolvedValueOnce("blob:valid");
    const cache = createPhotoResourceCache(load);
    await expect(cache.get(photo("1"))).rejects.toThrow("offline");
    await expect(cache.get(photo("1"))).resolves.toBe("blob:broken");
    cache.invalidate(photo("1"));
    await expect(cache.get(photo("1"))).resolves.toBe("blob:valid");
    expect(revoke).toHaveBeenCalledWith("blob:broken");
    cache.dispose();
  });
});
