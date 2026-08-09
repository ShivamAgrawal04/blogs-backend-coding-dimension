import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveAvatar } from '../../common/avatars';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  bio: true,
  image: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const image = resolveAvatar(dto.avatarId, dto.image);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        image,
      },
      select: userSelect,
    });

    const token = this.generateToken(user);
    return { access_token: token, user };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  login(user: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
    image?: string | null;
    bio?: string | null;
  }) {
    const token = this.generateToken(user);
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name ?? null,
        image: user.image ?? null,
        bio: user.bio ?? null,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        _count: {
          select: {
            blogs: true,
            comments: true,
            bookmarks: true,
            reads: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { _count, ...rest } = user;
    return {
      ...rest,
      blogCount: _count.blogs,
      commentCount: _count.comments,
      bookmarkCount: _count.bookmarks,
      readCount: _count.reads,
    };
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; bio?: string; image?: string; avatarId?: number },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let image: string | undefined;
    if (dto.image !== undefined || dto.avatarId !== undefined) {
      image = resolveAvatar(dto.avatarId, dto.image);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(image !== undefined && { image }),
      },
      select: userSelect,
    });
  }

  private generateToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
