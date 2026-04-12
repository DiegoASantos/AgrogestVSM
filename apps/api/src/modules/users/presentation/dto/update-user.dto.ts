import { PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MinLength } from "class-validator";

import { trimOptionalString } from "../../../../common/utils/string-normalizers.util";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @Transform(({ value }) => trimOptionalString(value) ?? undefined)
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
