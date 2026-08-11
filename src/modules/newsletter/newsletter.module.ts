import { Module } from '@nestjs/common';
import { NewsletterController } from '@/modules/newsletter/newsletter.controller';
import { NewsletterService } from '@/modules/newsletter/newsletter.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
