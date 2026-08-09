import { Module } from '@nestjs/common';
import { NoteController } from './notes.controller';
import { NoteService } from './notes.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NotesModule {}
