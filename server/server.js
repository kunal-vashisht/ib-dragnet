import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'url';
import {getEvent, issueEvents, listIssues } from './store.js';
import { signURL } from './utils/gcp.js'; 

const ENV = process.env.ENV || 'uat';
dotenv.config({ path: `.env.${ENV}` });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

const quiet = /^\/api\/(issues|events)/;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.use((req, res, next) => {
  if (!(req.method === 'GET' && quiet.test(req.url))) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});


app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
  });
});

app.post('/api/upload-url', signURL);

// Dashboard API
app.get('/api/issues', async (req, res) => {
  try {
    const issues = await listIssues(req.query);
    res.json(issues);
  } catch (err) {
    console.error('Error fetching issues:', err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

app.get('/api/issues/:id/events', async (req, res) => {
  try {
    const events = await issueEvents(req.params.id);
    res.json(events);
  } catch (err) {
    console.error('Error fetching issue events:', err);
    res.status(500).json({ error: 'Failed to fetch issue events' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await getEvent(req.params.id);
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (err) {
    console.error('Error fetching event details:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});


app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${ENV}`);
  console.log('='.repeat(50) + '\n');
  console.log('Press Ctrl+C to stop\n');
});