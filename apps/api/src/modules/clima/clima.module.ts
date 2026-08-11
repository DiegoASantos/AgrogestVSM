import { Module } from "@nestjs/common";
import { ClimaService } from "./application/clima.service";
import { MobileClimaService } from "./application/mobile-clima.service";
import { ClimaController } from "./presentation/clima.controller";
import { MobileClimaController } from "./presentation/mobile-clima.controller";
import { WeatherLinkSyncService } from "./application/weatherlink-sync.service";
import { WeatherLinkClient } from "./infrastructure/weatherlink/weatherlink.client";

@Module({
  controllers: [ClimaController, MobileClimaController],
  providers: [ClimaService, MobileClimaService, WeatherLinkClient, WeatherLinkSyncService]
})
export class ClimaModule {}
