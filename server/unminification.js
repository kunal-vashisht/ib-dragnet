import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { Storage } from '@google-cloud/storage';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'pib-web-uat-config';
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'gcp-key.json')
});


const MAP_PREFIX = 'tradeweb/';
const INDEX_REFRESH_MS = 60 * 1000; // re-list the bucket at most once a minute

let mapIndex = new Map(); 
let indexBuiltAt = 0;
let indexLoading = null;

function refreshMapIndex() {
  if (indexLoading) return indexLoading; // someone is already listing: wait for that one

  indexLoading = (async () => {
    try {
      const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: MAP_PREFIX });
      const fresh = new Map();
      for (const file of files) {
        if (!file.name.endsWith('.map')) continue;
        const jsName = path.posix.basename(file.name).slice(0, -'.map'.length);
        fresh.set(jsName, file.name);
      }
      mapIndex = fresh;
      indexBuiltAt = Date.now();
      console.log(`[unminify] indexed ${fresh.size} source maps from the bucket`);
    } catch (err) {
      console.warn('[unminify] could not list source maps:', err.message);
    } finally {
      indexLoading = null;
    }
  })();

  return indexLoading;
}

const tracerCache = new Map(); 

async function loadTracer(filename) {
  let objectName = mapIndex.get(filename);
  if (!objectName && Date.now() - indexBuiltAt > INDEX_REFRESH_MS) {
    await refreshMapIndex(); // maybe it was uploaded since we last listed
    objectName = mapIndex.get(filename);
  }

  if (objectName) {
    try {
      const [content] = await storage.bucket(BUCKET_NAME).file(objectName).download();
      return new TraceMap(content.toString('utf-8'));
    } catch (err) {
      console.warn(`[unminify] could not download ${objectName}:`, err.message);
    }
  }

  try {
    const localPath = path.join(__dirname, 'sourcemaps', `${filename}.map`);
    if (fs.existsSync(localPath)) {
      return new TraceMap(fs.readFileSync(localPath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[unminify] local lookup error for ${filename}:`, err.message);
  }

  console.warn(`[unminify] no source map found for "${filename}"`);
  return null;
}

function getTracer(release, filename) {
  if (tracerCache.has(filename)) return tracerCache.get(filename);

  const promise = loadTracer(filename).then((tracer) => {
    if (!tracer) setTimeout(() => tracerCache.delete(filename), 2 * 60 * 1000); // retry "not found" after 2 minutes
    return tracer;
  });
  tracerCache.set(filename, promise);
  return promise;
}


export async function unminifyStack(rawStack = '', release = 'unknown') {
  if (!rawStack) return '';

  const lines = rawStack.split('\n');
  const unminifiedLines = await Promise.all(
    lines.map(async (line) => {
      const match = line.match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);
      if (!match) return line;

      const [, fullUrl, lineNum, colNum] = match;

      let filename;
      try {
        filename = path.basename(new URL(fullUrl).pathname);
      } catch {
        return line;
      }

      const tracer = await getTracer(release, filename);
      if (!tracer) return line;

      try {
        const original = originalPositionFor(tracer, {
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
        });

        if (original && original.source) {
          const funcName = original.name ? ` ${original.name}` : '';
          return `    at${funcName} (${original.source}:${original.line}:${original.column})`;
        }
      } catch (err) {
        console.error(`[unminify] Failed line translation in ${filename}:`, err);
      }

      return line;
    })
  );

  return unminifiedLines.join('\n');
}

export default unminifyStack;
