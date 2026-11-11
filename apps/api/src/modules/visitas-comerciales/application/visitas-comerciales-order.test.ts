import "reflect-metadata";
import { Column, DataSource, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { VisitasComercialesService } from "./visitas-comerciales.service";
import { FindVisitasComercialesQueryDto } from "../presentation/dto/find-visitas-comerciales-query.dto";

@Entity()
class TestUser {
  @PrimaryColumn({ type: "int" }) id!: number;
}

@Entity()
class TestVisit {
  @PrimaryColumn({ type: "int" }) id!: number;
  @Column({ name: "fecha_visita", type: "date" }) fechaVisita!: string;
  @ManyToOne(() => TestUser) agronomoUsuario!: TestUser;
}

describe("commercial visit pagination ordering", () => {
  it("resolves the ordering through TypeORM metadata with a joined paginated query", async () => {
    const source = new DataSource({ type: "postgres", entities: [TestVisit, TestUser] });
    await (source as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
    const repo = source.getRepository(TestVisit);
    const qb = repo.createQueryBuilder("v");
    const resolveOrder = () => (qb as unknown as {
      createOrderByCombinedWithSelectExpression(alias: string): unknown;
    }).createOrderByCombinedWithSelectExpression("distinctAlias");
    qb.orderBy("v.fecha_visita", "DESC");
    expect(resolveOrder).toThrow(TypeError);
    vi.spyOn(qb, "getManyAndCount").mockImplementation(async () => {
      resolveOrder();
      return [[], 0];
    });
    const service = new VisitasComercialesService(
      { createQueryBuilder: () => qb } as never, {} as never, {} as never
    );
    const result = await service.list(
      Object.assign(new FindVisitasComercialesQueryDto(), { page: 1, limit: 20, agronomo_usuario_id: "4" }),
      { userId: "1", roles: ["ADMIN"] } as never
    );
    expect(result.data).toEqual([]);
  });
});
