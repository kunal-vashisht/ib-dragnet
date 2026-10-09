import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { addEvent, getEvent, issueEvents, listIssues } from './store.js';
import processStackTrace from './unminification.js';

const ENV = process.env.ENV || 'uat';
dotenv.config({ path: `.env.${ENV}` });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve the built dashboard (dashboard/dist). Placed before the logger so asset requests aren't logged.
app.use(express.static(path.join(__dirname, 'dashboard', 'dist')));

// Request logger (skips the dashboard's 5-second polling so the terminal stays readable)
const quiet = /^\/api\/(issues|events)/;
app.use((req, res, next) => {
  if (!(req.method === 'GET' && quiet.test(req.url))) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

// Routes
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    env: ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/event', (req, res) => {

  try {
    console.log("Event from SDK: ", req.body);

    logBufferSize(req.body);
    logBreadcrumbs(req.body);
    const unminified = logStackTrace(req.body);
    addEvent(req.body, unminified);
    res.status(200).json({ ok: true });

  } catch (e) {
    console.log("Error handling event:", e);
    res.status(500).json({ ok: false });
  }
});

// Dashboard API
app.get('/api/issues', (req, res) => res.json(listIssues(req.query)));
app.get('/api/issues/:id/events', (req, res) => res.json(issueEvents(req.params.id)));
app.get('/api/events/:id', (req, res) => {
  const e = getEvent(req.params.id);
  e ? res.json(e) : res.status(404).json({ error: 'Event not found' });
});

function formatClickBreadcrumb(crumb) {
  const time = new Date(crumb.timestamp).toLocaleTimeString();
  return `[${time}] CLICK   → ${crumb.tagName}#${crumb.id}`;
}

function formatConsoleBreadcrumb(crumb) {
  const time = new Date(crumb.timestamp).toLocaleTimeString();
  const level = crumb.level ? crumb.level.toUpperCase() : 'LOG';
  return `[${time}] CONSOLE.${level} → ${crumb.message}`;
}

function formatfetchBreadcrumb(crumb) {
  const time = new Date(crumb.timestamp).toLocaleTimeString();
  const method = crumb.method.toUpperCase().padEnd(6, ' ');
  const statusText = crumb.status === 0
    ? 'NETWORK ERROR'
    : `${crumb.status} ${crumb.ok ? 'OK' : 'FAIL'}`;

  return `[${time}] FETCH.${method}→ ${crumb.url} (${statusText}, ${crumb.duration_ms}ms)`;
}

function logBufferSize(req) {
  const response = JSON.stringify(req);
  const responseSize = Buffer.byteLength(response, 'utf-8');
  const inKB = (responseSize / 1024).toFixed(2);
  console.log(`Event size: ${inKB} KB`);
}

function logBreadcrumbs(event) {
  if (!Array.isArray(event.breadcrumbs)) return;

  event.breadcrumbs.forEach((crumb) => {
    if (crumb.type === 'click') {
      console.log(formatClickBreadcrumb(crumb));
    }
    else if (crumb.type === 'console') {
      console.log(formatConsoleBreadcrumb(crumb));
    }
    else if (crumb.type === 'fetch') {
      console.log(formatfetchBreadcrumb(crumb));
    }
  });
}

function logStackTrace(event) {
  const unminifiedStack = processStackTrace(event.stack);
  console.log('\n--- UNMINIFIED STACK ---');
  console.log(unminifiedStack);
  return unminifiedStack;
}

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${ENV}`);
  console.log('='.repeat(50) + '\n');
  console.log('Press Ctrl+C to stop\n');
});