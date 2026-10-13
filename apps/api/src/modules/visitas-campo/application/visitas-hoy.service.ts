import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";

type CurrentUser = { userId: string; roles: string[] };
@Injectable()
export class VisitasHoyService {
  constructor(private readonly dataSource: DataSource) {}

  async findByParcela(parcelaId: string, user: CurrentUser) {
    const parcelas = await this.dataSource.query(
      "SELECT id FROM parcelas WHERE id = $1 AND agronomo_usuario_id = $2 AND activo = true",
      [parcelaId, user.userId]
    ) as Array<{ id: string }>;
    if (parcelas.length === 0) {
      throw new NotFoundException("Parcela not found.");
    }

    const rows = await this.dataSource.query(
      `SELECT 1
       FROM visitas_campo
       WHERE parcela_id = $1 AND activo = true
         AND fecha_visita = (now() AT TIME ZONE 'America/Lima')::date
       LIMIT 1`,
      [parcelaId]
    ) as unknown[];

    return createSuccessResponse({ exists: rows.length > 0 });
  }
}
