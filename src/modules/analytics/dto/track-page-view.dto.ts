import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackPageViewDto {
  @ApiProperty({ example: '/blog/my-post' })
  @IsString()
  path!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
