import { describe, expect, it, vi } from "vitest";

import { UserRolesService } from "./user-roles.service";

describe("UserRolesService visit deletion permission", () => {
  it("revokes the permission when the AGRONOMO role is removed", async () => {
    const userRole = {
      userId: "user-1",
      roleId: 2,
      user: {
        id: "user-1",
        publicId: "public-1",
        firstName: "Ana",
        lastName: "Campo",
        email: "ana@example.test",
        isActive: true
      },
      role: {
        id: 2,
        code: "AGRONOMO",
        name: "Agronomo",
        description: null
      }
    };
    const userRolesRepository = {
      findOne: vi.fn().mockResolvedValue(userRole)
    };
    const transactionalRepository = {
      remove: vi.fn().mockResolvedValue(userRole),
      update: vi.fn().mockResolvedValue({ affected: 1 })
    };
    const dataSource = {
      transaction: vi.fn(async (work: (manager: unknown) => Promise<unknown>) =>
        work({
          getRepository: () => transactionalRepository
        })
      )
    };
    const service = new UserRolesService(
      userRolesRepository as never,
      dataSource as never,
      {} as never,
      {} as never
    );

    await service.removeAdmin("user-1", "2");

    expect(transactionalRepository.remove).toHaveBeenCalledWith(userRole);
    expect(transactionalRepository.update).toHaveBeenCalledWith("user-1", {
      canDeleteVisits: false
    });
  });
});
