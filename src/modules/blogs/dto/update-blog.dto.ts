import { PartialType } from '@nestjs/swagger';
import { CreateBlogDto } from '@/modules/blogs/dto/create-blog.dto';

export class UpdateBlogDto extends PartialType(CreateBlogDto) {}
