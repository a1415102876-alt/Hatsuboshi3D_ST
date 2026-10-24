import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const continuation = source.slice(source.indexOf('  function continueProducerAfterTtsSetup()'), source.indexOf('  document.getElementById("ttsSetupBackBtn")'));
const submit = source.slice(source.indexOf('  function submitFishTtsSetup()'), source.indexOf('\n  function ', source.indexOf('  function submitFishTtsSetup()') + 5));
for (const mode of ['hatsu', 'nia', 'sandbox']) test(`voice setup preserves the ${mode} startup continuation`, () => {
    const calls = [], state = { produceScenario: mode === 'nia' ? 'nia' : 'hatsu' };
    const ctx = { state, selectedIdol: '藤田琴音', document: { getElementById: () => ({ classList: { add() {}, remove() {} } }) },
        isSandboxLaunch: () => mode === 'sandbox', normalizeNiaState: value => value || {}, saveState: reason => calls.push(reason || 'saved'),
        triggerWipeTransition: action => action(), openNiaInheritancePanel: () => calls.push('inheritance'),
        openSandboxApiSetupPanel: () => calls.push('sandbox-api'), applyIdolPreset: () => calls.push('idol'),
        startOpeningStory: () => calls.push('opening'), showToast() {} };
    vm.createContext(ctx); vm.runInContext(continuation, ctx); ctx.continueProducerAfterTtsSetup();
    if (mode === 'nia') { assert.ok(calls.includes('inheritance')); assert.ok(!calls.includes('idol')); }
    if (mode === 'hatsu') { assert.ok(calls.includes('idol')); assert.ok(calls.includes('opening')); }
    if (mode === 'sandbox') { assert.ok(calls.includes('sandbox-api')); assert.equal(state.sandbox.apiSetupPending, true); assert.ok(!calls.includes('opening')); }
});
test('voice setup allows disabled TTS and blocks enabled TTS with an empty key', () => {
    let continued = 0, configured = 0;
    const fields = { setupFishTtsEnabled: { checked: true }, setupFishTtsApiKey: { value: '', focus() {} },
        setupFishTtsProxyUrl: { value: 'https://proxy.test' }, setupFishTtsModel: { value: 'model' },
        ttsSetupStatus: {}, ttsSetupPanel: { classList: { add() {} } } };
    const ctx = { selectedIdol: '藤田琴音', document: { getElementById: id => fields[id] }, configureFishTts: () => { configured++; return { persisted: true }; },
        fishTtsSavedStatus: () => '已保存', saveState() {}, showToast() {}, continueProducerAfterTtsSetup: () => continued++ };
    vm.createContext(ctx); vm.runInContext(submit, ctx);
    assert.equal(ctx.submitFishTtsSetup(), false); assert.equal(continued, 0); assert.equal(configured, 0);
    fields.setupFishTtsEnabled.checked = false;
    assert.equal(ctx.submitFishTtsSetup(), true); assert.equal(continued, 1); assert.equal(configured, 1);
});
