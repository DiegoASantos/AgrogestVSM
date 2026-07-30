import { Module } from "@nestjs/common";
import { ClimaService } from "./application/clima.service";
import { MobileClimaService } from "./application/mobile-clima.service";
import { ClimaController } from "./presentation/clima.controller";
import { MobileClimaController } from "./presentation/mobile-clima.controller";

@Module({
  controllers: [ClimaController, MobileClimaController],
  providers: [ClimaService, MobileClimaService]
})
export class ClimaModule {}
