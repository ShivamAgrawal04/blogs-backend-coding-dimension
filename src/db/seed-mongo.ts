/**
 * Seed MongoDB with admin + sample content.
 * Usage (from backend/): pnpm db:seed:mongo
 *
 * Requires MONGODB_URI in .env. Does not switch the active provider.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection missing db handle');

  console.log('Seeding MongoDB...');

  const users = db.collection('users');
  const subjects = db.collection('subjects');
  const notes = db.collection('notes');
  const blogs = db.collection('blogs');
  const tags = db.collection('tags');
  const blogTags = db.collection('blog_tags');

  await users.createIndex({ id: 1 }, { unique: true });
  await users.createIndex({ email: 1 }, { unique: true });
  await blogs.createIndex({ id: 1 }, { unique: true });
  await blogs.createIndex({ slug: 1 }, { unique: true });
  await subjects.createIndex({ slug: 1 }, { unique: true });
  await notes.createIndex({ id: 1 }, { unique: true });
  await notes.createIndex({ subjectId: 1, slug: 1 }, { unique: true });
  await tags.createIndex({ slug: 1 }, { unique: true });

  const adminPassword = await bcrypt.hash('admin123', 12);
  const now = new Date();

  const existingAdmin = await users.findOne({ email: 'admin@codingdimension.com' });
  let adminId = existingAdmin?.id as string | undefined;
  if (!adminId) {
    adminId = createId();
    await users.insertOne({
      id: adminId,
      name: 'Admin',
      email: 'admin@codingdimension.com',
      password: adminPassword,
      role: 'ADMIN',
      bio: 'Platform administrator',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-1',
      emailVerified: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  const subjectDefs = [
    { name: 'JavaScript', slug: 'javascript', icon: '📘', sortOrder: 1 },
    { name: 'React', slug: 'react', icon: '⚛️', sortOrder: 2 },
    { name: 'Node.js', slug: 'nodejs', icon: '🟢', sortOrder: 3 },
  ];

  for (const s of subjectDefs) {
    const existing = await subjects.findOne({ slug: s.slug });
    if (!existing) {
      await subjects.insertOne({ id: createId(), ...s });
    }
  }

  const js = await subjects.findOne({ slug: 'javascript' });
  if (js && !(await notes.findOne({ subjectId: js.id, slug: 'variables-and-types' }))) {
    await notes.insertOne({
      id: createId(),
      subjectId: js.id,
      slug: 'variables-and-types',
      title: 'Variables and Types',
      description: 'Learn let, const, var and JavaScript’s primitive types.',
      content: '<h2>Why variables matter</h2><p>Use <code>const</code> and <code>let</code>.</p>',
      readTime: '6 min read',
      sortOrder: 1,
      views: 0,
      date: now,
      metaTitle: 'JavaScript Variables and Types | Coding Dimension',
      metaDescription: 'Guide to JavaScript variables and types.',
      createdAt: now,
      updatedAt: now,
    });
  }

  const blogSlug = 'gcp-compute-engine-ssh-os-login-windows';
  if (!(await blogs.findOne({ slug: blogSlug }))) {
    let content =
      '<h2>Overview</h2><p>Connect to a GCP VM from Windows using OS Login.</p>';
    try {
      content = readFileSync(
        join(__dirname, '../../content/gcp-ssh-os-login-windows.html'),
        'utf8',
      );
    } catch {
      // content file optional
    }
    const blogId = createId();
    await blogs.insertOne({
      id: blogId,
      title: 'GCP Compute Engine SSH from Windows: OS Login Step-by-Step',
      slug: blogSlug,
      description:
        'Create an SSH key on Windows, install gcloud, add the key with OS Login, enable OS Login, set IAM, and connect.',
      content,
      authorId: adminId,
      category: 'DevOps',
      readTime: '12 min read',
      status: 'PUBLISHED',
      featured: true,
      imageGradient: 'from-[#033b2a] to-[#1e4d3a]',
      metaTitle: 'GCP SSH + OS Login from Windows | Coding Dimension',
      metaDescription:
        'Windows guide for Google Cloud OS Login: ssh-keygen, gcloud CLI, project ID vs number, and connect.',
      views: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    for (const name of ['gcp', 'ssh', 'os-login', 'windows', 'devops']) {
      const tagSlug = name.toLowerCase();
      const existingTag = await tags.findOne({ slug: tagSlug });
      const tagId = (existingTag?.id as string | undefined) ?? createId();
      if (!existingTag) {
        await tags.insertOne({ id: tagId, name, slug: tagSlug });
      }
      await blogTags.updateOne(
        { blogId, tagId },
        { $setOnInsert: { blogId, tagId } },
        { upsert: true },
      );
    }
  }

  console.log('Mongo seed complete.');
  console.log('Admin: admin@codingdimension.com / admin123');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
