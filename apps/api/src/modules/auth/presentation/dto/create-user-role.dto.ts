import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

import { trimRequiredString } from "../../../../common/utils/string-normalizers.util";

export class CreateUserRoleDto {
  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "userId must be a positive integer."
  })
  userId!: string;

  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "roleId must be a positive integer."
  })
  roleId!: string;
}
