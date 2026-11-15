import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Assets delivered from this repository are verified by size and SHA-256 at
// load time. Editing one without refreshing resource-manifest.json breaks
// every playback that needs it, so keep the two in lockstep.
test('repo-delivered assets match resource-manifest.json size and hash', () => {
    const manifest = JSON.parse(readFileSync(new URL('../resource-manifest.json', import.meta.url), 'utf8'));
    const frontend = Object.entries(manifest.assets).filter(([, entry]) => entry.delivery === 'frontend');
    assert.ok(frontend.length > 0);
    for (const [key, entry] of frontend) {
        const bytes = readFileSync(new URL(`../${entry.local}`, import.meta.url));
        assert.equal(bytes.length, entry.size, `${key} size`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.hash, `${key} hash`);
    }
});
