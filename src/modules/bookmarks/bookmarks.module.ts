import { Module } from '@nestjs/common';
import { BookmarksController } from '@/modules/bookmarks/bookmarks.controller';
import { BookmarksService } from '@/modules/bookmarks/bookmarks.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
})
export class BookmarksModule {}
