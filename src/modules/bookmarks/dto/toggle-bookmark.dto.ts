import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleBookmarkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blogId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteId?: string;
}
