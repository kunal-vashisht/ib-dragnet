import { Storage } from '@google-cloud/storage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); 

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'gcp-key.json')
});

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'pib-web-uat-config';

export async function signURL(req, res) {
  try {
    const { release } = req.body;
    const clientId = req.body.clientId ?? req.body.clientid; 

    const clean = (value, fallback) =>
      /^[A-Za-z0-9._-]{1,64}$/.test(String(value ?? '')) ? String(value) : fallback;

    const unique = crypto.randomBytes(4).toString('hex'); // two uploads in the same millisecond can't overwrite each other
    const filename = `trade_web_logs/events/${clean(release, 'unknown')}-${Date.now()}-${clean(clientId, 'anonymous')}-${unique}.json`;

    const file = storage.bucket(BUCKET_NAME).file(filename);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: 'application/json',
    });

    console.log(`status: ok; responding with ${uploadUrl}`)
    res.json({ uploadUrl, filename });
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}