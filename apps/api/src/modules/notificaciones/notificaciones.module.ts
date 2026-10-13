import { Module } from "@nestjs/common";

import { NotificacionesService } from "./application/notificaciones.service";
import { NotificacionesController } from "./presentation/notificaciones.controller";

@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService]
})
export class NotificacionesModule {}
