import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repo = 'magic76/crew-social-agent';
const rawBase = 'https://raw.githubusercontent.com/' + repo + '/main/';
const githubBase = 'https://github.com/' + repo + '/blob/main/';
const root = process.cwd();
const outputDir = path.join(root, 'site');

function encodedPath(file) {
  return file.split('/').map(encodeURIComponent).join('/');
}

function rawUrl(file) {
  return rawBase + encodedPath(file.replace(/^\//, ''));
}

function githubUrl(file) {
  return githubBase + encodedPath(file);
}

function asPublicUrl(value, filePath) {
  if (!value) return null;
  if (typeof value === 'string' && /^https:\/\//i.test(value)) return value;
  if (typeof value === 'string') return rawUrl(value.startsWith('/') ? value.slice(1) : value);
  if (typeof value === 'object') {
    const direct = value.public_url || value.url;
    if (typeof direct === 'string' && /^https:\/\//i.test(direct)) return direct;
    if (typeof value.path === 'string') return rawUrl(value.path);
  }
  return filePath ? rawUrl(filePath) : null;
}

function dateFromFilename(file) {
  const match = file.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function sourcesFor(item) {
  const values = [];
  if (item.source && item.source.url) values.push(item.source);
  if (Array.isArray(item.references)) values.push(...item.references);
  return values.filter(source => source && source.url && /^https:\/\//i.test(source.url))
    .map(source => ({
      publisher: source.publisher || source.title || '參考來源',
      title: source.title || '',
      url: source.url
    }));
}

async function directFiles(directory, extension) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map(entry => directory + '/' + entry.name)
    .sort();
}

async function markdownFiles(directory) {
  let found = [];
  let entries;
  try {
    entries = await readdir(path.join(root, directory), { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const file = directory + '/' + entry.name;
    if (entry.isDirectory()) found = found.concat(await markdownFiles(file));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) found.push(file);
  }
  return found.sort();
}

function firstReply(item, platform) {
  const value = item.first_replies && item.first_replies[platform];
  return value && typeof value.text === 'string' ? value.text : '';
}

async function buildPosts() {
  const files = await directFiles('content/queue', '.json');
  const posts = [];
  for (const file of files) {
    const item = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    const image = item.image;
    const imagePath = typeof image === 'string' ? image : image && (image.path || image.file);
    const imageUrl = asPublicUrl(image, imagePath);
    posts.push({
      id: item.id || path.basename(file, '.json'),
      title: item.title || path.basename(file, '.json'),
      category: item.category || '',
      status: item.status || 'draft_handoff_only',
      createdDate: item.created_date || dateFromFilename(file),
      scheduleDate: item.schedule && item.schedule.date ? item.schedule.date : '',
      scheduleTime: item.schedule && item.schedule.time ? item.schedule.time : '',
      timezone: item.schedule && item.schedule.timezone ? item.schedule.timezone : '',
      networks: Array.isArray(item.networks) ? item.networks : Object.keys(item.posts || {}),
      facebookText: item.posts && item.posts.facebook ? item.posts.facebook.text || '' : '',
      threadsText: item.posts && item.posts.threads ? item.posts.threads.text || '' : '',
      facebookReply: firstReply(item, 'facebook'),
      threadsReply: firstReply(item, 'threads'),
      imageUrl,
      imageAlt: image && typeof image === 'object' ? image.alt_text || image.alt || item.title || '' : item.title || '',
      sources: sourcesFor(item),
      fileUrl: githubUrl(file)
    });
  }
  return posts.sort((a, b) => ((b.scheduleDate || b.createdDate) + b.scheduleTime).localeCompare((a.scheduleDate || a.createdDate) + a.scheduleTime));
}

async function buildVideos() {
  const files = await directFiles('content/video-handoffs', '.json');
  const videos = [];
  for (const file of files) {
    const item = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    const media = item.media || {};
    const videoUrl = asPublicUrl(media, media.path);
    const posts = item.posts || {};
    videos.push({
      id: item.id || path.basename(file, '.json'),
      title: item.title || path.basename(file, '.json'),
      date: item.created_date || dateFromFilename(file),
      status: item.status || 'draft_handoff_only',
      publishPermitted: item.publish_permitted === true,
      schedule: item.schedule || null,
      videoUrl,
      duration: Number.isFinite(Number(media.duration_seconds)) ? Number(media.duration_seconds.toFixed(1)) : null,
      source: item.source ? { publisher: item.source.publisher || '', title: item.source.title || '', url: item.source.url || '' } : null,
      facebookText: posts.facebook && posts.facebook.text ? posts.facebook.text : '',
      threadsText: posts.threads && posts.threads.text ? posts.threads.text : '',
      facebookReply: firstReply(item, 'facebook'),
      threadsReply: firstReply(item, 'threads'),
      fileUrl: githubUrl(file)
    });
  }
  return videos.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

async function buildReports() {
  const files = [
    ...await markdownFiles('content/reports'),
    ...await markdownFiles('content/research')
  ];
  const reports = [];
  for (const file of Array.from(new Set(files))) {
    const body = await readFile(path.join(root, file), 'utf8');
    const heading = body.split(/\r?\n/).find(line => /^#\s+/.test(line));
    reports.push({
      file,
      date: dateFromFilename(file),
      title: heading ? heading.replace(/^#\s+/, '').trim() : path.basename(file, '.md'),
      body,
      fileUrl: githubUrl(file)
    });
  }
  return reports.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.file.localeCompare(b.file));
}

const data = {
  repository: repo,
  commit: process.env.GITHUB_SHA || '',
  generatedAt: new Date().toISOString(),
  posts: await buildPosts(),
  videos: await buildVideos(),
  reports: await buildReports()
};

await mkdir(outputDir, { recursive: true });
await copyFile(path.join(root, 'social-dashboard/index.html'), path.join(outputDir, 'index.html'));
await writeFile(path.join(outputDir, 'data.json'), JSON.stringify(data));
await writeFile(path.join(outputDir, '.nojekyll'), '');
console.log('Built dashboard:', data.posts.length, 'posts,', data.videos.length, 'videos,', data.reports.length, 'reports.');
