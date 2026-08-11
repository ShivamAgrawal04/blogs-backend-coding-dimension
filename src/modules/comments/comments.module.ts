import { Module } from '@nestjs/common';
import { CommentsController } from '@/modules/comments/comments.controller';
import { CommentsService } from '@/modules/comments/comments.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
