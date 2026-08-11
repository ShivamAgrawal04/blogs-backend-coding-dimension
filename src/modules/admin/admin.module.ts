import { Module } from '@nestjs/common';
import { AdminController } from '@/modules/admin/admin.controller';
import { AdminService } from '@/modules/admin/admin.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
