import { Module } from '@nestjs/common';
import { BlogController } from '@/modules/blogs/blogs.controller';
import { BlogService } from '@/modules/blogs/blogs.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogsModule {}
