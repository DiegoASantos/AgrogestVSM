import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseEntityIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const normalizedValue = String(value ?? "").trim();

    if (!/^[1-9]\d*$/.test(normalizedValue)) {
      throw new BadRequestException("Entity id must be a positive integer.");
    }

    return normalizedValue;
  }
}
