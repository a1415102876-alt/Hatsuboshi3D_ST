import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../hatsu-produce-local/nia-audition-player.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/m, '')
    .replace('export class', 'class')
    .replaceAll('import.meta.url', "'http://parent.test/hatsu-produce-local/nia-audition-player.js'");
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(locationOrigin = 'http://parent.test') {
    const messages = [], errors = [], ended = [], timers = new Set();
    const cover = deferred(), reveal = deferred();
    let listener, reveals = 0, disposed = false;
    const loading = { covered: cover.promise, reveal() { reveals++; return reveal.promise; }, fail: message => errors.push(message), dispose() { disposed = true; } };
    const host = { append(frame) { this.frame = frame; } };
    const win = { origin: 'http://parent.test', location: { origin: locationOrigin }, addEventListener(_type, fn) { listener = fn; }, removeEventListener() { listener = null; } };
    const context = vm.createContext({
        URL, window: win, beatActorId: () => 'hmsz',
        setTimeout(fn) { timers.add(fn); return fn; }, clearTimeout(fn) { timers.delete(fn); },
        document: { createElement() { return { style: {}, contentWindow: { postMessage: data => messages.push(data) }, remove() { this.removed = true; } }; } }
    });
    const Player = vm.runInContext(source + '\nNiaAuditionSuccessPlayer;', context);
    const player = new Player(host, { loading });
    player.play({ requestId: 'one', idol: '秦谷美铃', round: 1 }, { onEnded: () => ended.push(true) });
    return {
        player, host, cover, reveal, messages, errors, ended, timers,
        get reveals() { return reveals; }, get disposed() { return disposed; }, get listening() { return !!listener; },
        send(type, extra = {}, origin = 'http://parent.test') { listener?.({ source: host.frame.contentWindow, origin, data: { type: 'hatsu-nia-audition:' + type, requestId: 'one', ...extra } }); }
    };
}

test('real audition player waits for resources, coverage and the completed reveal before starting', async () => {
    const h = harness();
    h.send('ready', {}, 'http://foreign.test'); assert.equal(h.messages.length, 0);
    h.send('ready'); h.send('ready'); assert.equal(h.messages.length, 1); assert.equal(h.messages[0].deferStart, true);
    h.send('prepared', { requestId: 'old' }); await flush(); assert.equal(h.reveals, 0);
    h.send('prepared'); await flush(); assert.equal(h.reveals, 0); assert.equal(h.host.frame.style.visibility, 'hidden');
    h.cover.resolve(true); await flush(); assert.equal(h.reveals, 1); assert.equal(h.host.frame.style.visibility, 'visible');
    assert.equal(h.messages.some(message => message.type.endsWith(':start')), false);
    h.send('ended'); assert.equal(h.ended.length, 0);
    h.reveal.resolve(true); await flush(); assert.equal(h.messages.at(-1).type, 'hatsu-nia-audition:start');
    h.send('started'); assert.equal(h.timers.size, 0); h.send('ended'); h.send('ended'); assert.equal(h.ended.length, 1);
    h.player.dispose(); assert.equal(h.listening, false);
});

test('disposing during the circular reveal cannot start the discarded iframe', async () => {
    const h = harness(); h.cover.resolve(true); h.send('ready'); h.send('prepared'); await flush();
    h.player.dispose(); h.reveal.resolve(true); await flush();
    assert.equal(h.disposed, true); assert.equal(h.host.frame.removed, true); assert.equal(h.timers.size, 0); assert.equal(h.listening, false);
    assert.equal(h.messages.some(message => message.type.endsWith(':start')), false);
});

test('resource failure cancels the embed and keeps its error screen instead of accepting completion', () => {
    const h = harness(); h.send('ready'); h.send('error', { message: '场地加载失败' }); h.send('ended');
    assert.deepEqual(h.errors, ['场地加载失败']); assert.equal(h.messages.at(-1).type, 'hatsu-nia-audition:cancel');
    assert.equal(h.host.frame.removed, true); assert.equal(h.ended.length, 0); assert.equal(h.timers.size, 0); h.player.dispose();
});

// Chrome throttles animation frames in visibility:hidden cross-origin iframes.
test('covered cross-origin frame can render its prepared first frame before the reveal', async () => {
    const h = harness();
    assert.equal(h.host.frame.style.visibility, 'hidden');
    h.send('ready');
    h.cover.resolve(true); await flush();
    assert.equal(h.host.frame.style.visibility, 'visible');
    assert.equal(h.reveals, 0);
    assert.equal(h.messages.some(message => message.type.endsWith(':start')), false);
    h.send('prepared'); await flush();
    assert.equal(h.reveals, 1);
    h.reveal.resolve(true); await flush();
    assert.equal(h.messages.at(-1).type, 'hatsu-nia-audition:start');
    h.player.dispose();
});

test('coverage finishing after disposal never unhides a discarded frame', async () => {
    const h = harness(); h.player.dispose();
    h.cover.resolve(true); await flush();
    assert.equal(h.host.frame.style.visibility, 'hidden');
    assert.equal(h.host.frame.removed, true);
    assert.equal(h.messages.some(message => message.type.endsWith(':start')), false);
});

test('inherited srcdoc origins are explicitly passed to the remote audition iframe', () => {
    const h = harness('null');
    assert.equal(new URL(h.host.frame.src).searchParams.get('parentOrigin'), 'http://parent.test');
    h.player.dispose();
});

test('startup timeout identifies a missing handshake instead of blaming downloads', () => {
    const h = harness(); [...h.timers][0]();
    assert.match(h.errors[0], /播放器.*(?:启动|就绪)/);
    h.player.dispose();
});

test('preparation timeout identifies the model and scene stage after downloads finish', () => {
    const h = harness(); h.send('ready'); h.send('progress', {progress:{phase:'preparing'}});
    [...h.timers][0](); assert.match(h.errors[0], /模型.*场景/);
    h.player.dispose();
});
