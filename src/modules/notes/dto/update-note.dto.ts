import { PartialType } from '@nestjs/swagger';
import { CreateNoteDto } from '@/modules/notes/dto/create-note.dto';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}
