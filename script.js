// move-sourcemaps.js
//
// Run this by hand, AFTER you build tradeweb as usual (e.g. npm run build:pre-prod).
// It does not touch tradeweb's config or scripts at all — it just reads its
// finished dist/js output and moves the .map files out of it.
//
//   node move-sourcemaps.js
//
// Edit the two paths below once to match your machine, then forget about them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 👇 tradeweb's build output folder (where the just-built .js + .map files land)
const BUILD_JS_DIR = 'C:\\Users\\kunal3_trainee\\Desktop\\dhani-stocks-webapp-frontend\\services\\frontend\\dist\\js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 your SDK server's folder that the resolver reads maps from
const SOURCEMAPS_DEST = path.join(__dirname, 'sourcemaps');

function moveFile(src, dest) {
    try {
        // renameSync = an OS-level "move" (near-instant, no real copying of bytes
        // when src/dest are on the same drive)
        fs.renameSync(src, dest);
    } catch (err) {
        // EXDEV = "these two paths are on different drives/volumes" — rename can't
        // jump drives, so fall back to copy-then-delete, which works everywhere
        if (err.code === 'EXDEV') {
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
        } else {
            throw err;
        }
    }
}

function moveMapFiles(dir, dest) {
    let moved = 0;
    // withFileTypes: true lets us tell files and folders apart without a second call
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            moved += moveMapFiles(srcPath, dest); // recurse, just in case of subfolders
            continue;
        }

        if (entry.name.endsWith('.map')) {
            moveFile(srcPath, path.join(dest, entry.name));
            moved++;
        }
    }

    return moved;
}

if (!fs.existsSync(BUILD_JS_DIR)) {
    console.error(`❌ Build folder not found: ${BUILD_JS_DIR}`);
    console.error(`   Did you run the tradeweb build first?`);
    process.exit(1);
}

fs.mkdirSync(SOURCEMAPS_DEST, { recursive: true });
const moved = moveMapFiles(BUILD_JS_DIR, SOURCEMAPS_DEST);

console.log(`✅ Moved ${moved} .map file(s) into ${SOURCEMAPS_DEST}`);

const leftover = fs
    .readdirSync(BUILD_JS_DIR, { recursive: true })
    .filter((f) => f.endsWith('.map'));
if (leftover.length > 0) {
    console.warn(`⚠️  ${leftover.length} .map file(s) still in dist/js — check manually`);
}