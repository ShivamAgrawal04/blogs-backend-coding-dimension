import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleLikeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blogId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentId?: string;

  /** LIKE (default) or DISLIKE for future reaction UI */
  @ApiPropertyOptional({ enum: ['LIKE', 'DISLIKE'], default: 'LIKE' })
  @IsOptional()
  @IsEnum(['LIKE', 'DISLIKE'] as const)
  type?: 'LIKE' | 'DISLIKE';
}
