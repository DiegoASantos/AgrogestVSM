import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateWeatherLinkStationDto {
  @ApiProperty({
    description: "Indica si la estacion participa en la sincronizacion WeatherLink.",
    example: true
  })
  @IsBoolean()
  isActive!: boolean;
}
