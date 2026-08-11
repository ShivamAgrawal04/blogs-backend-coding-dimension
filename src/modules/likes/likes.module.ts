import { Module } from '@nestjs/common';
import { LikesController } from '@/modules/likes/likes.controller';
import { LikesService } from '@/modules/likes/likes.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
