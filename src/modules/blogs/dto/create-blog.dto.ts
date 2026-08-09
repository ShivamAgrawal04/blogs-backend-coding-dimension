import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  IsEnum,
  IsBoolean,
  ArrayMaxSize,
} from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ example: 'My First Blog' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'my-first-blog' })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiProperty({ example: 'A short description of the blog' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: '<p>Full content...</p>' })
  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  content!: string;

  @ApiProperty({ example: 'Technology' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  category!: string;

  @ApiPropertyOptional({ example: '5 min read' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  readTime?: string;

  @ApiPropertyOptional({ example: ['nestjs', 'typescript'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  imageGradient?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;
}
