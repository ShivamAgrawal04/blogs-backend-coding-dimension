import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret12' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  /** Preset avatar id 1–20. If omitted, a random preset is assigned. */
  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  avatarId?: number;

  /** Optional custom https image URL (overrides avatarId). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^https:\/\//i, { message: 'image must be an https URL' })
  @MaxLength(500)
  image?: string;
}
