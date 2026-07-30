import { Module } from '@nestjs/common';
import { ClimaService } from './application/clima.service';
import { ClimaController } from './presentation/clima.controller';
@Module({ controllers: [ClimaController], providers: [ClimaService] })
export class ClimaModule {}
