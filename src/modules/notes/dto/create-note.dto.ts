import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsNumber } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ example: 'Arrays and Linked Lists' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'Full content of the note...' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({ example: 'clrh0y7ig0000lbh5t4wz9v8u' })
  @IsString()
  subjectId!: string;

  @ApiPropertyOptional({ example: 'A note covering arrays and linked lists' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '10 min read' })
  @IsOptional()
  @IsString()
  readTime?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'Arrays SEO title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Learn arrays for interviews' })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}
