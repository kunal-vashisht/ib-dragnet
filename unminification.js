import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache maps in memory so we don't read from disk on every error
const mapCache = new Map();

function getOriginalPosition(filename, line, col) {
    try {
        let tracer = mapCache.get(filename);

        if (!tracer) {
            // Look for the map file in our local folder
            const mapPath = path.join(__dirname, 'sourcemaps', `${filename}.map`);

            if (!fs.existsSync(mapPath)) {
                console.warn(`[unminify] no source map found for "${filename}" at ${mapPath}`);
                return null;
            }

            const mapContent = fs.readFileSync(mapPath, 'utf8');
            tracer = new TraceMap(mapContent);
            mapCache.set(filename, tracer);
        }

        return originalPositionFor(tracer, {
            line: parseInt(line, 10),
            column: parseInt(col, 10),
        });
    } catch (err) {
        console.error(`Failed to unminify ${filename}:`, err);
        return null;
    }
}

export default function processStackTrace(rawStack) {
    if (!rawStack) return '';
    const lines = rawStack.split('\n');
    const unminifiedLines = lines.map(line => {
        const match = line.match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);
        if (!match) return line;

        const [, fullUrl, lineNum, colNum] = match;

        let filename;
        try {
            filename = path.basename(new URL(fullUrl).pathname); // "328.a007a814800b27ac46dc.js"
        } catch {
            return line;
        }

        const original = getOriginalPosition(filename, lineNum, colNum);
        if (original && original.source) {
            const funcName = original.name ? ` ${original.name}` : '';
            return `    at${funcName} (${original.source}:${original.line}:${original.column})`;
        }
        return line;
    });
    return unminifiedLines.join('\n');
}