import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcryptjs';
import * as schema from '@/db/schema';
import {
  awsEc2UbuntuDeployment,
  deployNextjsCloudflare,
  gcpSshOsLoginWindows,
  pushOneRepoTwoGithubAccounts,
} from '@/db/seed-blog-bodies';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  await db
    .insert(schema.users)
    .values([
      {
        id: createId(),
        name: 'Admin',
        email: 'admin@codingdimension.com',
        password: adminPassword,
        role: 'ADMIN',
        bio: 'Platform administrator',
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-1',
        emailVerified: new Date(),
      },
      {
        id: createId(),
        name: 'Test User',
        email: 'user@codingdimension.com',
        password: userPassword,
        role: 'USER',
        bio: 'A regular test user',
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cd-avatar-7',
        emailVerified: new Date(),
      },
    ])
    .onConflictDoNothing();

  const [admin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@codingdimension.com'))
    .limit(1);

  if (!admin) throw new Error('Admin user missing after seed');

  const subjectsData = [
    { name: 'JavaScript', slug: 'javascript', icon: '📘', sortOrder: 1 },
    { name: 'React', slug: 'react', icon: '⚛️', sortOrder: 2 },
    { name: 'Node.js', slug: 'nodejs', icon: '🟢', sortOrder: 3 },
  ];

  for (const s of subjectsData) {
    await db
      .insert(schema.subjects)
      .values({ id: createId(), ...s })
      .onConflictDoNothing();
  }

  const subjectRows = await db.select().from(schema.subjects);
  const bySlug = Object.fromEntries(subjectRows.map((s) => [s.slug, s]));

  const notesSeed = [
    {
      subjectSlug: 'javascript',
      slug: 'variables-and-types',
      title: 'Variables and Types',
      description: 'Learn let, const, var and JavaScript’s primitive types.',
      readTime: '6 min read',
      sortOrder: 1,
      metaTitle: 'JavaScript Variables and Types | Coding Dimension',
      metaDescription:
        'A clear guide to JavaScript variables (let, const, var) and primitive types with practical examples.',
      content: `<h2>Why variables matter</h2>
<p>Variables store values your program can reuse. In modern JavaScript you almost always use <code>const</code> or <code>let</code>.</p>
<h3>const vs let</h3>
<pre><code>const appName = "Coding Dimension";
let visitCount = 0;
visitCount += 1;</code></pre>
<ul>
<li><strong>const</strong> — binding cannot be reassigned</li>
<li><strong>let</strong> — binding can be reassigned</li>
<li><strong>var</strong> — legacy; avoid in new code</li>
</ul>
<h3>Primitive types</h3>
<p>Common primitives: <code>string</code>, <code>number</code>, <code>boolean</code>, <code>null</code>, <code>undefined</code>, <code>bigint</code>, <code>symbol</code>.</p>
<p>Use <code>typeof</code> to inspect a value quickly during learning and debugging.</p>`,
    },
    {
      subjectSlug: 'javascript',
      slug: 'functions-basics',
      title: 'Functions Basics',
      description: 'Function declarations, expressions, and arrow functions.',
      readTime: '7 min read',
      sortOrder: 2,
      metaTitle: 'JavaScript Functions Basics | Coding Dimension',
      metaDescription:
        'Understand JavaScript function declarations, expressions, and arrow functions with clean examples.',
      content: `<h2>Functions are reusable blocks</h2>
<p>Functions group logic so you can call it with different inputs.</p>
<pre><code>function greet(name) {
  return \`Hello, \${name}!\`;
}

const add = (a, b) => a + b;</code></pre>
<h3>When to use arrow functions</h3>
<p>Arrow functions are great for short callbacks. Prefer named function declarations for top-level utilities that need clearer stack traces.</p>`,
    },
    {
      subjectSlug: 'react',
      slug: 'components-and-jsx',
      title: 'Components and JSX',
      description: 'Build UI with React components and JSX syntax.',
      readTime: '8 min read',
      sortOrder: 1,
      metaTitle: 'React Components and JSX | Coding Dimension',
      metaDescription:
        'Learn how React components and JSX work together to build modern user interfaces.',
      content: `<h2>Components</h2>
<p>A React component is a function that returns UI. JSX looks like HTML but compiles to JavaScript.</p>
<pre><code>export function Hello({ name }) {
  return &lt;h1&gt;Hello, {name}&lt;/h1&gt;;
}</code></pre>
<h3>Composition</h3>
<p>Break UI into small components and compose them. Keep props simple and predictable.</p>`,
    },
    {
      subjectSlug: 'react',
      slug: 'hooks-usestate',
      title: 'Hooks: useState',
      description: 'Manage local component state with useState.',
      readTime: '6 min read',
      sortOrder: 2,
      metaTitle: 'React useState Hook Explained | Coding Dimension',
      metaDescription:
        'A practical introduction to React’s useState hook for local component state.',
      content: `<h2>Local state with useState</h2>
<pre><code>import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    &lt;button onClick={() =&gt; setCount(count + 1)}&gt;
      Clicked {count} times
    &lt;/button&gt;
  );
}</code></pre>
<p>Never mutate state directly — always call the setter with a new value.</p>`,
    },
    {
      subjectSlug: 'nodejs',
      slug: 'getting-started',
      title: 'Getting Started with Node.js',
      description: 'What Node.js is and how to run your first script.',
      readTime: '5 min read',
      sortOrder: 1,
      metaTitle: 'Getting Started with Node.js | Coding Dimension',
      metaDescription:
        'Install Node.js, run your first script, and understand the event-driven runtime.',
      content: `<h2>What is Node.js?</h2>
<p>Node.js lets you run JavaScript outside the browser — perfect for APIs, CLIs, and tooling.</p>
<pre><code>// hello.js
console.log("Hello from Node.js");</code></pre>
<p>Run it with <code>node hello.js</code>.</p>
<h3>Useful built-ins</h3>
<ul>
<li><code>fs</code> — file system</li>
<li><code>path</code> — path helpers</li>
<li><code>http</code> — create servers</li>
</ul>`,
    },
    {
      subjectSlug: 'nodejs',
      slug: 'express-basics',
      title: 'Express Basics',
      description: 'Create a tiny HTTP API with Express.',
      readTime: '7 min read',
      sortOrder: 2,
      metaTitle: 'Express.js Basics for Beginners | Coding Dimension',
      metaDescription:
        'Build a minimal Express server with routes and JSON responses.',
      content: `<h2>Minimal Express server</h2>
<pre><code>import express from "express";

const app = express();
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(3001, () => console.log("API on :3001"));</code></pre>
<p>Start with routes and middleware, then add validation and auth as your app grows.</p>`,
    },
  ];

  for (const note of notesSeed) {
    const subject = bySlug[note.subjectSlug];
    if (!subject) continue;
    const existing = await db
      .select({ id: schema.notes.id })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.subjectId, subject.id),
          eq(schema.notes.slug, note.slug),
        ),
      )
      .limit(1);
    if (existing.length) continue;

    await db.insert(schema.notes).values({
      id: createId(),
      slug: note.slug,
      title: note.title,
      description: note.description,
      content: note.content,
      readTime: note.readTime,
      subjectId: subject.id,
      sortOrder: note.sortOrder,
      metaTitle: note.metaTitle,
      metaDescription: note.metaDescription,
      date: new Date(),
    });
  }

  const blogsSeed = [
    {
      title: 'How to Structure a Modern Blog with Next.js and NestJS',
      slug: 'nextjs-nestjs-blog-architecture',
      description:
        'A practical architecture for separating your Next.js frontend from a NestJS API with cookies, SEO, and admin publishing.',
      category: 'Architecture',
      readTime: '9 min read',
      featured: true,
      metaTitle: 'Next.js + NestJS Blog Architecture | Coding Dimension',
      metaDescription:
        'Learn how to structure a production-friendly blog with Next.js, NestJS, auth cookies, and SEO metadata.',
      tags: ['nextjs', 'nestjs', 'architecture'],
      content: `<h2>Split frontend and API</h2>
<p>Keep the marketing site and docs in Next.js. Put auth, CRUD, and business rules in NestJS. Talk over HTTPS with <code>withCredentials</code> cookies.</p>
<h3>Why this helps SEO</h3>
<p>Next.js App Router can render note and blog pages on the server with proper <code>generateMetadata</code> titles and descriptions.</p>
<ol>
<li>Publish content as HTML from a rich text editor</li>
<li>Store <code>metaTitle</code> and <code>metaDescription</code></li>
<li>Expose clean slug URLs like <code>/blogs/your-slug</code></li>
</ol>
<h3>Admin publishing flow</h3>
<p>Admins draft in TipTap, preview locally, then set status to <strong>PUBLISHED</strong>. Users consume content; they do not create posts.</p>`,
    },
    {
      title: 'Writing SEO-Friendly Technical Notes',
      slug: 'seo-friendly-technical-notes',
      description:
        'Simple habits that make your coding notes easier to discover and skim.',
      category: 'SEO',
      readTime: '6 min read',
      featured: true,
      metaTitle: 'SEO Tips for Technical Notes | Coding Dimension',
      metaDescription:
        'Title tags, meta descriptions, headings, and slugs — practical SEO for coding notes and tutorials.',
      tags: ['seo', 'writing', 'notes'],
      content: `<h2>Start with search intent</h2>
<p>Pick one clear topic per note. Your H1 and meta title should match what learners type into Google.</p>
<ul>
<li>Use a short, unique slug</li>
<li>Write a meta description under ~160 characters</li>
<li>Use H2/H3 headings for scannability</li>
<li>Include 1–2 realistic code samples</li>
</ul>
<h3>Check in the browser</h3>
<p>Open DevTools → Elements → inspect <code>&lt;title&gt;</code> and <code>meta name="description"</code> on a published note page.</p>`,
    },
    {
      title: 'React State Patterns You Will Use Every Day',
      slug: 'react-state-patterns-everyday',
      description:
        'Local state, lifting state up, and when to reach for derived values instead of extra useState calls.',
      category: 'React',
      readTime: '8 min read',
      featured: false,
      metaTitle: 'Everyday React State Patterns | Coding Dimension',
      metaDescription:
        'Practical React state patterns: local useState, lifting state, and deriving values without overcomplicating your components.',
      tags: ['react', 'hooks', 'frontend'],
      content: `<h2>Prefer derived state</h2>
<p>If a value can be computed from existing state or props, do not store it in another <code>useState</code>.</p>
<pre><code>const [items, setItems] = useState([]);
const total = items.length; // derived</code></pre>
<h3>Lift state only when needed</h3>
<p>Lift state to the nearest shared parent when two siblings must stay in sync. Otherwise keep it local.</p>`,
    },
    {
      title:
        'Stop Local Windows PostgreSQL and Run Docker Postgres on Port 5433',
      slug: 'stop-windows-postgres-run-docker-on-5433',
      description:
        'Fix the Windows PostgreSQL vs Docker port clash: stop the local service, map Docker to 5433, update DATABASE_URL, and verify the connection.',
      category: 'DevOps',
      readTime: '8 min read',
      featured: true,
      metaTitle:
        'Windows PostgreSQL Off + Docker on 5433 | Coding Dimension',
      metaDescription:
        'Step-by-step guide to stop local Windows PostgreSQL, run Docker Postgres on port 5433, update .env, and verify with docker ps and node-pg.',
      tags: ['docker', 'postgresql', 'windows', 'devops'],
      content: `<h2>Why this matters</h2>
<p>On Windows, a local PostgreSQL service often binds to <code>5432</code>. If Docker Compose also tries to publish <code>5432:5432</code>, one of them fails or your app connects to the wrong database.</p>
<p>Two clean options:</p>
<ul>
<li><strong>Option A</strong> — Stop Windows Postgres, let Docker use <code>5432</code></li>
<li><strong>Option B</strong> — Keep Windows Postgres running, map Docker to <code>5433</code> (recommended when you need both)</li>
</ul>
<p>This guide focuses on <strong>Option B</strong>, with the commands to stop the Windows service when you want Option A.</p>
<h2>1. Stop local Windows PostgreSQL (Admin PowerShell)</h2>
<p>Open <strong>PowerShell as Administrator</strong>, then check and stop the service.</p>
<h3>Status check</h3>
<pre><code>Get-Service -Name "*postgres*"</code></pre>
<h3>Stop the service</h3>
<pre><code>Stop-Service -Name "postgresql-x64-18" -Force</code></pre>
<p>Replace <code>postgresql-x64-18</code> with the exact name from <code>Get-Service</code> if your version differs.</p>
<h3>Optional: disable auto-start</h3>
<pre><code>Set-Service -Name "postgresql-x64-18" -StartupType Disabled</code></pre>
<h3>Confirm</h3>
<pre><code>Get-Service -Name "postgresql-x64-18"</code></pre>
<p>If you are <strong>not</strong> running as Admin, these commands will fail. Use the Docker <code>5433</code> approach below instead.</p>
<h2>2. Run Docker Postgres on port 5433</h2>
<pre><code>cd path\\\\to\\\\your\\\\backend
$env:DEPLOY_TAG = "local"
docker compose --profile local up -d --force-recreate postgres</code></pre>
<p>Compose should publish:</p>
<pre><code>ports:
  - "5433:5432"</code></pre>
<h2>3. Point .env at Docker</h2>
<pre><code>DATABASE_URL=postgresql://user:password@localhost:5433/your_database</code></pre>
<h2>4. Verify</h2>
<pre><code>docker ps --filter name=postgres --format "{{.Names}} {{.Ports}} {{.Status}}"</code></pre>
<p>Expected: <code>0.0.0.0:5433-&gt;5432/tcp</code>.</p>
<pre><code>node -e "require('dotenv').config(); const {Client}=require('pg'); const c=new Client({connectionString:process.env.DATABASE_URL}); c.connect().then(()=&gt;c.query('select current_user, current_database()')).then(r=&gt;{console.log(r.rows); return c.end()})"</code></pre>
<h2>5. Start the backend</h2>
<pre><code>pnpm run dev</code></pre>
<h2>Quick comparison</h2>
<ul>
<li><strong>Option A</strong> — Windows Postgres off + Docker <code>5432</code> + <code>.env</code> <code>5432</code></li>
<li><strong>Option B</strong> — Windows Postgres on + Docker <code>5433</code> + <code>.env</code> <code>5433</code></li>
</ul>`,
    },
    {
      title:
        'Complete AWS EC2 Ubuntu Deployment Guide (Node.js + PM2 + Nginx)',
      slug: 'aws-ec2-ubuntu-nodejs-pm2-nginx-deployment',
      description:
        'Deploy a Node.js/Express backend on AWS EC2 Ubuntu: install Node, clone the repo, configure .env, run with PM2, and put Nginx in front with a firewall checklist.',
      category: 'DevOps',
      readTime: '15 min read',
      featured: true,
      metaTitle:
        'AWS EC2 Ubuntu Node.js Deployment with PM2 & Nginx | Coding Dimension',
      metaDescription:
        'Step-by-step AWS EC2 Ubuntu guide for Node.js backends: Git, Node LTS, PM2, Nginx reverse proxy, UFW, MongoDB/Redis extras, and common fixes.',
      tags: ['aws', 'ec2', 'nodejs', 'nginx', 'pm2', 'devops'],
      content: awsEc2UbuntuDeployment,
    },
    {
      title: 'How to Deploy a Next.js Project on Cloudflare',
      slug: 'deploy-nextjs-on-cloudflare-workers-opennext',
      description:
        'Deploy Next.js App Router to Cloudflare Workers with OpenNext: wrangler config, middleware.ts vs proxy.ts, secrets, Git auto-deploy, and the .npmrc peer-deps fix.',
      category: 'DevOps',
      readTime: '7 min read',
      featured: true,
      metaTitle:
        'Deploy Next.js on Cloudflare Workers with OpenNext | Coding Dimension',
      metaDescription:
        'Practical guide to Next.js on Cloudflare Workers: OpenNext, wrangler.jsonc, middleware.ts (not proxy.ts), NEXT_PUBLIC build vars, Git deploy, and legacy-peer-deps.',
      tags: ['cloudflare', 'nextjs', 'opennext', 'workers', 'devops'],
      content: deployNextjsCloudflare,
    },
    {
      title:
        'GCP Compute Engine SSH from Windows: OS Login Step-by-Step',
      slug: 'gcp-compute-engine-ssh-os-login-windows',
      description:
        'Create an SSH key on Windows, install gcloud, add the key with OS Login (project ID not number), enable OS Login on the VM, set IAM roles, and connect.',
      category: 'DevOps',
      readTime: '12 min read',
      featured: true,
      metaTitle:
        'GCP SSH + OS Login from Windows | Coding Dimension',
      metaDescription:
        'Windows guide for Google Cloud OS Login: ssh-keygen, gcloud CLI, project ID vs number, enable-oslogin metadata, IAM roles, and gcloud compute ssh.',
      tags: ['gcp', 'ssh', 'os-login', 'windows', 'devops'],
      content: gcpSshOsLoginWindows,
    },
    {
      title:
        'Push One Local Repo to Two GitHub Accounts (Remotes + SSH)',
      slug: 'push-one-repo-to-two-github-accounts',
      description:
        'Keep one local Git folder and update two GitHub accounts with a second remote. Covers empty Repo B setup, Windows SSH Host aliases, username typos, and Repository not found.',
      category: 'DevOps',
      readTime: '10 min read',
      featured: true,
      metaTitle:
        'One Repo, Two GitHub Accounts | Coding Dimension',
      metaDescription:
        'Step-by-step: add a second Git remote, configure Windows SSH aliases for multiple GitHub accounts, and fix hostname / Repository not found errors.',
      tags: ['git', 'github', 'ssh', 'windows', 'devops'],
      content: pushOneRepoTwoGithubAccounts,
    },
  ];

  for (const blog of blogsSeed) {
    const existing = await db
      .select({ id: schema.blogs.id })
      .from(schema.blogs)
      .where(eq(schema.blogs.slug, blog.slug))
      .limit(1);

    if (existing.length) {
      await db
        .update(schema.blogs)
        .set({
          title: blog.title,
          description: blog.description,
          content: blog.content,
          category: blog.category,
          readTime: blog.readTime,
          featured: blog.featured,
          metaTitle: blog.metaTitle,
          metaDescription: blog.metaDescription,
          status: 'PUBLISHED',
          updatedAt: new Date(),
        })
        .where(eq(schema.blogs.id, existing[0].id));
      continue;
    }

    const blogId = createId();
    await db.insert(schema.blogs).values({
      id: blogId,
      title: blog.title,
      slug: blog.slug,
      description: blog.description,
      content: blog.content,
      authorId: admin.id,
      category: blog.category,
      readTime: blog.readTime,
      status: 'PUBLISHED',
      featured: blog.featured,
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      publishedAt: new Date(),
    });

    for (const tagName of blog.tags) {
      const tagSlug = tagName.toLowerCase();
      await db
        .insert(schema.tags)
        .values({ id: createId(), name: tagName, slug: tagSlug })
        .onConflictDoNothing();
      const [tag] = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.slug, tagSlug))
        .limit(1);
      if (!tag) continue;
      await db
        .insert(schema.blogTags)
        .values({ blogId, tagId: tag.id })
        .onConflictDoNothing();
    }
  }

  console.log('Seed complete.');
  console.log('Admin: admin@codingdimension.com / admin123');
  console.log('User:  user@codingdimension.com / user123');
  console.log('Sample published blogs + notes with SEO meta fields added.');
  await pool.end();
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
