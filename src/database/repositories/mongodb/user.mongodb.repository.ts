import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { USER_MODEL } from '@/database/mongodb/schemas';
import { stripMongoMeta } from '@/database/mongodb/mongo.helpers';
import type { UserDocument } from '@/database/mongodb/schemas/users.schema';
import type {
  CreateUserInput,
  PublicUserProfile,
  UpdateUserProfileInput,
  UserRepository,
  UserRoleRecord,
} from '@/database/repositories/interfaces/user.repository';
import type { UserEntity, UserRole } from '@/database/types';

const publicProjection = {
  _id: 0,
  id: 1,
  name: 1,
  username: 1,
  email: 1,
  role: 1,
  bio: 1,
  image: 1,
  dateOfBirth: 1,
  createdAt: 1,
};

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return stripMongoMeta(
      await this.userModel.findOne({ id }).lean<UserEntity>().exec(),
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return stripMongoMeta(
      await this.userModel
        .findOne({ email: email.toLowerCase() })
        .lean<UserEntity>()
        .exec(),
    );
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return stripMongoMeta(
      await this.userModel.findOne({ username }).lean<UserEntity>().exec(),
    );
  }

  async getPublicProfile(id: string): Promise<PublicUserProfile | null> {
    return stripMongoMeta(
      await this.userModel
        .findOne({ id }, publicProjection)
        .lean<PublicUserProfile>()
        .exec(),
    );
  }

  async create(input: CreateUserInput): Promise<PublicUserProfile> {
    await this.userModel.create({
      id: input.id,
      name: input.name,
      username: input.username ?? null,
      email: input.email.toLowerCase(),
      password: input.password,
      image: input.image,
      emailVerified: input.emailVerified ?? null,
      role: input.role ?? 'USER',
      bio: input.bio ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await this.getPublicProfile(input.id);
    if (!user) {
      throw new Error('Failed to create user document');
    }
    return user;
  }

  async updateProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<PublicUserProfile | null> {
    return stripMongoMeta(
      await this.userModel
        .findOneAndUpdate(
          { id },
          {
            $set: {
              ...(input.name !== undefined && { name: input.name }),
              ...(input.username !== undefined && { username: input.username }),
              ...(input.bio !== undefined && { bio: input.bio }),
              ...(input.image !== undefined && { image: input.image }),
              ...(input.dateOfBirth !== undefined && {
                dateOfBirth: input.dateOfBirth,
              }),
              updatedAt: new Date(),
            },
          },
          { new: true, projection: publicProjection },
        )
        .lean<PublicUserProfile>()
        .exec(),
    );
  }

  async updateRole(id: string, role: UserRole): Promise<UserRoleRecord | null> {
    return stripMongoMeta(
      await this.userModel
        .findOneAndUpdate(
          { id },
          { $set: { role, updatedAt: new Date() } },
          {
            new: true,
            projection: { _id: 0, id: 1, name: 1, email: 1, role: 1 },
          },
        )
        .lean<UserRoleRecord>()
        .exec(),
    );
  }
}
