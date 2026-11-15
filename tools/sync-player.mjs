import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.resolve(process.argv[2] || 'G:/SillyTavern/gakumas-player');
const stage = path.join(root, 'mmd-dialogue-stage');
if ([root, stage].map(value => path.resolve(value)).includes(source)) throw new Error('Source must be a separate Player checkout');

// Stage's landing page runs NIA audition embeds. Its worldbook reader must
// continue reading the host SillyTavern session rather than a static snapshot.
const preserved = new Set(['index.html', 'app.js', 'worldbook-scan.js']);
const excluded = new Set(['package.json', 'crocodile-ride.html', 'gakumas-player-swiss-preview.html']);
const extensions = new Set(['.js', '.css', '.html', '.json']);
const changed = [];
const manifest = JSON.parse(await fs.readFile(path.join(source, 'resource-manifest.json'), 'utf8'));
for (const [key, entry] of Object.entries(manifest.assets)) {
    if (entry.delivery !== 'frontend') continue;
    const bytes = await fs.readFile(path.join(source, entry.local));
    if (bytes.length !== entry.size || createHash('sha256').update(bytes).digest('hex') !== entry.hash) {
        throw new Error(`Player asset does not match its manifest: ${key}`);
    }
}

async function write(relative, bytes) {
    const destination = path.join(root, relative);
    try { if ((await fs.readFile(destination)).equals(bytes)) return; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    changed.push(relative.replaceAll('\\', '/'));
}

async function copy(relative) {
    let bytes = await fs.readFile(path.join(source, relative));
    // The embedded player runs under hatsu-produce-local/, so these existing
    // document-relative fallbacks must keep pointing at the sibling Stage.
    if (relative === 'library.json') {
        const config = JSON.parse(bytes);
        config.localBase = '/mmd-dialogue-stage/library/file';
        bytes = Buffer.from(JSON.stringify(config, null, 2) + '\n');
    } else if (relative === 'library-client.js' || relative === 'stage-props.js') {
        bytes = Buffer.from(bytes.toString().replace("'library/file'", "'/mmd-dialogue-stage/library/file'")
            .replace("'assets/props/'", "'/mmd-dialogue-stage/assets/props/'"));
    }
    await write(path.join('mmd-dialogue-stage', relative), bytes);
}

async function copyTree(relative) {
    for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
        if (entry.isSymbolicLink() || entry.name.startsWith('.') || /(?:\.bak|previous-)/i.test(entry.name)) continue;
        const child = path.join(relative, entry.name);
        if (entry.isDirectory()) await copyTree(child);
        else if (entry.isFile()) await copy(child);
    }
}

for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.') || preserved.has(entry.name) || excluded.has(entry.name)) continue;
    if (extensions.has(path.extname(entry.name))) await copy(entry.name);
}
for (const directory of ['gakumas-player', 'sandbox', 'ui', 'vendor', 'assets', 'scene-shader-data']) await copyTree(directory);
for (const name of await fs.readdir(path.join(source, 'tests'))) {
    if (name.endsWith('.test.mjs')) await copy(path.join('tests', name));
}
await copyTree('tests/fixtures');
for (const entry of Object.values(manifest.assets)) if (entry.delivery === 'frontend') await copy(entry.local);
await copy('LICENSE');

// The embedded and standalone players use the same TTS client and voice IDs.
await write('hatsu-produce-local/fish-tts.js', await fs.readFile(path.join(source, 'fish-tts.js')));

// Refresh the host entry points while retaining their SillyTavern/NIA logic.
for (const relative of ['hatsu-produce-local/app.js', 'hatsu-produce-local/index.html', 'hatsu-produce-local/st.html', 'hatsu-produce-local/nia-live-beat-player.js', 'mmd-dialogue-stage/index.html', 'mmd-dialogue-stage/beat-player.html']) {
    const original = await fs.readFile(path.join(root, relative), 'utf8');
    const text = original.replaceAll('20261103-fktn-profile-r2-v1', '20261115-player-sync-v1')
        .replaceAll('20261102-actor-pose-v1', '20261115-player-sync-v1')
        .replaceAll('20261027-name-dict-v1', '20261115-player-sync-v1')
        .replaceAll('20261106-tts-host-v1', '20261115-player-sync-v1')
        .replaceAll('20261102-editor-motion-swap-v2', '20261115-player-sync-v1')
        .replaceAll('20261105-floor-ssr-v1', '20261115-player-sync-v1')
        .replace('mod.createSceneDirector(layer);', 'mod.createSceneDirector(layer, { sharedStage: new URLSearchParams(window.location.search).get("stage") !== "private" });')
        .replaceAll('https://hatsuboshitest.a1415102876.workers.dev/api/fish-tts', 'https://tts.sawadaz.xyz/api/fish-tts');
    await write(relative, Buffer.from(text));
}

await fs.writeFile(path.join(root, 'docs/player-snapshot.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), source,
    preserved: [...preserved],
    adapted: ['library.json', 'library-client.js', 'stage-props.js'],
    frontendAssets: Object.values(manifest.assets).filter(entry => entry.delivery === 'frontend').length,
    changed,
}, null, 2) + '\n');
console.log(JSON.stringify({ changed: changed.length, frontendAssets: Object.values(manifest.assets).filter(entry => entry.delivery === 'frontend').length }));
