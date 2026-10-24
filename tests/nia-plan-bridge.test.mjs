import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildNiaPlanPrompt, parseNiaPlanPayload } from '../nia-prototype-api.js';

const st = await readFile(new URL('../st.html', import.meta.url), 'utf8');
const data = JSON.parse(await readFile(new URL('./fixtures/nia-plan-hiro.json', import.meta.url), 'utf8'));
const reply = '<NIA_PLAN>\n' + JSON.stringify(data, null, 2) + '\n</NIA_PLAN>';
const draft = { goal: data.goal.playerGoal, image: data.publicImage, approach: data.spine, businessMethods: ['online_live', 'school_radio'] };
// The failed request explicitly forbade these tags. A negative example must
// not override the explicit output mode, including when resending old prompts.
const failedPrompt = buildNiaPlanPrompt(draft, { idol: '筱泽广' }) + '\n不输出<beat>、<choice>、<story>。';
function functionSource(name) {
  const match = new RegExp('^    (?:async )?function ' + name + '\\(', 'm').exec(st);
  assert.ok(match, name);
  const start = match.index;
  const next = st.slice(start + 1).search(/\n    (?:async )?function /);
  return st.slice(start, start + 1 + next);
}
function bridgeContext(extra = {}) {
  const context = vm.createContext(extra);
  vm.runInContext(['readBeatChoiceOptions', 'hasCompleteOptionPayload', 'isGeneratedTextCompatibleWithPrompt']
    .map(functionSource).join('\n'), context);
  return context;
}
test('reported Hiro plan is valid data and survives the bridge with Beat tags forbidden in its prompt', () => {
  assert.equal(parseNiaPlanPayload({ rawText: reply }).ok, true);
  assert.equal(bridgeContext().isGeneratedTextCompatibleWithPrompt(failedPrompt, reply), true);
});
test('explicit NIA plan mode rejects unrelated Beat replies and incomplete envelopes', () => {
  const { isGeneratedTextCompatibleWithPrompt: accept } = bridgeContext();
  assert.equal(accept(failedPrompt, '<beat speaker="nasr">评语</beat>'), false);
  assert.equal(accept(failedPrompt, '<NIA_PLAN>{"days":['), false);
  assert.equal(accept(failedPrompt, reply.replaceAll('<', '&lt;').replaceAll('>', '&gt;')), true);
  assert.equal(accept('<beat>剧情</beat><choice>选项</choice>', '<beat speaker="nasr">评语</beat>'), true);
});
test('NIA plan prompt does not activate the literal Beat worldbook keyword', () => {
  assert.doesNotMatch(buildNiaPlanPrompt(draft, { idol: '筱泽广' }), /<beat\b/i);
});
test('transactional host forwards the real five-day plan instead of rolling back and posting an empty reply', async () => {
  const committed = [], chat = [], rollbacks = [];
  const context = bridgeContext({
    getContext: () => ({ eventSource: null, chat }),
    createSilentChatMessage: async (role, text, requestId) => {
      chat.push({ is_user: role === 'user', mes: text, extra: { hatsuRequestId: requestId } });
      return chat.length - 1;
    },
    persistChatSilently: async () => {},
    rollbackSilentUserMessage: (...args) => rollbacks.push(args),
    extractReplyTextFromGenerated: value => String(value || '').trim(),
    isGenerationEndedPayloadForRequest: () => false,
    normalizeGenerationEndedText: () => null,
    postCommittedReply: (...args) => committed.push(args),
    // The successful generation settles first; no live model or lingering timer.
    setTimeout: () => 0, Promise
  });
  vm.runInContext(functionSource('runTransactionalViaTavernHelper'), context);
  await context.runTransactionalViaTavernHelper({ generate: async () => reply }, failedPrompt, 'nia-request', 'nia-lease');
  assert.equal(rollbacks.length, 0);
  assert.equal(committed.length, 1);
  assert.equal(committed[0][1], reply);
  assert.equal(committed[0][2].channelLeaseId, 'nia-lease');
  assert.equal(parseNiaPlanPayload({ rawText: committed[0][2].rawText }).ok, true);
  assert.deepEqual(chat.map(row => row.is_user), [true, false]);
});
