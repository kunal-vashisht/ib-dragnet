import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const FILE = path.join(dir, 'events.ndjson');
fs.mkdirSync(dir, { recursive: true });

const events = []; // all events, oldest first

// Load existing events once at startup
if (fs.existsSync(FILE)) {
  for (const line of fs.readFileSync(FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* skip a broken line */ }
  }
}

// First app frame that was successfully unminified (skips node_modules and raw bundle URLs)
function topFrame(stack = '') {
  const frames = stack.split('\n').filter((l) => /^\s*at /.test(l));
  const app = frames.find((l) => !l.includes('node_modules') && !/https?:\/\//.test(l));
  const line = app || frames[0];
  if (!line) return '';
  const m = line.match(/\(([^)]+)\)/);
  return m ? m[1].replace(/^webpack:\/\/[^/]+\//, '') : line.trim();
}

export function addEvent(event, unminifiedStack) {
  const frame = topFrame(unminifiedStack);
  const message = event.message || 'Unknown error';
  const record = {
    ...event,
    id: crypto.randomUUID(),
    message,
    unminifiedStack,
    topFrame: frame,
    // fingerprint: same message + same top frame = same issue
    issueId: crypto.createHash('sha1').update(message + frame).digest('hex').slice(0, 12),
    sizeKB: +(Buffer.byteLength(JSON.stringify(event)) / 1024).toFixed(2),
  };
  fs.appendFile(FILE, JSON.stringify(record) + '\n', (err) => err && console.error('Write failed:', err));
  events.push(record);
}

export function listIssues({ search = '', release = '', from, to } = {}) {
  const s = search.toLowerCase();
  const groups = new Map();
  for (const e of events) {
    if (release && e.release !== release) continue;
    if (from && e.timestamp < from) continue;
    if (to && e.timestamp > to) continue;
    if (s && !`${e.message} ${e.topFrame}`.toLowerCase().includes(s)) continue;
    const g = groups.get(e.issueId) || { id: e.issueId, title: e.message, topFrame: e.topFrame, count: 0, firstSeen: e.timestamp, lastSeen: e.timestamp, releases: [] };
    g.count++;
    if (e.timestamp < g.firstSeen) g.firstSeen = e.timestamp;
    if (e.timestamp > g.lastSeen) g.lastSeen = e.timestamp;
    if (!g.releases.includes(e.release)) g.releases.push(e.release);
    groups.set(e.issueId, g);
  }
  return [...groups.values()];
}

export const issueEvents = (id) =>
  events.filter((e) => e.issueId === id).reverse()
    .map(({ id, timestamp, release, userId }) => ({ id, timestamp, release, userId }));

export const getEvent = (id) => events.find((e) => e.id === id);