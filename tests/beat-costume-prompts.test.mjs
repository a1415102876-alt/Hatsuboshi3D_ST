import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('  function beatCostumePromptBlock()');
const end = source.indexOf('  function parseBeatChoiceBlock', start);
assert.ok(start >= 0 && end > start);
const body = source.slice(start, end);
function prompt(kotone, type = '') {
    return vm.runInNewContext(`${body}\nbeatCostumePromptBlock()`, {
        state: { activeStoryNode: { type } }, isKotoneBeatIdol: () => kotone,
    });
}

test('Beat prompts tell other idols how to request and retain Solo1', () => {
    const text = prompt(false);
    assert.match(text, /costume="Solo1"/);
    assert.match(text, /costume="Default"/);
    assert.match(text, /各自|每位/);
    assert.match(text, /亚纱里/);
});

test('Kotone First Live still starts and stays in her personal song costume', () => {
    for (const type of ['firstLivePre', 'firstLivePost', 'sandboxFirstLivePre', 'sandboxFirstLivePost']) {
        assert.match(prompt(true, type), /琴音第一句 Beat 必须写 costume="Solo1"/);
        assert.match(prompt(true, type), /不在演后立即换回/);
    }
});
