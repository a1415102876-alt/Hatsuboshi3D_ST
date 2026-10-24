import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('  function readFishTtsPreferences(');
const configFunctions = source.slice(start < 0 ? source.indexOf('  function getFishTtsConfig(') : start, source.indexOf('  const modalRegistry ='));
function page(saved = new Map(), stateConfig = {}) {
    const ctx = { state: { fishTts: stateConfig }, FISH_TTS_STORAGE_KEY: 'hatsuProduceTtsPreferences',
        FISH_TTS_DEFAULT_MODEL: 's2.1-pro-free', FISH_TTS_DEFAULT_PROXY_URL: 'https://proxy.test/tts', fishTtsRuntimeApiKey: '',
        localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) },
        showToast() {}, HatsuFishTts: { configure(value) { ctx.applied = value; } } };
    vm.createContext(ctx); vm.runInContext(configFunctions, ctx); return ctx;
}

test('TTS credentials and settings restore after a new page without adding the key to chat state', () => {
    const storage = new Map(), first = page(storage);
    first.configureFishTts({ enabled: true, apiKey: 'test-only-key', model: 'custom-model', proxyUrl: 'https://voice.test/api' });
    const second = page(storage);
    const result = second.configureFishTts();
    assert.equal(result.hasApiKey, true);
    assert.equal(second.applied.apiKey, 'test-only-key');
    assert.equal(second.applied.model, 'custom-model');
    assert.equal(second.applied.proxyUrl, 'https://voice.test/api');
    assert.equal(second.applied.enabled, true);
    assert.equal(Object.hasOwn(second.state.fishTts, 'apiKey'), false);
});
test('changing settings keeps the saved key and explicitly clearing it survives reload', () => {
    const storage = new Map(), first = page(storage);
    first.configureFishTts({ enabled: true, apiKey: 'test-only-key' });
    const second = page(storage); second.configureFishTts({ model: 'another-model' });
    assert.equal(second.applied.apiKey, 'test-only-key');
    second.configureFishTts({ apiKey: '' });
    assert.equal(page(storage).configureFishTts().hasApiKey, false);
});
test('browser voice preferences survive a new gameplay save or a different host chat state', () => {
    const storage = new Map(), first = page(storage);
    first.configureFishTts({ enabled: true, apiKey: 'test-only-key' });
    const second = page(storage, { enabled: false, model: 'old-chat-model' });
    assert.equal(second.configureFishTts().enabled, true);
    assert.equal(second.applied.model, 's2.1-pro-free');
});
test('a failed browser write is reported while the current page can still use the entered configuration', () => {
    const ctx = page(); ctx.localStorage.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    const result = ctx.configureFishTts({ enabled: true, apiKey: 'test-only-key' });
    assert.equal(result.persisted, false);
    assert.equal(ctx.applied.apiKey, 'test-only-key');
});
