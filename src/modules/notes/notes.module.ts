import { Module } from '@nestjs/common';
import { NoteController } from '@/modules/notes/notes.controller';
import { NoteService } from '@/modules/notes/notes.service';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NotesModule {}
