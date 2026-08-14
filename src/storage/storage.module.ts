import { Module } from '@nestjs/common';
import { StorageService } from '@/storage/storage.service';
import { UploadsController } from '@/storage/uploads.controller';
import { MediaController } from '@/storage/media.controller';

@Module({
  controllers: [UploadsController, MediaController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
