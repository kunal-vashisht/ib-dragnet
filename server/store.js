import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { unminifyStack } from './unminification.js';
import path from 'node:path'; 
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'gcp-key.json')
});

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'pib-web-uat-config';

let events = []; 

function topFrame(stack = '') {
  const frames = stack.split('\n').filter((l) => /^\s*at /.test(l));
  const app = frames.find((l) => !l.includes('node_modules') && !/https?:\/\//.test(l));
  const line = app || frames[0];
  if (!line) return '';
  const m = line.match(/\(([^)]+)\)/);
  return m ? m[1].replace(/^webpack:\/\/[^/]+\//, '') : line.trim();
}

/**
 * Downloads event JSON files from gs://source__maps/events/,
 * unminifies stack traces, and builds the in-memory records.
 */
const processedFiles = new Map(); 
let syncing = null;            
let lastSync = 0;               
const SYNC_EVERY_MS = 10000;      

async function buildRecord(event, key) {
  const unminifiedStack = await unminifyStack(event.stack || '', event.release || 'unknown');
  const frame = topFrame(unminifiedStack);
  const message = event.message || 'Unknown error';

  return {
    ...event,
    id: crypto.createHash('sha1').update(key).digest('hex').slice(0, 16),
    message,
    clientId: event.clientId || 'anonymous',
    unminifiedStack,
    topFrame: frame,
    issueId: crypto.createHash('sha1').update(message + frame).digest('hex').slice(0, 12),
    sizeKB: +(Buffer.byteLength(JSON.stringify(event)) / 1024).toFixed(2),
  };
}

export function syncEventsFromBucket() {
  if (syncing) return syncing; // a sync is already running: wait for it instead of starting another
  if (Date.now() - lastSync < SYNC_EVERY_MS) return Promise.resolve();

  syncing = (async () => {
    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const [files] = await bucket.getFiles({ prefix: 'trade_web_logs/events/' });

      for (const file of files) {
        if (!file.name.endsWith('.json')) continue;
        if (processedFiles.has(file.name)) continue; // uploaded files never change, skip them

        try {
          const [content] = await file.download();
          const parsed = JSON.parse(content.toString('utf-8'));
          const batch = Array.isArray(parsed) ? parsed : [parsed];

          const records = [];
          for (let i = 0; i < batch.length; i++) {
            records.push(await buildRecord(batch[i], `${file.name}:${i}`));
          }
          processedFiles.set(file.name, records);
        } catch (err) {
          console.error(`[SdkServer] could not read ${file.name}:`, err.message);
          if (err instanceof SyntaxError) processedFiles.set(file.name, []); // broken JSON: don't retry forever
        }
      }

      events = [...processedFiles.values()]
        .flat()
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      lastSync = Date.now();
      console.log(`[SdkServer] ${events.length} events loaded from bucket.`);
    } catch (err) {
      console.error('[SdkServer] Bucket sync error:', err);
    } finally {
      syncing = null;
    }
  })();

  return syncing;
}

// --- Dashboard API Exports ---

export async function listIssues({ search = '', release = '', from, to } = {}) {
  await syncEventsFromBucket(); // Fetch latest bucket contents

  const s = search.toLowerCase();
  const groups = new Map();

  for (const e of events) {
    if (release && e.release !== release) continue;
    if (from && e.timestamp < from) continue;
    if (to && e.timestamp > to) continue;
    if (s && !`${e.message} ${e.topFrame}`.toLowerCase().includes(s)) continue;

    const g = groups.get(e.issueId) || {
      id: e.issueId,
      title: e.message,
      topFrame: e.topFrame,
      count: 0,
      firstSeen: e.timestamp,
      lastSeen: e.timestamp,
      releases: [],
    };

    g.count++;
    if (e.timestamp < g.firstSeen) g.firstSeen = e.timestamp;
    if (e.timestamp > g.lastSeen) g.lastSeen = e.timestamp;
    if (!g.releases.includes(e.release)) g.releases.push(e.release);

    groups.set(e.issueId, g);
  }

  return [...groups.values()];
}

export async function issueEvents(id) {
  await syncEventsFromBucket();
  return events
    .filter((e) => e.issueId === id)
    .reverse()
    .map(({ id, timestamp, release, clientId }) => ({ id, timestamp, release, clientId }));
}

export async function getEvent(id) {
  await syncEventsFromBucket();
  return events.find((e) => e.id === id);
}