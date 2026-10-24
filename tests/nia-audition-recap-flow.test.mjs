import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('result confirmation applies rewards before requesting the recap opening', () => {
  const start = app.indexOf('function confirmNiaAuditionResult()');
  const end = app.indexOf('function isNiaPostAuditionChoiceActive()', start);
  const body = app.slice(start, end);
  assert.match(body, /progressionApplied:\s*true/);
  assert.match(body, /fans:\s*training\.fans \+ fanGain/);
  assert.match(body, /state\[key\] = clamp/);
  assert.match(body, /requestNiaPostAuditionOpening\(\)/);
  assert.ok(body.indexOf('progressionApplied: true') < body.indexOf('requestNiaPostAuditionOpening()'));
  assert.doesNotMatch(body, /niaAuditionSession = null/);
});

test('fan milestone unlocked by audition rewards waits until the recap is complete', () => {
  const confirmStart = app.indexOf('function confirmNiaAuditionResult()');
  const confirmEnd = app.indexOf('function isNiaPostAuditionChoiceActive()', confirmStart);
  const confirmBody = app.slice(confirmStart, confirmEnd);
  assert.match(confirmBody, /reconcileNiaFanMilestoneAfterSettlement\(\{ defer: true \}\)/);
  assert.ok(confirmBody.indexOf('reconcileNiaFanMilestoneAfterSettlement') < confirmBody.indexOf('requestNiaPostAuditionOpening()'));
  assert.doesNotMatch(confirmBody, /if \(reconcileNiaFanMilestoneAfterSettlement/);

  const completeStart = app.indexOf('function completeNiaPostAuditionAfterPlayback()');
  const completeEnd = app.indexOf('function retryNiaAuditionSegment()', completeStart);
  const completeBody = app.slice(completeStart, completeEnd);
  assert.match(completeBody, /reconcileNiaFanMilestoneAfterSettlement\(\)/);
  assert.ok(completeBody.indexOf('saveState("nia.audition.recap_completed")') < completeBody.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));

  const resumeStart = app.indexOf('function resumeNiaModeIfNeeded()');
  const resumeEnd = app.indexOf('function resumeNiaScheduleShareIfNeeded()', resumeStart);
  const resumeBody = app.slice(resumeStart, resumeEnd);
  assert.match(resumeBody, /shouldDeferPendingFanMilestoneForAuditionRecap\(\)/);
  assert.ok(resumeBody.indexOf('resumeNiaAuditionIfNeeded()') < resumeBody.lastIndexOf('resumeNiaFanMilestoneIfNeeded()'));
});

test('FINALE recap plays the dedicated post-show live before episodes 19 and 20', () => {
  assert.match(app, /getCurrentNiaRoute\(\)\?\.assets\?\.finaleVideo/);
  assert.match(app, /savedUrl/);
  assert.match(app, /if \(!videoUrl\) return false/);

  const completeStart = app.indexOf('function completeNiaPostAuditionAfterPlayback()');
  const completeEnd = app.indexOf('function retryNiaAuditionSegment()', completeStart);
  const completeBody = app.slice(completeStart, completeEnd);
  assert.match(completeBody, /Number\(session\.context\?\.round \|\| 1\) >= 3 && startNiaFinaleLive\(\)/);
  assert.ok(completeBody.indexOf('startNiaFinaleLive()') < completeBody.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));

  const startLiveStart = app.indexOf('function startNiaFinaleLive()');
  const startLiveEnd = app.indexOf('function resumeNiaFinaleLiveIfNeeded()', startLiveStart);
  const startLiveBody = app.slice(startLiveStart, startLiveEnd);
  assert.match(startLiveBody, /Number\(nia\.round\) < 3/);
  assert.match(startLiveBody, /playLiveVideo\(videoUrl, completeNiaFinaleLive\)/);

  const completeLiveStart = app.indexOf('function completeNiaFinaleLive()');
  const completeLiveEnd = app.indexOf('function startNiaFinaleLive()', completeLiveStart);
  const completeLiveBody = app.slice(completeLiveStart, completeLiveEnd);
  assert.ok(completeLiveBody.indexOf('saveState("nia.finale_live.completed")') < completeLiveBody.indexOf('reconcileNiaFanMilestoneAfterSettlement()'));
});

test('FINALE live video resolver prefers a saved URL and otherwise resolves the current route asset', () => {
  const start = app.indexOf('function getNiaFinaleLiveVideoUrl(');
  const end = app.indexOf('function completeNiaFinaleLive()', start);
  const functionSource = app.slice(start, end);
  const context = {
    route: { assets: { finaleVideo: 'assets/campusmode/Shinosawa-Hiro-Campusmode.mp4' } }
  };
  vm.createContext(context);
  vm.runInContext(`
    const VIDEO_CDN = "https://media.example";
    const getCurrentNiaRoute = () => route;
    ${functionSource}
    this.resolveFinaleVideo = getNiaFinaleLiveVideoUrl;
  `, context);

  assert.equal(
    context.resolveFinaleVideo({ finaleLive: { videoUrl: 'https://saved.example/finale.mp4' } }),
    'https://saved.example/finale.mp4'
  );
  assert.equal(
    context.resolveFinaleVideo({ finaleLive: { videoUrl: '' } }),
    'https://media.example/assets/campusmode/Shinosawa-Hiro-Campusmode.mp4'
  );
  assert.match(app, /finale_live\.skipped/);
});

test('an interrupted FINALE live resumes before milestone stories', () => {
  const resumeStart = app.indexOf('function resumeNiaModeIfNeeded()');
  const resumeEnd = app.indexOf('function resumeNiaInterRoundOutingIfNeeded()', resumeStart);
  const resumeBody = app.slice(resumeStart, resumeEnd);
  assert.match(resumeBody, /resumeNiaFinaleLiveIfNeeded\(\)/);
  assert.ok(resumeBody.indexOf('resumeNiaFinaleLiveIfNeeded()') < resumeBody.indexOf('resumeNiaFanMilestoneIfNeeded()'));
});

test('recap opening and resolution own separate main-model requests', () => {
  assert.match(app, /producer:\s*clone\(state\.producer \|\| \{\}\)/);
  assert.match(app, /function requestNiaPostAuditionOpening\(\)/);
  assert.match(app, /beginPostAuditionOpening/);
  assert.match(app, /buildNiaPostAuditionOpeningPrompt/);
  assert.match(app, /post_audition_opening/);
  assert.match(app, /function requestNiaPostAuditionResolution\(\)/);
  assert.match(app, /beginPostAuditionResolution/);
  assert.match(app, /buildNiaPostAuditionResolutionPrompt/);
  assert.match(app, /post_audition_resolution/);
  assert.match(app, /ownerKind:\s*"nia_audition"/);
});

test('recap failures release their primary-model lease before retry', () => {
  const start = app.indexOf('function failNiaPostAudition');
  const end = app.indexOf('function requestNiaPostAuditionOpening', start);
  const body = app.slice(start, end);
  assert.match(body, /releasePrimaryModelChannel\(session\.requestId, session\.channelLeaseId, reason\)/);
});

test('audition reply routing parses each recap phase through its tagged contract', () => {
  assert.match(app, /parseNiaPostAuditionOpeningPayload/);
  assert.match(app, /applyPostAuditionOpening/);
  assert.match(app, /parseNiaPostAuditionResolutionPayload/);
  assert.match(app, /applyPostAuditionResolution/);
  assert.match(app, /postAudition\.status === "generating_opening"/);
  assert.match(app, /postAudition\.status === "generating_resolution"/);
});

test('recap reuses VN with three generated responses and free input', () => {
  assert.match(app, /function isNiaPostAuditionChoiceActive\(\)/);
  assert.match(app, /state\.pendingOptionTexts\?\.length === 3/);
  assert.match(app, /handleNiaPostAuditionChoice\(index\)/);
  assert.match(app, /handleNiaPostAuditionCustomChoice\(customText\)/);
  assert.match(app, /source:\s*"generated_option"/);
  assert.match(app, /source:\s*"free_input"/);
  assert.match(app, /showVnCustomChoicePanel\(\)/);
});

test('resolution playback completes recap before returning to NIA', () => {
  assert.match(app, /function completeNiaPostAuditionAfterPlayback\(\)/);
  assert.match(app, /completePostAudition/);
  assert.match(app, /postAudition\?\.status === "completed"/);
  assert.match(app, /clearAuditionRankingHud\(\)/);
  assert.match(app, /setNiaPrototypeVisible\(true\)/);
});

test('refresh recovery distinguishes unfinished recap phases from a completed audition', () => {
  assert.match(app, /function resumeNiaAuditionIfNeeded\(\)/);
  assert.match(app, /retryPhase === "opening"/);
  assert.match(app, /retryPhase === "resolution"/);
  assert.match(app, /status === "awaiting_choice"/);
  assert.match(app, /status === "playing_resolution"/);
  assert.match(app, /progressionApplied && .*postAudition.*completed/s);
});
