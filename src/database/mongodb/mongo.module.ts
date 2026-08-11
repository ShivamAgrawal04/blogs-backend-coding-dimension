import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoModels } from '@/database/mongodb/schemas';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error('MONGODB_URI is required when DB provider is mongodb');
        }
        return { uri };
      },
    }),
    MongooseModule.forFeature(mongoModels),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
