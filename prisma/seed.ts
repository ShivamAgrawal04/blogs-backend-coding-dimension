import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@codingdimension.com' },
    update: { role: UserRole.ADMIN },
    create: {
      name: 'Admin',
      email: 'admin@codingdimension.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      bio: 'Platform administrator',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-1',
      emailVerified: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@codingdimension.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'user@codingdimension.com',
      password: userPassword,
      role: UserRole.USER,
      bio: 'A regular test user',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-7',
      emailVerified: new Date(),
    },
  });

  console.log(`  ✓ Created users: ${admin.email}, ${user.email}`);

  // ─── Subjects ──────────────────────────────────────────
  const subjectsData = [
    { name: 'JavaScript', slug: 'javascript', icon: '📘', sortOrder: 1 },
    { name: 'React', slug: 'react', icon: '⚛️', sortOrder: 2 },
    { name: 'Node.js', slug: 'nodejs', icon: '🟢', sortOrder: 3 },
    { name: 'Java', slug: 'java', icon: '☕', sortOrder: 4 },
    { name: 'Python', slug: 'python', icon: '🐍', sortOrder: 5 },
    { name: 'DevOps', slug: 'devops', icon: '🐳', sortOrder: 6 },
    { name: 'System Design', slug: 'system-design', icon: '🏗️', sortOrder: 7 },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { slug: s.slug },
      update: { name: s.name, icon: s.icon, sortOrder: s.sortOrder },
      create: s,
    });
    subjects.push(subject);
  }
  console.log(`  ✓ Created ${subjects.length} subjects`);

  // ─── Tags ──────────────────────────────────────────────
  const tagsData = [
    { name: 'JavaScript', slug: 'javascript' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'Python', slug: 'python' },
    { name: 'Docker', slug: 'docker' },
    { name: 'Next.js', slug: 'nextjs' },
    { name: 'CSS', slug: 'css' },
    { name: 'API Design', slug: 'api-design' },
    { name: 'Performance', slug: 'performance' },
  ];

  const tags = [];
  for (const t of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
    tags.push(tag);
  }
  console.log(`  ✓ Created ${tags.length} tags`);

  // ─── Blogs ─────────────────────────────────────────────
  const blogsData = [
    {
      title: 'Mastering JavaScript in 2026',
      slug: 'master-coding-2026',
      description: 'A comprehensive guide to mastering modern JavaScript development.',
      content: '# Mastering JavaScript in 2026\n\nJavaScript continues to evolve as the most widely-used programming language. In this guide, we cover the latest features, best practices, and patterns.\n\n## Modern Syntax\n\nES2024+ brings powerful new features...\n\n## Performance Tips\n\nOptimize your JavaScript apps with these proven techniques...\n\n## Conclusion\n\nStay current, keep practicing, and build real projects.',
      category: 'JavaScript',
      readTime: '8 min read',
      tagSlugs: ['javascript', 'typescript'],
    },
    {
      title: 'Advanced React Patterns',
      slug: 'advanced-js-tricks',
      description: 'Deep dive into advanced React patterns and performance optimization.',
      content: '# Advanced React Patterns\n\nReact has matured significantly. Let\'s explore advanced patterns.\n\n## Compound Components\n\nBuild flexible APIs with compound components...\n\n## Render Props vs Hooks\n\nWhen to use which pattern...\n\n## Performance\n\nReact.memo, useMemo, useCallback done right...',
      category: 'React',
      readTime: '10 min read',
      tagSlugs: ['react', 'performance'],
    },
    {
      title: 'Understanding React Server Components',
      slug: 'understanding-rsc',
      description: 'React Server Components change how we think about rendering.',
      content: '# Understanding React Server Components\n\nRSC is a fundamental shift in React architecture.\n\n## What Are Server Components?\n\nComponents that run only on the server...\n\n## Benefits\n\nSmaller bundle sizes, direct data access...\n\n## Migration Strategy\n\nHow to adopt RSC in existing projects...',
      category: 'React',
      readTime: '12 min read',
      tagSlugs: ['react', 'nextjs'],
    },
    {
      title: 'Building REST APIs with Node.js',
      slug: 'building-rest-apis',
      description: 'Complete guide to building production-ready REST APIs with Node.js.',
      content: '# Building REST APIs\n\nNode.js remains the go-to for API development.\n\n## Project Structure\n\nOrganize your code for scalability...\n\n## Authentication\n\nJWT, sessions, and OAuth...\n\n## Testing\n\nUnit tests, integration tests, and E2E...',
      category: 'Backend',
      readTime: '15 min read',
      tagSlugs: ['nodejs', 'api-design'],
    },
    {
      title: 'Docker for Developers',
      slug: 'docker-for-developers',
      description: 'Everything developers need to know about Docker.',
      content: '# Docker for Developers\n\nContainerize your applications.\n\n## Dockerfile Best Practices\n\nMulti-stage builds, layer optimization...\n\n## Docker Compose\n\nOrchestrate multi-container apps...\n\n## Production Deployment\n\nDeploy with confidence using Docker...',
      category: 'DevOps',
      readTime: '10 min read',
      tagSlugs: ['docker'],
    },
  ];

  for (const b of blogsData) {
    const existing = await prisma.blog.findUnique({ where: { slug: b.slug } });
    if (!existing) {
      const blog = await prisma.blog.create({
        data: {
          title: b.title,
          slug: b.slug,
          description: b.description,
          content: b.content,
          category: b.category,
          readTime: b.readTime,
          authorId: admin.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          tags: {
            create: b.tagSlugs.map((tagSlug) => ({
              tag: { connect: { slug: tagSlug } },
            })),
          },
        },
      });

      // Add some views
      await prisma.blog.update({
        where: { id: blog.id },
        data: { views: Math.floor(Math.random() * 500) + 50 },
      });
    }
  }
  console.log(`  ✓ Created ${blogsData.length} blogs`);

  // ─── Notes ─────────────────────────────────────────────
  const jsSubject = subjects.find((s) => s.slug === 'javascript');
  const reactSubject = subjects.find((s) => s.slug === 'react');
  const nodeSubject = subjects.find((s) => s.slug === 'nodejs');

  const notesData = [
    {
      subjectId: jsSubject!.id,
      title: 'JavaScript Fundamentals',
      slug: 'javascript-fundamentals',
      description: 'Learn the basics of JavaScript programming.',
      content: '# JavaScript Fundamentals\n\n## Variables\n\n`let`, `const`, and `var`...\n\n## Functions\n\nArrow functions, closures, higher-order functions...\n\n## Arrays\n\nMap, filter, reduce, destructuring...',
      readTime: '10 min read',
    },
    {
      subjectId: jsSubject!.id,
      title: 'ES6 and Modern JavaScript',
      slug: 'es6-and-modern-javascript',
      description: 'Explore modern JavaScript features from ES6 onwards.',
      content: '# ES6+ Features\n\n## Destructuring\n\n## Spread Operator\n\n## Optional Chaining\n\n## Nullish Coalescing',
      readTime: '12 min read',
    },
    {
      subjectId: jsSubject!.id,
      title: 'Async/Await and Promises',
      slug: 'async-await-and-promises',
      description: 'Master asynchronous JavaScript programming.',
      content: '# Async/Await and Promises\n\n## Promise Basics\n\n## Async/Await Syntax\n\n## Error Handling\n\n## Parallel Execution',
      readTime: '15 min read',
    },
    {
      subjectId: reactSubject!.id,
      title: 'React Fundamentals',
      slug: 'react-fundamentals',
      description: 'Get started with React development.',
      content: '# React Fundamentals\n\n## Components\n\n## JSX\n\n## Props and State\n\n## Lifecycle Methods',
      readTime: '10 min read',
    },
    {
      subjectId: reactSubject!.id,
      title: 'React Hooks Deep Dive',
      slug: 'react-hooks',
      description: 'Master React hooks for building modern applications.',
      content: '# React Hooks\n\n## useState\n\n## useEffect\n\n## useRef\n\n## Custom Hooks',
      readTime: '12 min read',
    },
    {
      subjectId: nodeSubject!.id,
      title: 'Node.js Basics',
      slug: 'nodejs-basics',
      description: 'Introduction to server-side JavaScript with Node.js.',
      content: '# Node.js Basics\n\n## Event Loop\n\n## Modules\n\n## File System\n\n## HTTP Servers',
      readTime: '10 min read',
    },
  ];

  for (const n of notesData) {
    await prisma.note.upsert({
      where: { subjectId_slug: { subjectId: n.subjectId, slug: n.slug } },
      update: {},
      create: {
        ...n,
        views: Math.floor(Math.random() * 300) + 20,
      },
    });
  }
  console.log(`  ✓ Created ${notesData.length} notes`);

  // ─── Newsletter Subscribers ────────────────────────────
  await prisma.newsletterSubscriber.upsert({
    where: { email: 'admin@codingdimension.com' },
    update: {},
    create: { email: 'admin@codingdimension.com', name: 'Admin' },
  });
  await prisma.newsletterSubscriber.upsert({
    where: { email: 'subscriber@example.com' },
    update: {},
    create: { email: 'subscriber@example.com', name: 'Subscriber' },
  });
  console.log('  ✓ Created newsletter subscribers');

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
