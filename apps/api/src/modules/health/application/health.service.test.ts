import { ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfigService } from "../../../config/app-config.service";
import { HealthService } from "./health.service";

function makeConfig(): AppConfigService {
  return { appName: "AgroGest API", nodeEnv: "test", database: { type: "postgres" }, isDevelopment: false } as unknown as AppConfigService;
}

describe("HealthService", () => {
  let service: HealthService;
  let dataSource: { query: ReturnType<typeof vi.fn>; isInitialized: boolean };
  beforeEach(() => { vi.clearAllMocks(); dataSource = { query: vi.fn(), isInitialized: true }; service = new HealthService(makeConfig(), dataSource as unknown as DataSource); });

  describe("#getStatus", () => {
    it("should return service status with deployment info", () => {
      const result = service.getStatus();
      expect(result.success).toBe(true);
      expect(result.data.status).toBe("ok");
      expect(result.data.service).toBe("AgroGest API");
      expect(result.data.environment).toBe("test");
    });
  });

  describe("#getDatabaseStatus", () => {
    it("should return database status with PostGIS version", async () => {
      dataSource.query.mockResolvedValue([{ postgisVersion: "3.4.0" }]);
      const result = await service.getDatabaseStatus();
      expect(result.data.database.status).toBe("up");
      expect(result.data.database.postgisVersion).toBe("3.4.0");
    });

    it("should throw ServiceUnavailableException when data source not initialized", async () => {
      dataSource.isInitialized = false;
      await expect(service.getDatabaseStatus()).rejects.toThrow(ServiceUnavailableException);
    });

    it("should throw ServiceUnavailableException when query fails", async () => {
      dataSource.query.mockRejectedValue(new Error("Connection refused"));
      await expect(service.getDatabaseStatus()).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
