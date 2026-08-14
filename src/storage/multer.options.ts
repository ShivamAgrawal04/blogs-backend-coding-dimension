import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const FILE_MIMES = new Set([
  ...IMAGE_MIMES,
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
]);

function filter(allowed: Set<string>, label: string): MulterOptions['fileFilter'] {
  return (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new BadRequestException(`Only ${label} are allowed`) as never, false);
    }
    cb(null, true);
  };
}

export const avatarMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: filter(IMAGE_MIMES, 'images (jpg, png, webp, gif, avif)'),
};

export const fileMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: filter(FILE_MIMES, 'images, PDF, zip, or text files'),
};
