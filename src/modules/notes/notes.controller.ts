import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NoteService } from '@/modules/notes/notes.service';
import { CreateNoteDto } from '@/modules/notes/dto/create-note.dto';
import { UpdateNoteDto } from '@/modules/notes/dto/update-note.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Notes')
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  @ApiOperation({ summary: 'List notes (optional ?subject=slug)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'subject', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('subject') subject?: string,
  ) {
    return this.noteService.findAll({ page, limit, subject });
  }

  @Get('subjects/all')
  @ApiOperation({ summary: 'List subjects with notes (for notes SEO pages)' })
  findSubjects() {
    return this.noteService.findSubjects();
  }

  @Post('subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subject/category (Admin only)' })
  createSubject(
    @Body()
    dto: { name: string; slug?: string; icon?: string; sortOrder?: number },
  ) {
    return this.noteService.createSubject(dto);
  }

  @Put('subjects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subject/category (Admin only)' })
  updateSubject(
    @Param('id') id: string,
    @Body()
    dto: { name?: string; slug?: string; icon?: string; sortOrder?: number },
  ) {
    return this.noteService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subject/category (Admin only)' })
  deleteSubject(@Param('id') id: string) {
    return this.noteService.deleteSubject(id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all notes (Admin only)' })
  findAllAdmin() {
    return this.noteService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single note by ID or slug' })
  @ApiResponse({ status: 200, description: 'Note found' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findOne(@Param('id') idOrSlug: string) {
    return this.noteService.findOne(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new note (Admin only)' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateNoteDto,
  ) {
    return this.noteService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a note (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.noteService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a note (Admin only)' })
  delete(@Param('id') id: string) {
    return this.noteService.delete(id);
  }
}
