import { BeatPlayerApp } from '../beat-player.js?v=20261103-fktn-profile-r2-v1';
import { setLivePictureOptions } from '../live-portrait.js?v=20261103-fktn-profile-r2-v1';
import { beatActorId } from '../beat-player-core.js?v=20261102-krnh-3d-v1';
import { advanceSandboxMinutes, applyStoryMinutes, buildSandboxSnapshot, createSandboxState, parseSandboxAdvance, parseSandboxClockSet, parseTimeMark, setSandboxClock, validateAction } from './sandbox-core.js?v=20261029-commission-v1';
import { buildActionBeat, runSandboxAction } from './sandbox-beat.js';
import { commitLongPlan, parseLongPlan, validateLongPlan } from './sandbox-planner.js?v=20261028-field-garden-v1';
import { applyQuestEffects, getQuestStatusSummary, isFirstLiveReady, parsePraiseFlag } from './sandbox-quests.js?v=20261028-story-guide-v1';
import { clearSandboxSave, readSandboxSave, writeSandboxSave } from './sandbox-save.js?v=20261028-suggest-v1';
import { chatCompletionsUrl, createLocalChatBridge, normalizeChatReply } from '../beat-chat.js?v=20261029-antigravity-token-fallback-v2';
import { loadTavernWorldbook } from '../worldbook-scan.js?v=20261024-worldbook-v1';
import { applyFishTtsSettings, fishTtsStatus, resolveFishTtsSettings } from '../free-chat-tts.js?v=20261024-tts-v1';
import { SANDBOX_CHAT_SETTINGS_KEY, buildSandboxChatSettings, mergeStoredChatSettings, readStoredFreeChatSettings } from './sandbox-chat.js?v=20261026-settings-persist-v1';
import { mountSandboxPhone } from './sandbox-phone.js?v=20261027-phone-v2';
import { applySceneCastPatch, buildSandboxContactPrompt, canonicalCastIdol, extractSceneCastPatch, latestPendingContact } from './sandbox-cast.js?v=20261028-field-garden-v1';
import { affinityStageLabel, affinityStageTag, applyAffinityDelta, buildSandboxAiContext, parseAffinityDelta } from './sandbox-affinity.js?v=20261028-suggest-v1';
import {
  appendEventArchive,
  applyDailyEventPatch,
  buildEventPlanPrompt,
  closeDailyEvent,
  dailyEventNeedsPlan,
  emptyDailyEvent,
  loadCsprtReferences,
  markEventOpeningPlayed,
  markEventPlanAttempted,
  parseEventBlueprint,
  buildEventOpeningFallback,
  buildEventOpeningPrompt,
  recentCsprtIds,
  splitEventPatch,
  eventPlanCanRetry,
} from './sandbox-event.js?v=20261028-daily-event-v4';
import { isSandboxCampusLocation, formatSandboxPresenceLine, sandboxIdolsAt, sandboxIdolsHere, sandboxPeopleHere } from './sandbox-presence.js?v=20261028-field-garden-v1';
import { sceneIdolId } from '../scene-protocol.js?v=20261102-krnh-3d-v1';
import {
  buildProduceOpeningPrompt,
  listProduceIdols,
  markProduceOpeningSeen,
  produceOpeningContext,
  produceRunStarted,
} from './sandbox-opening.js?v=20261028-produce-start-v1';
import {
  activeCommissionAt,
  buildCommissionPlanPrompt,
  buildCommissionResultFallback,
  buildCommissionResultPrompt,
  buildCommissionSceneFallback,
  buildCommissionScenePrompt,
  commissionBoardFromPool,
  commissionChoiceForText,
  commissionFameTier,
  commissionTagLabel,
  commissionTierLabel,
  commissionsNeedPlan,
  emptyCommissionBoard,
  formatCommissionReward,
  parseCommissionBoard,
  rememberCommissionScene,
  setActiveCommission,
  settleCommission,
} from './sandbox-commissions.js?v=20261029-commission-v1';
import { buildSandboxFirstLivePrompt, buildSandboxPlanPrompt, normalizeSandboxFirstLiveReply, normalizeSandboxPlanReply } from './sandbox-ai.js?v=20261028-campus-rooms-v1';
import { buildDayMemoryPrompt, sanitizeDayMemory, settleSandboxDay } from './sandbox-day.js?v=20261028-story-guide-v1';
import { appendStoryLog, buildStoryGuidePrompt, emptyStoryGuide, normalizeStoryGuide, normalizeStoryLog, parseStoryGuide } from './sandbox-story-guide.js?v=20261028-field-garden-v1';
import { buildDayActionLog } from './sandbox-journal.js?v=20261027-day-memory-log-v1';
import { FRONT_GATE_MENU, OUTING_MENU, canLocationHostAction, getSandboxLocation, listSandboxLocations, locationAreaFor, locationAreaPlaces, migrateSandboxLocationBackground, sandboxCameraLocked, sandboxLocationBackground, sandboxLocationCameraOptions, syncSandboxLocationBackground } from './sandbox-world.js?v=20261028-field-garden-v1';
import { buildArrivalPrompt, buildIdolOrderPrompt, describeIdolOrder, fallbackOrderScript, idolVisible, normalizeIdolOrder, orderCommandFromChoice, planIdolOrder, presenceOpening, resolveArrival, withoutIdolCast } from './sandbox-orders.js?v=20261028-suggest-v1';
import { CITY_MAP_VIEW, renderSandboxMap } from './sandbox-map.js?v=20261028-field-garden-v1';
import { produceActionSettlement, produceMeters, rankSpriteStyle } from './sandbox-produce-stats.js?v=20261026-produce-actions-v1';
import { SANDBOX_PICTURE_KEY, normalizeSandboxPicture } from './sandbox-picture.js?v=20261030-dialogue-font-v1';
import { installSandboxResponsiveLayout } from './sandbox-layout.js?v=20261029-desktop-layout-v3';
import { buildWeirdContinuationPrompt, buildWeirdScriptPrompt, extractClosedBeatScript, prepareDirectBeatScript, WEIRD_SCRIPT_MODE } from './sandbox-weird-script.js?v=20261029-weird-script-bg-v1';

const PRODUCE_UI = '../hatsu-produce-local/UI/';
const PRODUCE_CARDS = Object.freeze([
  ['lesson', 'Vo', 'Vo公开课', 'Lesson_Vo.png'],
  ['lesson', 'Da', 'Da公开课', 'Lesson_Da.png'],
  ['lesson', 'Vi', 'Vi公开课', 'Lesson_Vi.png'],
  ['training', 'Vo', 'Vo训练', 'Vo.png'],
  ['training', 'Da', 'Da训练', 'Da.png'],
  ['training', 'Vi', 'Vi训练', 'Vi.png'],
]);
const MINI_ICONS = Object.freeze({ Vo: 'Vo_Mini.png', Da: 'Da_Mini.png', Vi: 'Vi_mini.png' });

const BACKGROUND = '3d-adv-classroom-00-00-noon';
const field = (id) => document.getElementById(id);
let tavernBook = [];

function collectChatSettings() {
  return buildSandboxChatSettings(readStoredFreeChatSettings(), {
    idolName: state?.idolId || '藤田琴音',
    worldbookEntries: tavernBook,
  });
}

const localBridge = createLocalChatBridge({
  getSettings: collectChatSettings,
  currentDay: () => state?.day || 1,
  onRemember(idolId, turn) {
    const history = [...(state.chatHistory || []), {
      day: state.day,
      idolId,
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      text: String(turn.text || '').slice(0, 240),
      content: String(turn.content || '').slice(0, 8000),
      label: String(turn.label || ''),
    }];
    state = writeSandboxSave({ ...state, chatHistory: history });
  },
});
const bridge = {
  requestContext: (...args) => localBridge.requestContext(...args),
  historyFor: (idolName) => localBridge.historyFor(idolName),
  clear: (idolName) => localBridge.clear(idolName),
  dispose: () => localBridge.dispose(),
  async send(prompt, options) {
    const payload = await localBridge.send(prompt, options);
    const raw = payload?.rawText || payload?.text || '';
    const idolHere = idolVisible(state?.idolOrder, state?.currentLocationId);
    let next = idolHere ? applyAffinityDelta(state, parseAffinityDelta(raw, state?.idolId || '藤田琴音')).state : state;
    let changed = next.stats.trust !== state.stats.trust;
    const scenePatch = extractSceneCastPatch(raw);
    if (scenePatch.ok) {
      const castResult = applySceneCastPatch(next, scenePatch.patch);
      if (castResult.applied.length) {
        next = castResult.state;
        changed = true;
      }
    }
    if (idolHere && parsePraiseFlag(raw)) {
      const praised = applyQuestEffects(next, { type: 'praise', count: 1 });
      const before = next.questState?.['kotone-confidence']?.progress || 0;
      const after = praised.questState?.['kotone-confidence']?.progress || 0;
      if (after !== before) {
        next = praised;
        changed = true;
      }
    }
    const markedMinutes = parseTimeMark(raw);
    if (markedMinutes) {
      const story = applyStoryMinutes(next, markedMinutes);
      if (story.rolled) {
        void beginNextDay(story.state, story.overflow || 0);
        return payload;
      }
      if (story.applied) {
        next = story.state;
        changed = true;
      }
    }
    if (changed) {
      state = writeSandboxSave(next);
      render();
    }
  return payload;
  },
};
const initialPicture = readSandboxPicture();
setLivePictureOptions(initialPicture);
const responsiveLayout = installSandboxResponsiveLayout(document.querySelector('.sandbox-home-app'));
applySandboxDialogueFontSize(initialPicture);
const app = new BeatPlayerApp(document, { loadSample: false, chatBridge: bridge });
const updateBeatPlayButton = app.updatePlayButton.bind(app);
app.updatePlayButton = () => {
  updateBeatPlayButton();
  syncWeirdScriptAutoButton();
};
const syncBeatViewport = () => {
  responsiveLayout.refresh();
  applySandboxDialogueFontSize(readSandboxPicture());
  const resizeRuntimes = () => {
    const entries = app.director?.allEntries?.();
    entries?.forEach((entry) => entry?.player?.resize?.());
  };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(resizeRuntimes);
  else resizeRuntimes();
};
window.addEventListener('resize', syncBeatViewport, { passive: true });
app.fixedPresentation = null;
app.fixedCameraOptions = null;
app.baseFixedPresentation = null;
app.baseFixedCameraOptions = null;
app.chatStaging = true;
app.preserveChatStaging = true;
app.chatReplyTokens = 6000;
app.chatReplyTimeoutMs = 150000;
app.suggestActions = true;
app.onSuggestedActions = (options) => rememberSuggestedActions(options);
app.rewriteReplySource = (source) => absorbEventPatch(source, `chat-${state.day}-${state.time?.clockMinutes || 0}`);

function applyStageCamera(mode, locationId = state?.currentLocationId) {
  if (!sandboxCameraLocked(mode, locationId)) {
    app.fixedPresentation = null;
    app.fixedCameraOptions = null;
    return;
  }
  app.fixedPresentation = app.baseFixedPresentation;
  app.fixedCameraOptions = sandboxLocationCameraOptions(locationId);
}
app.prepareInlineChatStage = () => applyStageCamera('chat');
app.idolPresent = () => idolVisible(state?.idolOrder, state?.currentLocationId);
app.companyPresent = () => sandboxPeopleHere(state).some((person) => !person.isProducedIdol);
app.rewriteAbsentScript = (script) => withoutIdolCast(script);
applyFishTtsSettings(resolveFishTtsSettings(), {
  onError: message => app.setChatStatus(String(message || '角色语音播放失败'), 'error'),
});

let state = readSandboxSave();
const migratedLocationState = migrateSandboxLocationBackground(state);
if (migratedLocationState !== state) state = writeSandboxSave(migratedLocationState);
localBridge.restore(state.chatHistory);
let panelKind = 'home';
let mapView = null;
let weirdScriptMode = WEIRD_SCRIPT_MODE.FULL;
let weirdScriptPage = 'idle';
let weirdScriptController = null;
let weirdScriptBusy = false;
let weirdScriptCompleted = '';
let weirdScriptLastBackground = '';

function syncWeirdScriptAutoButton() {
  const button = field('sandboxWeirdScriptAutoBtn');
  if (!button) return;
  const playing = Boolean(app.state.playing) && weirdScriptPage === 'playback';
  button.setAttribute('aria-pressed', playing ? 'true' : 'false');
  button.textContent = playing ? '暂停' : '自动';
}

function toggleWeirdScriptAutoplay() {
  if (weirdScriptPage !== 'playback') return;
  if (app.state.playing) {
    app.clearTimer();
    app.state.playing = false;
    app.updatePlayButton();
    return;
  }
  const auto = field('beatAutoPlay');
  if (auto) auto.checked = true;
  app.state.playing = true;
  app.updatePlayButton();
  const index = app.state.current < 0 ? 0 : app.state.current;
  void app.goTo(index, { autoplay: true });
}

function setWeirdScriptStatus(message = '') {
  const status = field('sandboxWeirdScriptStatus');
  if (status) status.textContent = String(message || '');
}

function updateWeirdScriptModeButtons() {
  document.querySelectorAll('[data-weird-mode]').forEach((button) => {
    const selected = button.dataset.weirdMode === weirdScriptMode;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function weirdScriptModeCopy() {
  if (weirdScriptMode === WEIRD_SCRIPT_MODE.DIRECT) {
    return {
      status: '直接粘贴完整的 Beat 脚本。不会提交给 AI，解析资源后开始演出。',
      placeholder: '粘贴完整的 <beat> 脚本',
      action: '解析并开始演出',
    };
  }
  if (weirdScriptMode === WEIRD_SCRIPT_MODE.EXPAND) {
    return {
      status: '扩写模式会读取当前担当偶像的角色世界书。',
      placeholder: '写下一个点子，让 AI 扩写',
      action: '解析并生成 Beat',
    };
  }
  return {
    status: '全文案模式只使用 Beat 规范和地点清单。',
    placeholder: '粘贴完整文案，解析后生成 Beat',
    action: '解析并生成 Beat',
  };
}

function updateWeirdScriptControls() {
  const generate = field('sandboxWeirdScriptGenerateBtn');
  const continueButton = field('sandboxWeirdScriptContinueBtn');
  const input = field('sandboxWeirdScriptInput');
  const copy = weirdScriptModeCopy();
  if (generate) {
    generate.disabled = weirdScriptBusy;
    generate.textContent = copy.action;
  }
  if (continueButton) {
    continueButton.hidden = weirdScriptMode === WEIRD_SCRIPT_MODE.DIRECT || !weirdScriptCompleted;
    continueButton.disabled = weirdScriptBusy;
  }
  if (input) {
    input.disabled = weirdScriptBusy;
    input.placeholder = copy.placeholder;
  }
  updateWeirdScriptModeButtons();
}

function enterWeirdScriptMode() {
  if (weirdScriptBusy) return;
  app.stop();
  hideOrderDialog();
  closePassDialog();
  hideTravelDialog();
  sandboxPhone.close();
  showPanel('home');
  weirdScriptCompleted = '';
  weirdScriptLastBackground = '';
  weirdScriptMode = WEIRD_SCRIPT_MODE.FULL;
  weirdScriptPage = 'compose';
  const root = document.querySelector('.sandbox-home-app');
  root?.classList.remove('is-weird-script-playback-mode');
  root?.classList.add('is-weird-script-mode', 'is-weird-script-compose-mode');
  const start = field('sandboxStart');
  if (start) start.hidden = true;
  const view = field('sandboxWeirdScriptView');
  if (view) view.hidden = false;
  setWeirdScriptStatus('输入完整文案、让 AI 扩写，或切换到直接演出粘贴 Beat 脚本。');
  updateWeirdScriptControls();
  queueMicrotask(() => field('sandboxWeirdScriptInput')?.focus());
}

function leaveWeirdScriptMode() {
  weirdScriptController?.abort();
  weirdScriptController = null;
  weirdScriptBusy = false;
  weirdScriptCompleted = '';
  weirdScriptLastBackground = '';
  weirdScriptPage = 'idle';
  app.stop();
  app.chatState.pending = false;
  app.chatState.active = false;
  const root = document.querySelector('.sandbox-home-app');
  root?.classList.remove('is-weird-script-mode', 'is-weird-script-compose-mode', 'is-weird-script-playback-mode');
  const view = field('sandboxWeirdScriptView');
  if (view) view.hidden = true;
  setWeirdScriptStatus('');
  updateWeirdScriptControls();
  showPanel('home');
  renderStartScreen();
  render();
}

function openBeatEditor() {
  if (weirdScriptBusy) return;
  const input = field('sandboxWeirdScriptInput');
  const source = String(input?.value || weirdScriptCompleted || '').trim();
  sessionStorage.setItem('hatsuBeatEditorSource', source);
  sessionStorage.setItem('hatsuBeatEditorReturn', `${location.pathname}${location.search}`);
  location.href = './beat-editor.html?from=weird-script';
}

function consumeBeatEditorResult() {
  const result = sessionStorage.getItem('hatsuBeatEditorResult');
  if (!result) return;
  sessionStorage.removeItem('hatsuBeatEditorResult');
  enterWeirdScriptMode();
  weirdScriptMode = WEIRD_SCRIPT_MODE.DIRECT;
  const input = field('sandboxWeirdScriptInput');
  if (input) input.value = result;
  weirdScriptCompleted = '';
  weirdScriptLastBackground = '';
  setWeirdScriptStatus('已从可视化编辑器载入脚本，点击“解析并开始演出”即可播放。');
  updateWeirdScriptControls();
}

async function playWeirdScript(script, count) {
  const source = String(script || '').trim();
  if (!source) throw new Error('没有可播放的完整 Beat。');
  app.stop();
  app.chatState.active = true;
  app.chatState.introPending = false;
  app.elements.script.value = source;
  document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
  applyStageCamera('story');
  app.compile();
  const ready = await app.preloadPromise;
  if (!ready) throw new Error('Beat 资源没有准备好，请重试。');
  weirdScriptPage = 'playback';
  const root = document.querySelector('.sandbox-home-app');
  root?.classList.remove('is-weird-script-mode', 'is-weird-script-compose-mode');
  root?.classList.add('is-weird-script-playback-mode');
  const view = field('sandboxWeirdScriptView');
  if (view) view.hidden = true;
  await app.goTo(0, { autoplay: false });
}

async function playDirectWeirdScript(text) {
  const prepared = prepareDirectBeatScript(text);
  if (!prepared.ok) {
    setWeirdScriptStatus(prepared.error);
    field('sandboxWeirdScriptInput')?.focus();
    return;
  }
  weirdScriptBusy = true;
  updateWeirdScriptControls();
  setWeirdScriptStatus(`正在解析 ${prepared.count} 个 Beat 并准备演出资源……`);
  try {
    await playWeirdScript(prepared.script, prepared.count);
  } catch (error) {
    setWeirdScriptStatus(String(error?.message || error || '演出没有开始。'));
  } finally {
    weirdScriptBusy = false;
    updateWeirdScriptControls();
  }
}

async function generateWeirdScript({ continuation = false } = {}) {
  if (weirdScriptBusy) return;
  const input = field('sandboxWeirdScriptInput');
  const text = String(input?.value || '').trim();
  if (weirdScriptMode === WEIRD_SCRIPT_MODE.DIRECT && !continuation) {
    await playDirectWeirdScript(text);
    return;
  }
  if (!text && !continuation) {
    setWeirdScriptStatus('先输入文案或点子。');
    input?.focus();
    return;
  }
  weirdScriptBusy = true;
  weirdScriptController = new AbortController();
  updateWeirdScriptControls();
  setWeirdScriptStatus(continuation ? '正在续写后面的 Beat……' : '正在生成长篇 Beat，请稍候……');
  const normalizeOptions = { preserveBackground: true, preserveStaging: true };
  const prompt = continuation
    ? buildWeirdContinuationPrompt({
      completedScript: weirdScriptCompleted,
      completedCount: extractClosedBeatScript(weirdScriptCompleted).count,
      lastBackground: weirdScriptLastBackground,
      idolName: state?.idolId || '藤田琴音',
    })
    : buildWeirdScriptPrompt({
      mode: weirdScriptMode,
      text,
      idolName: state?.idolId || '藤田琴音',
    });
  try {
    const bridgeOptions = {
      timeoutMs: 300000,
      maxTokensLimit: 48000,
      useWorldbook: false,
      useHistory: false,
      normalizeOptions,
      signal: weirdScriptController.signal,
    };
    if (weirdScriptMode === WEIRD_SCRIPT_MODE.EXPAND) {
      bridgeOptions.useWorldbook = true;
    } else {
      // Full script mode is deliberately isolated from the ordinary sandbox
      // system prompt, worldbook, and history.
      bridgeOptions.systemPrompt = '';
    }
    const payload = await localBridge.send(prompt, bridgeOptions);
    const raw = String(payload?.rawText || payload?.text || '');
    const normalized = normalizeChatReply(raw, normalizeOptions);
    if (!normalized.ok) throw new Error(normalized.error || '生成结果不是可播放的 Beat。');
    const combined = continuation ? `${weirdScriptCompleted}\n${normalized.script}` : normalized.script;
    const closed = extractClosedBeatScript(combined);
    weirdScriptCompleted = '';
    weirdScriptLastBackground = closed.lastBackground || '';
    await playWeirdScript(closed.script, closed.count);
    updateWeirdScriptControls();
  } catch (error) {
    if (error?.message === '已取消闲聊生成' || weirdScriptController?.signal.aborted) return;
    const raw = String(error?.rawText || '');
    const closed = raw ? extractClosedBeatScript(raw) : { script: '', count: 0, hasOpenBeat: false, lastBackground: '' };
    if (closed.count > 0) {
      weirdScriptCompleted = continuation ? `${weirdScriptCompleted}\n${closed.script}` : closed.script;
      weirdScriptLastBackground = closed.lastBackground || weirdScriptLastBackground;
      setWeirdScriptStatus(`已收到 ${extractClosedBeatScript(weirdScriptCompleted).count} 个完整 Beat，输出被截断，可以继续生成。`);
    } else {
      setWeirdScriptStatus(String(error?.message || error || '生成失败，请重试。'));
    }
  } finally {
    weirdScriptController = null;
    weirdScriptBusy = false;
    updateWeirdScriptControls();
  }
}

async function requestSandboxCompletion(prompt, { system, maxTokens } = {}) {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('hatsuFreeChatSettings') || '{}') || {}; } catch { settings = {}; }
  const url = chatCompletionsUrl(settings.baseUrl);
  const model = String(settings.model || '').trim();
  if (!url || !model) throw new Error('尚未填写闲聊 API 地址和模型');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${String(settings.apiKey || '').trim()}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system || '你是初星学园沙盒的行动规划器。严格遵守用户提示的输出格式。' },
          { role: 'user', content: String(prompt || '') },
        ],
        temperature: Number.isFinite(Number(settings.temperature)) ? Number(settings.temperature) : .75,
        max_tokens: Math.max(256, Math.min(2400, Number(maxTokens) || Number(settings.maxTokens) || 1200)),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI 请求失败：HTTP ${response.status}`);
    const json = await response.json();
    const text = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('AI 没有返回内容');
    return text;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('AI 请求超时');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function escapeBeatText(value) {
  return String(value || '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

function contactOutcomeScript({ idolId, status, reason, location }) {
  const place = location?.label || '当前地点';
  const text = status === 'accepted'
    ? `${idolId}答应了你的邀请，正在前往${place}。`
    : status === 'delayed'
      ? `${idolId}回复说现在还不能马上过来${place}：${reason || '她需要先处理手头的事情。'}`
      : `${idolId}暂时拒绝了前往${place}的邀请：${reason || '她现在有自己的安排。'}`;
  return `<beat id="sandbox-contact-outcome" speaker="narrator" cue="talk" look="camera" position="center" background="${escapeBeatText(location?.background || BACKGROUND)}" shot="medium" wait="text"><display lang="zh">${escapeBeatText(text)}</display></beat>`;
}

async function dispatchIdolToCurrentLocation({ idolId } = {}) {
  const canonicalId = canonicalCastIdol(idolId);
  const location = getSandboxLocation(state.currentLocationId);
  if (!canonicalId) throw new Error('这个联系人还没有接入校内行踪。');
  if (app.chatState.pending || orderBusy) throw new Error('当前剧情还没有结束。');
  const existing = latestPendingContact(state, canonicalId, location.id);
  if (existing) throw new Error('这份邀请还在等待回复。');
  const requestId = `phone-${state.day}-${state.time.clockMinutes}-${Date.now().toString(36)}`;
  const draft = {
    ...state,
    contactRequests: [...(state.contactRequests || []), {
      id: requestId,
      idolId: canonicalId,
      fromLocationId: state.currentLocationId,
      destinationLocationId: location.id,
      status: 'pending',
      message: `邀请前往${location.label}`,
      reason: '',
      etaMinutes: 0,
      createdAt: { day: state.day, minutes: state.time.clockMinutes },
      resolvedAt: null,
    }],
  };
  state = writeSandboxSave(draft);
  render();
  try {
    const raw = await requestSandboxCompletion(buildSandboxContactPrompt({
      idolId: canonicalId,
      requestId,
      destinationLocationId: location.id,
      destinationLabel: location.label,
      context: buildSandboxAiContext(state, { locationLabel: location.label, soloAction: !idolVisible(state.idolOrder, state.currentLocationId) }),
    }));
    const parsed = extractSceneCastPatch(raw);
    if (!parsed.ok) throw new Error('AI 没有返回可确认的联络结果。');
    const result = applySceneCastPatch(state, parsed.patch);
    const request = result.state.contactRequests.find((item) => item.id === requestId);
    if (!request || !['accepted', 'delayed', 'rejected'].includes(request.status)) {
      throw new Error('联络结果缺少 accepted、delayed 或 rejected。');
    }
    let next = result.state;
    if (request.status === 'accepted' && canonicalId !== state.idolId && !next.sceneCast[canonicalId]) {
      const fallbackCast = applySceneCastPatch(next, {
        cast: [{
          id: canonicalId,
          source: 'ai',
          status: 'here',
          locationId: location.id,
          anchor: 'door',
          intent: `应邀来到${location.label}`,
        }],
      });
      next = fallbackCast.state;
    }
    if (request.status === 'accepted' && canonicalId === state.idolId) {
      next.idolOrder = { mode: 'stay', locationId: location.id };
      delete next.sceneCast[canonicalId];
    }
    state = writeSandboxSave(next);
    render();
    if (request.status === 'accepted') {
      await playReplyScript(contactOutcomeScript({ idolId: canonicalId, status: request.status, reason: request.reason, location }));
    }
    return {
      status: request.status,
      message: request.status === 'accepted'
        ? `已接受：${location.label}见。`
        : request.status === 'delayed'
          ? `她暂时来不了，预计 ${request.etaMinutes || 30} 分钟后再联系。`
          : `她拒绝了这次邀请${request.reason ? `：${request.reason}` : '。'}`,
    };
  } catch (error) {
    state = writeSandboxSave({
      ...state,
      contactRequests: (state.contactRequests || []).filter((item) => item.id !== requestId),
    });
    render();
    throw error;
  }
}

function formatClock(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function formatTimeLabel(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  const hour = Math.floor(value / 60);
  const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上';
  return `${period} ${formatClock(value)}`;
}

function confirmCustomTime() {
  const parsed = parseSandboxClockSet(field('sandboxCustomTimeInput')?.value, state);
  const status = field('sandboxCustomTimeStatus');
  if (!parsed.ok) {
    if (status) status.textContent = parsed.reason === 'empty' ? '写下钟点，或倒退多久。' : '请写成 09:00、第1日 22:00，或倒退 8小时。';
    return;
  }
  const beforeDay = state.day;
  const beforeClock = state.time.clockMinutes;
  const result = setSandboxClock(state, parsed);
  state = writeSandboxSave(result.state);
  if (state.day !== beforeDay) {
    localBridge.restore(state.chatHistory);
    void ensureDailyEvent();
    void ensureDailyCommissions();
  }
  render();
  const message = `时间从第 ${beforeDay} 日 ${formatTimeLabel(beforeClock)} 调到第 ${state.day} 日 ${formatTimeLabel(state.time.clockMinutes)}。`;
  if (status) status.textContent = message;
  app.setChatStatus(message);
  showPanel('home');
}

function closePassDialog() {
  const dialog = field('sandboxPassDialog');
  if (dialog) dialog.hidden = true;
}

function withDayMemory(memories, day, text) {
  const clean = sanitizeDayMemory(text);
  const next = (Array.isArray(memories) ? memories : []).filter((item) => item.day !== day);
  if (clean) next.push({ day, text: clean });
  return next;
}

function absorbEventPatch(source, sceneId) {
  const split = splitEventPatch(source);
  if (!split.patch) return split.script;
  const next = applyDailyEventPatch(state, split.patch, { sceneId });
  if (next !== state) {
    state = writeSandboxSave(next);
    render();
  }
  return split.script;
}

let eventPlanRequest = null;
let eventPlanMessage = '';

function eventPlanContext(current) {
  const memories = (current.dayMemories || []).slice(-3).map((item) => `第${item.day}日：${item.text}`);
  const quests = getQuestStatusSummary(current).map((quest) => `${quest.title} ${quest.progress}/${quest.target}`);
  const places = listSandboxLocations().map((location) => ({
    id: location.id,
    label: location.label,
    shortLabel: location.shortLabel,
  }));
  const occupied = (current.storyGuide?.stories || []).map((story) => {
    const place = getSandboxLocation(story.locationId).label;
    return `${(story.idols || []).join('、')}在${place}：${story.premise}`;
  });
  return { memories, quests, places, occupied };
}

let eventOpeningRequest = null;
let deferEventOpening = false;

function eventOpeningDue() {
  const event = state.dailyEvent;
  return Boolean(event?.blueprint?.title)
    && event.blueprint.day === state.day
    && event.record?.status !== 'closed'
    && !event.record?.openingPlayed;
}

async function playPendingEventOpening() {
  if (deferEventOpening || eventOpeningRequest || eventPlanRequest || orderBusy || !eventOpeningDue()) return eventOpeningRequest;
  const day = state.day;
  const blueprint = state.dailyEvent.blueprint;
  eventOpeningRequest = (async () => {
    const located = getSandboxLocation(blueprint.locationId);
    const place = located.id === blueprint.locationId ? located : getSandboxLocation(state.currentLocationId);
    const background = sandboxLocationBackground(place, state.time?.clockMinutes);
    const order = normalizeIdolOrder(state.idolOrder);
    const producedHere = (blueprint.participants || []).includes(state.idolId);
    state = writeSandboxSave({
      ...state,
      currentLocationId: place.id,
      currentBackground: background,
      idolOrder: producedHere && order.mode !== 'follow' ? { mode: 'stay', locationId: place.id } : order,
    });
    syncInlineChat();
    applyStageCamera(place.id === 'home_classroom' ? 'home' : 'outing', place.id);
    render();
    rememberSuggestedActions([]);
    const openingInput = {
      idolName: state.idolId,
      placeLabel: blueprint.locationLabel || place.label,
      background,
      title: blueprint.title,
      hook: blueprint.narrativeHook,
      premise: blueprint.premise,
      participants: blueprint.participants,
    };
    let script = buildEventOpeningFallback(openingInput);
    let usedFallback = true;
    app.chatState.pending = true;
    app.setChatControlsDisabled(true);
    app.setChatStatus(`正在演「${blueprint.title}」…`, 'busy');
    try {
      const payload = await bridge.send(buildEventOpeningPrompt(openingInput), { maxTokens: 1800, timeoutMs: 120000 });
      const normalized = normalizeChatReply(absorbEventPatch(payload?.rawText || payload?.text || '', `event-open-${day}-${place.id}`), { preserveBackground: true, preserveStaging: true });
      if (!normalized.ok) throw new Error(normalized.error || '开场缺少完整的 Beat。');
      script = normalized.script;
      usedFallback = false;
      app.setChatStatus('');
    } catch (error) {
      console.info('[sandbox] 事件开场使用本地一段', error);
    } finally {
      app.chatState.pending = false;
      app.setChatControlsDisabled(false);
    }
    if (state.day !== day || !eventOpeningDue()) return;
    state = writeSandboxSave({
      ...state,
      dailyEvent: markEventOpeningPlayed(state.dailyEvent, { sceneId: `event-open-${day}-${place.id}`, placeLabel: place.label }),
    });
    render();
    await playReplyScript(script);
    app.setChatStatus(usedFallback
      ? `今天的事件是「${blueprint.title}」。开场在${place.label}，先演了一段。`
      : `今天的事件是「${blueprint.title}」。开场在${place.label}。`);
  })().finally(() => {
    eventOpeningRequest = null;
  });
  return eventOpeningRequest;
}

async function ensureDailyEvent() {
  const day = state.day;
  if (eventPlanRequest) {
    await eventPlanRequest;
    await playPendingEventOpening();
    return;
  }
  if (!dailyEventNeedsPlan(state.dailyEvent, day)) {
    await playPendingEventOpening();
    return;
  }
  const previous = state.dailyEvent;
  if (previous?.blueprint?.title && previous.blueprint.day !== day) {
    const closed = closeDailyEvent(previous, { reason: previous.record?.introduced ? 'carried_over' : 'missed' });
    state = writeSandboxSave({
      ...state,
      dailyEvent: emptyDailyEvent(day),
      eventArchive: appendEventArchive(state.eventArchive, closed),
    });
  }
  if (!dailyEventNeedsPlan(state.dailyEvent, day)) {
    await playPendingEventOpening();
    return;
  }
  eventPlanRequest = (async () => {
    eventPlanMessage = '';
    renderEventRetry();
    app.setChatStatus('正在想今天会碰上什么…', 'busy');
    let references = [];
    try {
      references = await loadCsprtReferences({
        idolName: state.idolId,
        day,
        recentIds: recentCsprtIds(state.eventArchive),
      });
    } catch (error) {
      console.info('[sandbox] 参考剧本这次没有读到', error);
      references = [];
    }
    if (state.day !== day) return;
    const context = eventPlanContext(state);
    const text = await requestSandboxCompletion(buildEventPlanPrompt({
      day,
      idolName: state.idolId,
      memories: context.memories,
      quests: context.quests,
      places: context.places,
      occupied: context.occupied,
      archive: state.eventArchive,
      references,
    }), {
      system: '你是初星学园的事件设计师。只输出一个 JSON 对象，不要解释。',
      maxTokens: 1800,
    });
    const parsed = parseEventBlueprint(text, {
      day,
      idolName: state.idolId,
      referenceIds: references.map((item) => item.id),
      places: context.places,
      fallbackLocationId: state.currentLocationId,
    });
    if (!parsed.ok) throw new Error(parsed.error);
    if (state.day !== day) return;
    eventPlanMessage = '';
    state = writeSandboxSave({ ...state, dailyEvent: parsed.event });
    render();
    const placeLabel = state.dailyEvent.blueprint.locationLabel || '这里';
    app.setChatStatus(`今天的事件是「${state.dailyEvent.blueprint.title}」。正在准备${placeLabel}的开场…`, 'busy');
  })().catch((error) => {
    if (state.day !== day) return;
    const message = String(error?.message || error);
    if (message.includes('尚未填写')) {
      eventPlanMessage = '请先在设置里填写闲聊 API';
      renderEventRetry();
      app.setChatStatus('今天的事件还没写：请先在设置里填写闲聊 API。', 'error');
      return;
    }
    eventPlanMessage = message;
    state = writeSandboxSave({ ...state, dailyEvent: markEventPlanAttempted(state.dailyEvent, day, message) });
    render();
    app.setChatStatus(`今天的事件没有写成：${message}`, 'error');
  }).finally(() => {
    eventPlanRequest = null;
    renderEventRetry();
    if (state.day !== day) {
      void ensureDailyEvent();
      void ensureDailyCommissions();
    }
  });
  const request = eventPlanRequest;
  await request;
  await playPendingEventOpening();
}

let commissionRequest = null;
let commissionSceneRequest = null;

async function ensureDailyCommissions() {
  if (!produceRunStarted(state)) return;
  const day = state.day;
  if (!commissionsNeedPlan(state.commissions, day)) return;
  if (commissionRequest) return commissionRequest;
  const idolName = state.idolId;
  const fame = Number(state.wallet?.fame) || 0;
  commissionRequest = (async () => {
    let board = null;
    try {
      const text = await requestSandboxCompletion(buildCommissionPlanPrompt({ idolName, day, fame }), {
        system: '你是初星学园的委托登记员。只输出要求的 JSON，不要解释。',
        maxTokens: 900,
      });
      board = parseCommissionBoard(text, { day, idolName, fame });
    } catch {
      board = null;
    }
    if (!board) board = commissionBoardFromPool({ day, idolName, fame });
    if (state.day !== day) return;
    state = writeSandboxSave({ ...state, commissions: board });
    render();
  })().finally(() => {
    commissionRequest = null;
  });
  return commissionRequest;
}

async function playCommissionScene(slotIndex) {
  if (commissionSceneRequest || app.chatState.pending || deferEventOpening) return commissionSceneRequest;
  const slot = state.commissions?.slots?.[Number(slotIndex)];
  if (!slot || slot.status === 'done') return null;
  const location = getSandboxLocation(slot.locationId);
  const day = state.day;
  commissionSceneRequest = (async () => {
    rememberSuggestedActions([]);
    const fallback = buildCommissionSceneFallback(slot, state.idolId);
    let script = fallback.script;
    let options = fallback.options;
    try {
      const reply = await requestSandboxCompletion(buildCommissionScenePrompt({
        idolName: state.idolId,
        day: state.day,
        clockLabel: formatTimeLabel(state.time.clockMinutes),
        slot,
        locationLabel: location.label,
        locationDescription: location.description,
      }), {
        system: '你是初星学园的演出编剧。只输出 beat 和 choice，不要解释。',
        maxTokens: 1400,
      });
      const normalized = normalizeChatReply(reply, { idolName: state.idolId });
      if (normalized.ok && normalized.script) script = normalized.script;
      if (normalized.options?.length === 4) options = normalized.options;
    } catch {
      script = fallback.script;
      options = fallback.options;
    }
    if (state.day !== day) return;
    const remembered = rememberCommissionScene(state.commissions, slot.slotIndex, options);
    if (!remembered.ok) return;
    state = writeSandboxSave({ ...state, commissions: remembered.board });
    rememberSuggestedActions(remembered.options);
    render();
    app.setChatStatus(`「${slot.title}」的四个现场处理写在「选项」里。点一项就会结算。`, 'busy');
    await playReplyScript(script);
  })().finally(() => {
    commissionSceneRequest = null;
  });
  return commissionSceneRequest;
}

async function resolveCommissionChoice(slotIndex, tier, choiceText) {
  if (app.chatState.pending || commissionSceneRequest) return;
  const result = settleCommission(state, slotIndex, tier);
  if (!result.ok) {
    app.setChatStatus('这份委托现在结不了。', 'error');
    return;
  }
  state = writeSandboxSave(result.state);
  rememberSuggestedActions([]);
  render();
  app.setChatStatus(`${result.slot.title} · ${commissionTierLabel(tier)} · ${formatCommissionReward(tier)}`, 'busy');
  let script = buildCommissionResultFallback(result.slot, tier, state.idolId);
  try {
    const reply = await requestSandboxCompletion(buildCommissionResultPrompt({
      idolName: state.idolId,
      day: state.day,
      clockLabel: formatTimeLabel(state.time.clockMinutes),
      slot: result.slot,
      tier,
      choiceText,
    }), {
      system: '你是初星学园的演出编剧。只输出 beat，不要解释。',
      maxTokens: 1000,
    });
    const normalized = normalizeChatReply(reply, { idolName: state.idolId });
    if (normalized.ok && normalized.script) script = normalized.script;
  } catch {
    script = buildCommissionResultFallback(result.slot, tier, state.idolId);
  }
  await playReplyScript(script);
  if (result.rolled) await beginNextDay(state, result.overflow || 0);
}

let dayMemoryRequest = null;

async function beginNextDay(endingState, extraMinutes = 0) {
  const endingDay = endingState?.day || state.day;
  const entries = Array.isArray(endingState?.dailyTimeline) ? endingState.dailyTimeline : [];
  const questReady = applyQuestEffects(endingState, {
    type: 'day_settled',
    growthActions: entries.filter((entry) => entry.kind === 'lesson' || entry.kind === 'training').length,
    commissionCount: entries.filter((entry) => entry.kind === 'commission').length,
  });
  const result = settleSandboxDay(questReady, { extraMinutes });
  const fallback = result.journal?.line || `第 ${endingDay} 日结束了。`;
  const closedEvent = closeDailyEvent(endingState?.dailyEvent, {
    reason: endingState?.dailyEvent?.record?.introduced ? 'carried_over' : 'missed',
  });
  state = writeSandboxSave({
    ...result.state,
    dayMemories: withDayMemory(result.state.dayMemories, endingDay, fallback),
    storyLog: appendStoryLog(result.state.storyLog, endingState?.storyGuide),
    storyGuide: emptyStoryGuide(result.state.day),
    dailyEvent: emptyDailyEvent(result.state.day),
    commissions: emptyCommissionBoard(result.state.day),
    eventArchive: appendEventArchive(result.state.eventArchive, closedEvent),
  });
  localBridge.restore(state.chatHistory);
  closePassDialog();
  render();
  const endedAtMidnight = Number(endingState?.time?.clockMinutes) >= Number(endingState?.time?.endMinutes);
  app.setChatStatus(endedAtMidnight
    ? `第 ${endingDay} 日到 24:00 了，正在把这一天整理成记忆，并写下一份故事指导…`
    : `第 ${endingDay} 日结束了，正在把这一天整理成记忆，并写下一份故事指导…`);
  if (dayMemoryRequest) return result;
  const guideDay = state.day;
  dayMemoryRequest = requestSandboxCompletion(buildDayMemoryPrompt(endingState), {
    system: '你是初星学园的记录员。只输出一段记忆正文，不要解释、标题或标签。',
    maxTokens: 500,
  }).then((text) => sanitizeDayMemory(text) || fallback).catch(() => fallback).then((memory) => {
    state = writeSandboxSave({
      ...state,
      dayMemories: withDayMemory(state.dayMemories, endingDay, memory),
    });
    return requestSandboxCompletion(buildStoryGuidePrompt(state, memory), {
      system: '你是初星学园的故事指导。只输出 JSON，不要解释。',
      maxTokens: 1800,
    });
  }).then((text) => {
    const guide = parseStoryGuide(text, { day: guideDay, producedIdolId: state.idolId });
    state = writeSandboxSave({ ...state, storyGuide: guide });
    render();
    app.setChatStatus(`第 ${endingDay} 日的记忆已记下。第 ${guideDay} 日安排了 ${guide.stories.length} 件偶像之间的故事。正在想今天的事件…`);
  }).catch((error) => {
    state = writeSandboxSave({ ...state, storyGuide: emptyStoryGuide(guideDay) });
    render();
    app.setChatStatus(`已经进入第 ${state.day} 日。故事指导这次没有写成：${String(error?.message || error)}`);
  }).finally(() => {
    dayMemoryRequest = null;
    void ensureDailyEvent();
    void ensureDailyCommissions();
  });
  return result;
}

function openPassDialog() {
  if (getSandboxLocation(state.currentLocationId).id !== 'outing_producer_home') return;
  const dialog = field('sandboxPassDialog');
  if (!dialog) return;
  const input = field('sandboxPassInput');
  if (input) input.value = '';
  setText('sandboxPassNow', `现在是${formatTimeLabel(state.time.clockMinutes)}。推进到 24:00 会进入第二天，记下这一天的记忆，并写好下一天的故事指导。`);
  setText('sandboxPassStatus', '');
  dialog.hidden = false;
  input?.focus();
}

function passAdvanceMessage(reason) {
  if (reason === 'empty') return '写下要推进的分钟，或今天的钟点。';
  if (reason === 'past') return '这个时间已经过了。';
  if (reason === 'after_end' || reason === 'day_end') return '一天在 24:00 结束。写 24:00、明天，或足够的分钟数就会进入第二天。';
  return '请写成分钟数，或 18:00 这样的钟点。';
}

function confirmPassTime() {
  if (getSandboxLocation(state.currentLocationId).id !== 'outing_producer_home') {
    closePassDialog();
    return;
  }
  const parsed = parseSandboxAdvance(field('sandboxPassInput')?.value, state.time.clockMinutes, state.time.endMinutes);
  if (!parsed.ok) {
    setText('sandboxPassStatus', passAdvanceMessage(parsed.reason));
    return;
  }
  const before = state.time.clockMinutes;
  const result = advanceSandboxMinutes(state, parsed.minutes);
  if (!result.applied && !result.rolled) {
    setText('sandboxPassStatus', '请写要推进的时间。');
    return;
  }
  if (result.rolled) {
    closePassDialog();
    void beginNextDay(result.state, result.overflow || 0);
    return;
  }
  state = writeSandboxSave(result.state);
  render();
  const arrived = formatTimeLabel(state.time.clockMinutes);
  const status = parsed.capped
    ? `时间从 ${formatTimeLabel(before)} 推进到 ${arrived}。一次最多进入第二天。`
    : `时间从 ${formatTimeLabel(before)} 推进到 ${arrived}。`;
  closePassDialog();
  app.setChatStatus(status);
}

function setText(id, value) {
  const element = field(id);
  if (element) element.textContent = String(value);
}

function mapActiveLocationId() {
  const area = locationAreaFor(state.currentLocationId);
  const entry = area?.places?.[0]?.locationId;
  return entry || state.currentLocationId;
}

function followLocationClock() {
  const previous = state.currentBackground;
  const next = syncSandboxLocationBackground(state);
  if (next === state) return;
  state = writeSandboxSave(next);
  syncInlineChat();
  const script = app.elements?.script?.value || '';
  if (previous && script.includes(previous) && !app.chatState?.pending) {
    app.elements.script.value = script.split(previous).join(state.currentBackground);
    app.compile();
  }
}

function rememberSuggestedActions(options) {
  const next = Array.isArray(options) && options.length === 4
    ? options.map((item) => String(item || '').trim().slice(0, 80)).filter(Boolean)
    : [];
  const saved = next.length === 4 ? next : [];
  const current = Array.isArray(state.suggestedActions) ? state.suggestedActions : [];
  const same = current.length === saved.length && current.every((item, index) => item === saved[index]);
  if (!same) state = writeSandboxSave({ ...state, suggestedActions: saved });
  renderSuggestedActions();
}

function renderSuggestedActions() {
  const options = Array.isArray(state.suggestedActions) ? state.suggestedActions : [];
  const button = field('sandboxSuggestBtn');
  const panel = field('sandboxSuggestPanel');
  if (button) button.classList.toggle('is-ready', options.length === 4);
  if (!panel) return;
  panel.replaceChildren();
  if (options.length !== 4) {
    const note = document.createElement('p');
    note.textContent = '这一段还没有下一步选项。';
    panel.append(note);
    return;
  }
  for (const option of options) {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = option;
    item.addEventListener('click', () => {
      const choice = commissionChoiceForText(state.commissions, option);
      panel.hidden = true;
      button?.setAttribute('aria-expanded', 'false');
      if (choice) {
        void resolveCommissionChoice(choice.slotIndex, choice.tier, choice.text);
        return;
      }
      const input = field('chatInput');
      if (input && !input.disabled) {
        input.value = option;
        input.focus();
      }
    });
    panel.append(item);
  }
}

function render() {
  followLocationClock();
  const snapshot = buildSandboxSnapshot(state);
  setText('sandboxDay', snapshot.day);
  setText('sandboxClock', formatTimeLabel(snapshot.clockMinutes));
  setText('sandboxGrowthCount', `${snapshot.dailyGrowthCount}/${snapshot.dailyGrowthLimit}`);
  setText('sandboxStamina', snapshot.stats.stamina);
  setText('sandboxActivity', `${snapshot.stats.stamina}/100`);
  setText('sandboxStress', snapshot.stats.stress);
  setText('sandboxCoins', snapshot.wallet.coins);
  setText('sandboxAffinity', snapshot.stats.trust);
  field('sandboxAffinity')?.parentElement?.setAttribute('title', `${affinityStageLabel(snapshot.stats.trust)} · ${affinityStageTag(snapshot.idolId, snapshot.stats.trust)}`);
  setText('sandboxFame', snapshot.wallet.fame);
  setText('sandboxReadiness', isFirstLiveReady(state) ? 'Step 1 完成 · First Live 可开始' : 'Step 1 · First Live 准备中');
  const location = getSandboxLocation(state.currentLocationId);
  setText('sandboxSceneLabel', location.label);
  renderEventHook();
  renderEventRetry();
  renderCampusPresence();
  if (panelKind === 'commissions') renderCommissionPanel();
  setText('sandboxProduceName', snapshot.idolId);
  setText('sandboxIdolCardName', snapshot.idolId);
  setText('sandboxIdolMeta', `第 ${snapshot.day} 日 · ${location.shortLabel || location.label}`);
  const areaButton = field('sandboxAreaBtn');
  const area = locationAreaFor(location.id);
  if (areaButton) {
    areaButton.hidden = !area;
    if (area) areaButton.textContent = area.button;
  }
  const passButton = field('sandboxPassTimeBtn');
  const atProducerHome = location.id === 'outing_producer_home';
  if (passButton) passButton.hidden = !atProducerHome;
  if (!atProducerHome) field('sandboxPassDialog')?.setAttribute('hidden', '');
  const growth = snapshot.dailyGrowthCount >= snapshot.dailyGrowthLimit;
  document.querySelectorAll('[data-action-kind="lesson"], [data-action-kind="training"]').forEach((button) => {
    button.classList.toggle('is-disabled', growth);
  });
  if (!field('sandboxProduceBoard')?.hidden) renderProduceBoard();
  const composer = field('chatInput');
  const idolHere = idolVisible(state?.idolOrder, state?.currentLocationId);
  if (composer && !app.chatState?.pending) {
    composer.disabled = false;
    composer.placeholder = idolHere ? `和${snapshot.idolId}说点什么` : '写下自己的行动';
    composer.setAttribute('aria-label', idolHere ? '对偶像说' : '自己的行动');
  }
  renderSuggestedActions();
}

function renderCampusPresence() {
  const button = field('sandboxPresenceBtn');
  const dialog = field('sandboxPresenceDialog');
  const campus = isSandboxCampusLocation(state.currentLocationId);
  if (button) button.hidden = !campus;
  if (!campus) { if (dialog?.open) dialog.close(); return; }
  const people = sandboxIdolsHere(state);
  if (button) {
    button.textContent = `在场 ${people.length}`;
    button.setAttribute('aria-label', `查看当前在场偶像，共 ${people.length} 人`);
  }
  const location = getSandboxLocation(state.currentLocationId);
  setText('sandboxPresenceTitle', `${location.label} · 当前在场`);
  setText('sandboxPresenceTime', `第 ${state.day} 日 · ${formatTimeLabel(state.time.clockMinutes)}`);
  const list = field('sandboxPresenceList');
  if (!list) return;
  list.replaceChildren();
  if (!people.length) {
    const empty = document.createElement('li');
    empty.className = 'sandbox-presence-empty';
    empty.textContent = '这里暂时没有偶像在场。';
    list.append(empty);
  }
  for (const person of people) {
    const item = document.createElement('li'); item.className = 'sandbox-presence-person';
    const name = document.createElement('strong'); name.textContent = person.name;
    const detail = document.createElement('span'); detail.textContent = person.activity;
    const role = document.createElement('small'); role.textContent = person.isProducedIdol ? '担当' : '在场';
    item.append(name, role, detail); list.append(item);
  }
}

function renderProduceBoard() {
  const meters = field('sandboxStatMeters');
  const actions = field('sandboxProduceActions');
  if (!meters || !actions) return;
  const ratingUrl = `${PRODUCE_UI}rating-sprite-sheet.png`;
  meters.innerHTML = produceMeters(state.idolId, state.stats).map((meter) => {
    const sprite = rankSpriteStyle(meter.rank);
    return `
      <article class="sandbox-meter-card" style="--meter-color:${meter.color};--meter-progress:${meter.progress}">
        <div class="sandbox-meter-arc" aria-label="${meter.key} 评级 ${meter.rank}">
          <svg class="sandbox-meter-ring" viewBox="0 0 112 112" aria-hidden="true">
            <circle class="sandbox-meter-outline" cx="56" cy="56" r="43" pathLength="100"></circle>
            <circle class="sandbox-meter-track" cx="56" cy="56" r="43" pathLength="100"></circle>
            <circle class="sandbox-meter-progress" cx="56" cy="56" r="43" pathLength="100"></circle>
          </svg>
          <div class="sandbox-meter-rank" style="--rank-image:url('${ratingUrl}');--rank-x:${sprite.x}%;--rank-y:${sprite.y}%;--rank-shift-x:${sprite.shiftX}%;--rank-shift-y:${sprite.shiftY}%"></div>
        </div>
        <div class="sandbox-meter-value"><i class="sandbox-meter-icon" aria-hidden="true"><img src="${PRODUCE_UI}${MINI_ICONS[meter.key]}" alt="" draggable="false"></i><b>${meter.value}</b><small>/${meter.cap}</small></div>
        <div class="sandbox-meter-growth">${meter.growthText}</div>
      </article>`;
  }).join('');
  const growthBlocked = getDailyGrowthBlocked();
  actions.innerHTML = PRODUCE_CARDS.map(([kind, attribute, label, image]) => {
    const settlement = produceActionSettlement(state.idolId, kind, attribute, state.stats);
    const blocked = growthBlocked || Number(state.stats?.stamina) < settlement.costs.stamina;
    return `
      <button class="sandbox-produce-card" type="button" data-produce-kind="${kind}" data-produce-attribute="${attribute}" ${blocked ? 'disabled' : ''} aria-label="${label}，${settlement.costText}">
        <span class="sandbox-produce-visual">
          <img src="${PRODUCE_UI}${image}" alt="" draggable="false">
          <span class="sandbox-produce-cost">${settlement.costText}</span>
          <span class="sandbox-produce-label">${label}</span>
        </span>
      </button>`;
  }).join('');
}

function getDailyGrowthBlocked() {
  const snapshot = buildSandboxSnapshot(state);
  return snapshot.dailyGrowthCount >= snapshot.dailyGrowthLimit;
}

let mapMode = 'city';

function updateMapChrome() {
  const city = mapMode === 'city';
  setText('sandboxPanelEyebrow', city ? 'AMAGAWA' : 'CAMPUS MAP');
  setText('sandboxPanelTitle', city ? '天川市' : '学园地图');
  document.querySelectorAll('[data-map-mode]').forEach((button) => {
    const selected = button.dataset.mapMode === mapMode;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  const switcher = field('sandboxMapSwitch');
  if (switcher) switcher.hidden = panelKind !== 'map';
}

function renderMapPanel() {
  const surface = field('sandboxMapSurface');
  const city = mapMode === 'city';
  mapView?.dispose();
  mapView = renderSandboxMap(surface, {
    ...(city ? CITY_MAP_VIEW : {}),
    activeLocationId: mapActiveLocationId(),
    describePresence: (region) => formatSandboxPresenceLine(sandboxIdolsAt(state, region?.locationId)),
    onSelect: (regionId, region) => {
      if (region.switchTo) {
        mapMode = region.switchTo;
        renderMapPanel();
        return;
      }
      if (!city && regionId === 'front_gate') {
        showTravelMenu('gate');
        return;
      }
      selectLocation(region.locationId);
    },
  });
  updateMapChrome();
  const list = field('sandboxMapList');
  if (!list) return;
  const active = getSandboxLocation(state.currentLocationId).id;
  list.innerHTML = listSandboxLocations().map((location) => `
    <button type="button" class="sandbox-map-item${location.id === active ? ' is-active' : ''}" data-sandbox-location="${location.id}">
      <strong>${location.label}</strong><small>${location.description}</small>
    </button>
  `).join('');
  list.querySelectorAll('[data-sandbox-location]').forEach((button) => {
    button.addEventListener('click', () => selectLocation(button.dataset.sandboxLocation));
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function storyGuideMarkup(dayNumber, current) {
  const todayGuide = normalizeStoryGuide(state.storyGuide, state.day);
  const guide = current && todayGuide.day === dayNumber
    ? todayGuide
    : normalizeStoryLog(state.storyLog).find((item) => item.day === dayNumber);
  if (!guide?.stories?.length) {
    return current ? '<h3>故事指导</h3><div class="sandbox-journal-entry">进入这一天时会写好今天的故事指导。</div>' : '';
  }
  const now = Number(state.time?.clockMinutes) || 0;
  const rows = guide.stories.map((story) => {
    const place = getSandboxLocation(story.locationId).label;
    const when = `${formatClock(story.start)}–${formatClock(story.end)}`;
    const happened = !current || now >= story.end;
    const detail = happened ? `${story.premise} ${story.brief}` : story.premise;
    return `<div class="sandbox-journal-entry">${escapeHtml(when)} · ${escapeHtml(place)} · ${escapeHtml(story.idols.join('、'))}<br>${escapeHtml(detail)}</div>`;
  }).join('');
  return `<h3>故事指导</h3>${rows}`;
}

function eventStatusLabel(status) {
  if (status === 'introduced') return '已经知道';
  if (status === 'active') return '正在发生';
  if (status === 'closed') return '先到这里';
  return '还没说';
}

function renderEventHook() {
  const button = field('sandboxEventHook');
  if (!button) return;
  const event = state.dailyEvent;
  const visible = Boolean(event?.blueprint?.title) && event.blueprint.day === state.day && event.record?.status !== 'closed';
  button.hidden = !visible;
  if (!visible) return;
  const title = button.querySelector('strong');
  const hook = button.querySelector('em');
  if (title) title.textContent = event.blueprint.title;
  if (hook) hook.textContent = event.blueprint.narrativeHook;
  const where = button.querySelector('small');
  if (where) where.textContent = event.blueprint.locationLabel ? `今天 · ${event.blueprint.locationLabel}` : '今天';
}

function renderEventRetry() {
  const button = field('sandboxEventRetryBtn');
  if (!button) return;
  const event = state.dailyEvent;
  const hasToday = Boolean(event?.blueprint?.title) && event.blueprint.day === state.day;
  const visible = !eventPlanRequest && !hasToday && (Boolean(eventPlanMessage) || eventPlanCanRetry(event, state.day));
  button.hidden = !visible;
  if (!visible) return;
  const detail = button.querySelector('em');
  if (detail) detail.textContent = eventPlanMessage || event?.planError || '点这里再写一次';
}

function retryDailyEvent() {
  if (eventPlanRequest) return;
  if (state.dailyEvent?.blueprint?.title && state.dailyEvent.blueprint.day === state.day) return;
  eventPlanMessage = '';
  state = writeSandboxSave({ ...state, dailyEvent: emptyDailyEvent(state.day) });
  render();
  void ensureDailyEvent();
}

function eventJournalMarkup(dayNumber, current) {
  if (current) {
    const event = state.dailyEvent;
    if (!event?.blueprint?.title || event.blueprint.day !== dayNumber) {
      return '<h3>今天的事件</h3><div class="sandbox-journal-entry">进入这一天时会写好今天的事件。</div>';
    }
    const located = event.blueprint.locationId ? getSandboxLocation(event.blueprint.locationId) : null;
    const place = event.blueprint.locationLabel || (located && located.id === event.blueprint.locationId ? located.label : '');
    const facts = event.record.facts.map((fact) => `<div class="sandbox-journal-entry">${escapeHtml(fact.summary)}</div>`).join('');
    const threads = event.record.openThreads.filter((thread) => !thread.resolved).map((thread) => thread.summary).join('；');
    return `<h3>今天的事件 · ${escapeHtml(eventStatusLabel(event.record.status))}</h3><div class="sandbox-journal-entry">${escapeHtml(event.blueprint.title)}${place ? ` · ${escapeHtml(place)}` : ''}<br>${escapeHtml(event.blueprint.narrativeHook)}</div>${facts}${threads ? `<div class="sandbox-journal-entry">还没解决：${escapeHtml(threads)}</div>` : ''}`;
  }
  const archived = (state.eventArchive || []).find((item) => item.day === dayNumber);
  if (!archived) return '';
  return `<h3>今天的事件</h3><div class="sandbox-journal-entry">${escapeHtml(archived.title)}<br>${escapeHtml(archived.outcome || '这件事先留到以后。')}</div>`;
}

function renderJournalPanel() {
  const summary = field('sandboxJournalSummary');
  const entries = field('sandboxJournalEntries');
  const days = buildDayActionLog(state);
  if (summary) summary.textContent = '过了 24:00 的日子会留下一段总结，也会写好下一天的故事指导。今天的事件记在当天这一栏。';
  if (!entries) return;
  entries.innerHTML = days.map((day) => {
    const stories = storyGuideMarkup(day.day, day.current);
    const eventMarkup = eventJournalMarkup(day.day, day.current);
    if (day.memory) {
      return `<section class="sandbox-journal-day"><h3>第 ${day.day} 日</h3><p>${escapeHtml(day.memory)}</p>${eventMarkup}${stories}</section>`;
    }
    if (day.current) {
      const actions = day.actions.length
        ? day.actions.map((action) => `<div class="sandbox-journal-entry">${escapeHtml(formatClock(action.start))} · ${escapeHtml(action.label || action.kind)} · ${Number(action.duration) || 0} 分钟</div>`).join('')
        : '<div class="sandbox-journal-entry">还没有行动。到 24:00 后会写成一段总结。</div>';
      return `<section class="sandbox-journal-day"><h3>第 ${day.day} 日 · 进行中</h3>${actions}${eventMarkup}${stories}</section>`;
    }
    const actions = day.actions.length
      ? day.actions.map((action) => `<div class="sandbox-journal-entry">${escapeHtml(formatClock(action.start))} · ${escapeHtml(action.label || action.kind)} · ${Number(action.duration) || 0} 分钟</div>`).join('')
      : '';
    return `<section class="sandbox-journal-day"><h3>第 ${day.day} 日</h3><p>${escapeHtml(day.summary)}</p>${actions}${eventMarkup}${stories}</section>`;
  }).join('');
}


function renderQuestPanel() {
  const list = field('sandboxQuestList');
  if (!list) return;
  const quests = getQuestStatusSummary(state);
  list.innerHTML = quests.map((quest) => `
    <div class="sandbox-quest-item${quest.status === 'completed' ? ' is-complete' : ''}">
      <strong>${quest.title}</strong><small>${quest.progress}/${quest.target}</small>
      <small>${quest.status === 'completed' ? '已完成' : '进行中'} · ${quest.consequence}</small>
    </div>
  `).join('');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sandbox-first-live-button';
  button.disabled = !isFirstLiveReady(state);
  button.textContent = button.disabled ? '完成全部 Step1 课题后解锁 First Live' : '开始 First Live';
  button.addEventListener('click', startFirstLive);
  list.append(button);
}

function renderCommissionPanel() {
  const list = field('sandboxCommissionList');
  if (!list) return;
  list.replaceChildren();
  const board = state.commissions;
  const slots = Array.isArray(board?.slots) ? board.slots : [];
  const fame = Number(state.wallet?.fame) || 0;
  const tier = commissionFameTier(fame);
  const note = document.createElement('p');
  note.className = 'sandbox-commission-note';
  const remaining = slots.filter((slot) => slot.status !== 'done').length;
  note.textContent = slots.length
    ? `今日剩余 ${remaining}/3 · 知名度 ${fame} · ${tier.label} · 前往地点后从「选项」里选现场处理`
    : '今天的委托还在登记。';
  list.append(note);
  if (!slots.length) return;
  const here = getSandboxLocation(state.currentLocationId).id;
  slots.forEach((slot, index) => {
    const card = document.createElement('article');
    card.className = `sandbox-quest-item${slot.status === 'done' ? ' is-complete' : ''}`;
    const title = document.createElement('strong');
    title.textContent = slot.title;
    const meta = document.createElement('small');
    const active = board.activeSlotIndex === index;
    const status = slot.status === 'done'
      ? `已结算 · ${commissionTierLabel(slot.resultTier)}`
      : active ? '当前目标' : '待前往';
    meta.textContent = `${commissionTagLabel(slot.tag)} · ${slot.locationName} · ${status}`;
    const desc = document.createElement('small');
    desc.textContent = slot.desc;
    card.append(title, meta, desc);
    if (slot.status !== 'done') {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'sandbox-first-live-button';
      const atPlace = here === slot.locationId;
      if (slot.scenePlayed && board.pending?.slotIndex === index) {
        action.textContent = '现场处理已写进「选项」';
        action.disabled = true;
      } else if (atPlace && active) {
        action.textContent = '开始这场委托';
        action.addEventListener('click', () => { void playCommissionScene(index); });
      } else {
        action.textContent = active ? `前往${slot.locationName}` : '设为目标';
        action.addEventListener('click', () => activateCommission(index));
      }
      card.append(action);
    }
    list.append(card);
  });
}

function activateCommission(slotIndex) {
  const result = setActiveCommission(state.commissions, slotIndex, state.wallet?.fame);
  if (!result.ok) {
    setText('sandboxPanelStatus', '这份委托已经完成。');
    return;
  }
  state = writeSandboxSave({ ...state, commissions: result.board });
  if (!result.board.pending) rememberSuggestedActions([]);
  render();
  const slot = result.slot;
  const here = getSandboxLocation(state.currentLocationId).id === slot.locationId;
  setText('sandboxPanelStatus', here ? `已经在${slot.locationName}。可以开始这场委托。` : `已设为目标。请前往${slot.locationName}。`);
  if (here && !slot.scenePlayed) void playCommissionScene(slot.slotIndex);
}

async function startFirstLive() {
  if (!isFirstLiveReady(state)) return;
  let script = '<beat id="sandbox-first-live-pre" speaker="kotone" cue="talk" face="happy" look="camera" position="center" background="3d-adv-classroom-00-00-noon" shot="medium" wait="text"><display lang="zh">琴音把完成课题后的成果整理好，终于有信心走向 First Live 了。制作人，我们一起把第一次舞台做好吧！</display></beat>'
    + '<beat id="sandbox-first-live-post" speaker="kotone" cue="kime" face="happy" look="camera" position="center" background="3d-adv-classroom-00-00-noon" shot="medium" wait="text"><display lang="zh">无论结果如何，这次站上舞台的准备已经成为我们共同完成的第一步。</display></beat>';
  try {
    const reply = await requestSandboxCompletion(buildSandboxFirstLivePrompt(state));
    const story = applyStoryMinutes(state, parseTimeMark(reply));
    if (story.rolled) {
      void beginNextDay(story.state, story.overflow || 0);
    } else if (story.applied) {
      state = writeSandboxSave(story.state);
      render();
    }
    const normalized = normalizeSandboxFirstLiveReply(reply);
    if (normalized.ok) script = normalized.script;
  } catch (error) {
    console.info('[sandbox] First Live 使用本地兜底演出', error);
  }
  app.elements.script.value = script;
  document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
  field('sandboxPanel').hidden = true;
  applyStageCamera('story');
  app.compile();
  const ready = await app.preloadPromise;
  if (ready) await app.goTo(0, { autoplay: false });
}

function producedActorId() {
  return beatActorId(state?.idolId === '藤田琴音' ? 'kotone' : (state?.idolId || 'kotone')) || sceneIdolId(state?.idolId) || beatActorId('kotone');
}

function idolEntry() {
  return app.director.entries.get(producedActorId()) || null;
}

async function playIdolEnter() {
  const entry = idolEntry();
  if (!entry?.player) return false;
  try {
    return await Promise.race([
      entry.player.playStageTransition('enter', {
        isCurrent: () => true,
        onStart: () => {
          entry.present = true;
          entry.canvas.style.visibility = 'visible';
          entry.canvas.style.opacity = '1';
          entry.player.setPresentationActive?.(true);
          entry.player.resume();
        },
      }),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch (error) {
    console.warn('[sandbox] 入场动作不可用', error);
    return false;
  }
}

async function playIdolExit() {
  const entry = idolEntry();
  if (!entry?.player) return false;
  entry.player.resume?.();
  try {
    await Promise.race([
      entry.player.playStageTransition('exit', {
        isCurrent: () => true,
        onStart: () => entry.player.resume?.(),
      }),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
  } catch (error) {
    console.warn('[sandbox] 离开动作不可用', error);
  }
  entry.present = false;
  if (entry.canvas) {
    entry.canvas.style.visibility = 'hidden';
    entry.canvas.style.opacity = '0';
  }
  entry.player.setPresentationActive?.(false);
  entry.player.pause?.();
  return true;
}

function waitUntilPlaybackSettles() {
  return new Promise((resolve) => {
    const start = Date.now();
    let sawPlaying = false;
    const tick = () => {
      if (app.state.playing) sawPlaying = true;
      const elapsed = Date.now() - start;
      if (sawPlaying && !app.state.playing) return resolve();
      if (elapsed > 90000) return resolve();
      setTimeout(tick, 200);
    };
    setTimeout(tick, 200);
  });
}

async function playReplyScript(script) {
  const previousAuto = app.elements.auto?.checked;
  if (app.elements.auto) app.elements.auto.checked = true;
  applyStageCamera('chat');
  app.stop();
  app.chatState.active = true;
  app.chatState.introPending = false;
  app.chatState.idolKey = state?.idolId === '藤田琴音' ? 'kotone' : (state?.idolId || 'kotone');
  app.elements.script.value = script;
  showPanel('home');
  document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
  app.compile();
  try {
    await waitUntilPlaybackSettles();
  } finally {
    if (app.elements.auto) app.elements.auto.checked = previousAuto !== false;
  }
}

async function playArrivalTalk(location, arrival) {
  let script = arrival.script;
  if (!app.chatState.pending && !orderBusy) {
    app.chatState.pending = true;
    app.setChatControlsDisabled(true);
    app.setChatStatus(arrival.returning ? '琴音看到你回来了…' : '琴音正在说这个地方…', 'busy');
    try {
      const outing = OUTING_MENU.choices.some((choice) => choice.locationId === location.id);
      const payload = await bridge.send(buildArrivalPrompt({
        idolName: state.idolId || '藤田琴音',
        background: location.background,
        placeLabel: location.label,
        context: buildSandboxAiContext(state, { locationLabel: location.label }),
        arriving: arrival.enter,
        returning: arrival.returning,
        outing,
      }), { maxTokens: arrival.returning ? 1200 : 6000, timeoutMs: arrival.returning ? 90000 : 150000 });
      const normalized = normalizeChatReply(absorbEventPatch(payload?.rawText || payload?.text || '', `arrival-${state.day}-${location.id}`), { preserveBackground: true, preserveStaging: true });
      if (!normalized.ok) throw new Error(normalized.error || '到场对话缺少完整的 Beat。');
      script = normalized.script;
      rememberSuggestedActions(normalized.options);
      app.setChatStatus('');
    } catch (error) {
      console.info('[sandbox] 到场对话使用本地一句', error);
      rememberSuggestedActions([]);
      app.setChatStatus('到场的话没生成，先用现场的一句。', 'error');
    } finally {
      app.chatState.pending = false;
      app.setChatControlsDisabled(false);
    }
  }
  await playReplyScript(script);
}

async function selectLocation(locationId) {
  if (!locationId) return false;
  if (field('sandboxPresenceDialog')?.open) field('sandboxPresenceDialog').close();
  const location = getSandboxLocation(locationId);
  const previousId = getSandboxLocation(state.currentLocationId).id;
  const wasVisible = idolVisible(state.idolOrder, previousId);
  const arrival = resolveArrival(state, location);
  const meet = arrival.talk && (previousId !== location.id || !wasVisible);
  applyStageCamera(location.id === 'home_classroom' ? 'home' : 'outing', location.id);
  state = writeSandboxSave({
    ...state,
    currentLocationId: location.id,
    currentBackground: sandboxLocationBackground(location, state.time?.clockMinutes),
    idolOrder: arrival.order,
  });
  syncInlineChat();
  render();
  app.elements.script.value = arrival.script;
  document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
  app.compile();
  const ready = await app.preloadPromise;
  const postedHere = arrival.visible && arrival.order.mode === 'stay' && !idolEntry()?.present;
  if (ready && (arrival.enter || postedHere)) await playIdolEnter();
  const commissionHere = activeCommissionAt(state.commissions, location.id);
  if (commissionHere && !commissionHere.scenePlayed && !deferEventOpening && !eventOpeningDue() && !app.chatState.pending) {
    await playCommissionScene(commissionHere.slotIndex);
    showPanel('home');
    return;
  }
  if (meet) {
    await playArrivalTalk(location, arrival);
    showPanel('home');
    return;
  }
  if (ready) await app.goTo(0, { autoplay: false });
  showPanel('home');
}

function hideTravelDialog() {
  const dialog = field('sandboxTravelDialog');
  if (dialog) dialog.hidden = true;
}

function showAreaMenu(area) {
  const dialog = field('sandboxTravelDialog');
  const choices = field('sandboxTravelChoices');
  if (!dialog || !choices || !area) return;
  const here = getSandboxLocation(state.currentLocationId).id;
  dialog.hidden = false;
  dialog.dataset.menu = 'area';
  dialog.dataset.area = area.id;
  setText('sandboxTravelTitle', area.label);
  setText('sandboxTravelText', area.prompt);
  choices.innerHTML = locationAreaPlaces(area).map((place) => {
    const current = place.locationId === here;
    return `<button type="button" data-travel-choice="${place.id}"${current ? ' class="is-current" disabled' : ''}>${place.label}${current ? ' · 当前' : ''}</button>`;
  }).join('');
  const back = field('sandboxTravelBack');
  if (back) back.hidden = true;
}

function openCurrentArea() {
  const area = locationAreaFor(state.currentLocationId);
  if (!area) return;
  if (area.openMap) {
    mapMode = area.openMap;
    showPanel('map');
    return;
  }
  showAreaMenu(area);
}

function showTravelMenu(kind) {
  const dialog = field('sandboxTravelDialog');
  const choices = field('sandboxTravelChoices');
  if (!dialog || !choices) return;
  const menu = kind === 'outing' ? OUTING_MENU : FRONT_GATE_MENU;
  dialog.hidden = false;
  dialog.dataset.menu = kind === 'outing' ? 'outing' : 'gate';
  delete dialog.dataset.area;
  setText('sandboxTravelTitle', menu.title);
  setText('sandboxTravelText', menu.prompt);
  choices.innerHTML = menu.choices.map((choice) => `<button type="button" data-travel-choice="${choice.id}">${choice.label}</button>`).join('');
  const back = field('sandboxTravelBack');
  if (back) back.hidden = kind !== 'outing';
}

function chooseTravel(choiceId) {
  const dialog = field('sandboxTravelDialog');
  if (dialog?.dataset.menu === 'area') {
    const area = locationAreaFor(state.currentLocationId);
    const place = locationAreaPlaces(area).find((item) => item.id === choiceId);
    if (!place || place.locationId === getSandboxLocation(state.currentLocationId).id) return;
    hideTravelDialog();
    selectLocation(place.locationId);
    return;
  }
  const menu = dialog?.dataset.menu === 'outing' ? OUTING_MENU : FRONT_GATE_MENU;
  const choice = menu.choices.find((item) => item.id === choiceId);
  if (!choice) return;
  if (choice.menu) {
    showTravelMenu(choice.menu);
    return;
  }
  hideTravelDialog();
  selectLocation(choice.locationId);
}

function hideOrderDialog() {
  const dialog = field('sandboxOrderDialog');
  if (dialog) dialog.hidden = true;
}

function showOrderMenu(kind) {
  const dialog = field('sandboxOrderDialog');
  const choices = field('sandboxOrderChoices');
  if (!dialog || !choices) return;
  dialog.hidden = false;
  const here = getSandboxLocation(state.currentLocationId);
  if (kind === 'places') {
    dialog.dataset.menu = 'places';
    setText('sandboxOrderTitle', '前往地点');
    setText('sandboxOrderText', `${describeIdolOrder(state)}选择要让她去的地点。到达之前画面上不会出现她。`);
    choices.classList.add('sandbox-order-choices');
    choices.innerHTML = listSandboxLocations().map((location) => `<button type="button" data-order-place="${location.id}">${location.label}</button>`).join('');
    const back = field('sandboxOrderBack');
    if (back) back.hidden = false;
    return;
  }
  dialog.dataset.menu = 'root';
  setText('sandboxOrderTitle', '指令');
  setText('sandboxOrderText', `${describeIdolOrder(state)}可以让她跟随、留在${here.label}，或前往别的地点。`);
  choices.classList.remove('sandbox-order-choices');
  choices.innerHTML = '<button type="button" data-order-kind="follow">跟随</button><button type="button" data-order-kind="stay">停留在这里</button><button type="button" data-order-kind="places">前往地点</button>';
  const back = field('sandboxOrderBack');
  if (back) back.hidden = true;
}

let orderBusy = false;

async function issueIdolOrder(command) {
  if (orderBusy || app.chatState.pending) return;
  const plan = planIdolOrder(state, command);
  if (!plan.ok) {
    hideOrderDialog();
    app.setChatStatus(plan.reason === 'absent' ? '琴音不在这里，没法让她停留。' : '这个地点现在去不了。', 'error');
    return;
  }
  orderBusy = true;
  hideOrderDialog();
  const button = field('sandboxOrderBtn');
  if (button) button.disabled = true;
  const hereId = state.currentLocationId;
  const location = getSandboxLocation(hereId);
  app.chatState.pending = true;
  app.setChatControlsDisabled(true);
  app.setChatStatus('正在根据指令生成短回复…', 'busy');
  try {
    if (plan.revealAfter) {
      state = writeSandboxSave({ ...state, idolOrder: plan.nextOrder });
      const arrival = resolveArrival({ ...state, idolOrder: { mode: 'travel', locationId: location.id } }, location);
      app.stop();
      app.chatState.active = false;
      app.elements.script.value = arrival.script;
      document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
      app.compile();
      const ready = await app.preloadPromise;
      if (ready) await playIdolEnter();
    }
    let script = fallbackOrderScript({
      idolName: state.idolId || '藤田琴音',
      background: location.background,
      playerLine: plan.playerLine,
    });
    try {
      const payload = await bridge.send(buildIdolOrderPrompt({
        idolName: state.idolId || '藤田琴音',
        background: location.background,
        context: buildSandboxAiContext(state, { locationLabel: location.label }),
        directive: plan.directive,
        playerLine: plan.playerLine,
      }), { maxTokens: 900, timeoutMs: 90000 });
      const normalized = normalizeChatReply(absorbEventPatch(payload?.rawText || payload?.text || '', `order-${state.day}-${location.id}`), { preserveBackground: true, preserveStaging: true });
      if (!normalized.ok) throw new Error(normalized.error || '指令回复缺少完整的 Beat。');
      script = normalized.script;
      rememberSuggestedActions(normalized.options);
      app.setChatStatus('');
    } catch (error) {
      console.info('[sandbox] 指令短回复使用本地兜底', error);
      rememberSuggestedActions([]);
      app.setChatStatus('短回复没有生成，已按指令行动。', 'error');
    }
    if (!plan.presentForReply && !plan.revealAfter) script = withoutIdolCast(script);
    await playReplyScript(script);
    if (plan.shouldExit && state.currentLocationId === hereId) await playIdolExit();
    if (!plan.revealAfter) state = writeSandboxSave({ ...state, idolOrder: plan.nextOrder });
    render();
  } finally {
    orderBusy = false;
    app.chatState.pending = false;
    app.setChatControlsDisabled(false);
    if (button) button.disabled = false;
  }
}

function showPanel(kind) {
  if (field('sandboxPresenceDialog')?.open) field('sandboxPresenceDialog').close();
  closePassDialog();
  panelKind = String(kind || 'actions');
  const panel = field('sandboxPanel');
  if (!panel) return;
  const homeApp = document.querySelector('.sandbox-home-app');
  homeApp?.classList.toggle('is-map-open', panelKind === 'map');
  panel.dataset.panelKind = panelKind;
  if (panelKind !== 'map') {
    mapView?.dispose();
    mapView = null;
    hideTravelDialog();
    const switcher = field('sandboxMapSwitch');
    if (switcher) switcher.hidden = true;
  }
  hideOrderDialog();
  const selectedNav = ['chat', 'actions', 'home', 'map', 'shop'].includes(panelKind) ? panelKind : 'home';
  document.querySelectorAll('.sandbox-bottom-nav [data-panel]').forEach((button) => {
    const selected = button.dataset.panel === selectedNav;
    button.classList.toggle('is-active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const produceBoard = field('sandboxProduceBoard');
  const actionsOpen = panelKind === 'actions';
  homeApp?.classList.toggle('is-actions-open', actionsOpen);
  homeApp?.classList.remove('is-chat-open');
  if (produceBoard) produceBoard.hidden = !actionsOpen;
  if (actionsOpen) {
    panel.hidden = true;
    renderProduceBoard();
    return;
  }
  if (panelKind === 'home') {
    panel.hidden = true;
    document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
    return;
  }
  if (panelKind === 'chat') {
    panel.hidden = true;
    document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
    queueMicrotask(() => field('chatInput')?.focus());
    return;
  }
  panel.hidden = false;
  const labels = {
    map: ['CAMPUS MAP', '学园地图', '选择地点后会切换到对应场景，并作为下一次行动的默认地点。'],
    actions: ['DAILY ACTION', '今天做什么', '选择一个行动，前端会先检查时长、体力和每日次数。'],
    quests: ['CURRENT QUESTS', '当前课题', '完成课题会逐步解锁琴音的第一次 First Live。'],
    commissions: ['EXTERNAL WORK', '外部委托', '每天 3 条对外商演。设为目标后前往地点，现场四个行动会写进「选项」，点一项就结算。'],
    shop: ['HOSHIBOSHI SHOP', '初星商店', '初星币会在委托完成后累积，商店兑换接口预留在这里。'],
    journal: ['DAY LOG', '行动日志', '过了 24:00 后，当天总结会留在这里。今天的事件和故事指导也写在这里。'],
    chat: ['IDOL CHAT', '和琴音闲聊', '闲聊会复用现有 free-chat 的 Beat 和 TTS 流程。'],
    plan: ['TIME SKIP', '快速度过今天', '写下这段时间怎么过。确认后会按 15 分钟时间线一次推进，不必逐项点选。'],
    info: ['SANDBOX', 'Step1 日常沙盒', '逐行动和长时推进共用一条 15 分钟时间线。'],
    settings: ['SETTINGS', '设置', 'API、语音和画面分开存放。密钥只留在这台浏览器里。'],
  };
  const [eyebrow, title, description] = labels[panelKind] || labels.actions;
  setText('sandboxPanelEyebrow', eyebrow);
  setText('sandboxPanelTitle', title);
  setText('sandboxPanelDescription', description);
  field('sandboxActionList').hidden = panelKind !== 'actions';
  field('sandboxLongPlan').hidden = panelKind !== 'plan';
  field('sandboxQuestList').hidden = panelKind !== 'quests';
  field('sandboxCommissionList').hidden = panelKind !== 'commissions';
  field('sandboxMapSurface').hidden = panelKind !== 'map';
  // Map is intentionally explored through the image regions; keep the old
  // card list populated only as a non-visual fallback for future accessibility work.
  field('sandboxMapList').hidden = true;
  field('sandboxJournalView').hidden = panelKind !== 'journal';
  field('sandboxSettingsView').hidden = panelKind !== 'settings';
  if (panelKind === 'map') renderMapPanel();
  if (panelKind === 'quests') renderQuestPanel();
  if (panelKind === 'commissions') renderCommissionPanel();
  if (panelKind === 'journal') renderJournalPanel();
  if (panelKind === 'settings') fillSandboxSettings();
  setText('sandboxPanelStatus', panelKind === 'actions' || panelKind === 'settings' ? '' : '');
}

function fillSandboxSettings() {
  const stored = readStoredFreeChatSettings();
  const base = field('sandboxApiBase');
  const model = field('sandboxApiModel');
  const key = field('sandboxApiKey');
  if (base) base.value = stored.baseUrl || '';
  if (model) model.value = stored.model || '';
  if (key) key.value = stored.apiKey || '';
  const voice = resolveFishTtsSettings();
  const enabled = field('sandboxTtsEnabled');
  const proxy = field('sandboxTtsProxy');
  const voiceModel = field('sandboxTtsModel');
  const voiceKey = field('sandboxTtsKey');
  if (enabled) enabled.checked = Boolean(voice.enabled);
  if (proxy) proxy.value = voice.proxyUrl || '';
  if (voiceModel) voiceModel.value = voice.model || '';
  if (voiceKey) voiceKey.value = voice.apiKey || '';
  const picture = readSandboxPicture();
  const taa = field('sandboxTaaEnabled');
  const sharpen = field('sandboxPlateSharpen');
  if (taa) taa.checked = picture.taa;
  if (sharpen) sharpen.checked = picture.plateSharpen;
  applySandboxDialogueFontSize(picture);
}

function readSandboxPicture() {
  try {
    return normalizeSandboxPicture(JSON.parse(localStorage.getItem(SANDBOX_PICTURE_KEY) || '{}'));
  } catch {
    return normalizeSandboxPicture(null);
  }
}

function applySandboxDialogueFontSize(source) {
  const picture = normalizeSandboxPicture(source);
  const root = document.querySelector('.sandbox-home-app');
  const cssSize = `${picture.dialogueFontSize}px`;
  root?.style.setProperty('--sandbox-dialogue-font-size', cssSize);
  const isDesktop = root?.classList.contains('is-desktop-layout');
  document.querySelectorAll('.sandbox-dialogue-card p').forEach((node) => {
    if (isDesktop) node.style.setProperty('font-size', cssSize, 'important');
    else node.style.removeProperty('font-size');
  });
  const input = field('sandboxDialogueFontSize');
  const output = field('sandboxDialogueFontSizeValue');
  if (input) input.value = String(picture.dialogueFontSize);
  if (output) output.textContent = `${picture.dialogueFontSize}px`;
}

function saveSandboxPicture() {
  const picture = normalizeSandboxPicture({
    taa: Boolean(field('sandboxTaaEnabled')?.checked),
    plateSharpen: Boolean(field('sandboxPlateSharpen')?.checked),
    dialogueFontSize: field('sandboxDialogueFontSize')?.value,
  });
  localStorage.setItem(SANDBOX_PICTURE_KEY, JSON.stringify(picture));
  setLivePictureOptions(picture);
  applySandboxDialogueFontSize(picture);
  const status = field('sandboxPanelStatus');
  if (status) status.textContent = '画面设置已记在本机。';
}

function saveSandboxSettings() {
  if (panelKind !== 'settings') return;
  saveSandboxPicture();
  const stored = readStoredFreeChatSettings();
  const next = mergeStoredChatSettings(stored, {
    baseUrl: field('sandboxApiBase')?.value,
    model: field('sandboxApiModel')?.value,
    apiKey: field('sandboxApiKey')?.value,
  }, { allowEmpty: true });
  localStorage.setItem(SANDBOX_CHAT_SETTINGS_KEY, JSON.stringify(next));
  const voice = applyFishTtsSettings({
    enabled: Boolean(field('sandboxTtsEnabled')?.checked),
    proxyUrl: field('sandboxTtsProxy')?.value || '',
    model: field('sandboxTtsModel')?.value || '',
    apiKey: field('sandboxTtsKey')?.value || '',
  }, {
    persist: true,
    onError: message => app.setChatStatus(String(message || '角色语音播放失败'), 'error'),
  });
  const status = field('sandboxPanelStatus');
  if (status) {
    const chatText = next.baseUrl && next.model ? '闲聊 API 已保存在本机。' : '请填写闲聊 API 地址和模型。';
    status.textContent = `${chatText}${fishTtsStatus(voice)}`;
  }
}

function syncInlineChat() {
  app.inlineChat = true;
  app.chatBackground = state?.currentBackground || BACKGROUND;
  app.chatState.idolKey = state?.idolId === '藤田琴音' ? 'kotone' : (state?.idolId || 'kotone');
  const location = getSandboxLocation(state?.currentLocationId);
  const idolHere = idolVisible(state?.idolOrder, state?.currentLocationId);
  app.chatContext = () => [
    buildSandboxAiContext(state, { locationLabel: location?.label || '', soloAction: !idolHere }),
    idolHere ? produceOpeningContext(state) : '',
  ].filter(Boolean).join('\n\n');
}

let startIdolId = '藤田琴音';

function renderStartScreen() {
  const screen = field('sandboxStart');
  if (!screen) return;
  const started = produceRunStarted(state);
  screen.hidden = started;
  const list = field('sandboxStartIdols');
  const idols = listProduceIdols();
  if (list && !list.childElementCount) {
    for (const name of idols) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.idol = name;
      button.textContent = name;
      list.append(button);
    }
  }
  if (!idols.includes(startIdolId)) startIdolId = idols[0] || '藤田琴音';
  list?.querySelectorAll('button').forEach((button) => {
    const selected = button.dataset.idol === startIdolId;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

async function beginProduce() {
  if (app.chatState.pending || produceRunStarted(state)) return;
  const idols = listProduceIdols();
  const idolId = idols.includes(startIdolId) ? startIdolId : (idols[0] || '藤田琴音');
  const next = createSandboxState({ idolId });
  next.flags = { produceStarted: true };
  state = writeSandboxSave(next);
  localBridge.restore([]);
  pendingLongPlan = null;
  renderStartScreen();
  render();
  syncInlineChat();
  const opening = playProduceOpening();
  void ensureDailyEvent();
  void ensureDailyCommissions();
  await opening;
}

async function playProduceOpening() {
  const button = field('sandboxBondEpisodeBtn');
  if (app.chatState.pending) return;
  rememberSuggestedActions([]);
  deferEventOpening = true;
  if (button) button.disabled = true;
  app.stop();
  app.chatState.pending = true;
  app.setChatControlsDisabled(true);
  app.setChatStatus('正在准备第一话…', 'busy');
  try {
    const location = getSandboxLocation(state.currentLocationId);
    const payload = await bridge.send(buildProduceOpeningPrompt(state, { locationLabel: location.label }), { maxTokens: 12000, timeoutMs: 240000 });
    const normalized = normalizeChatReply(absorbEventPatch(payload?.rawText || payload?.text || '', `bond-${state.day}-${state.idolId}`), { preserveBackground: true, preserveStaging: true });
    if (!normalized.ok) throw new Error(normalized.error || '第一话没有写成可播放的 Beat。');
    state = writeSandboxSave(markProduceOpeningSeen(state));
    syncInlineChat();
    app.chatState.active = true;
    app.chatState.introPending = false;
    app.chatState.idolKey = state?.idolId === '藤田琴音' ? 'kotone' : (state?.idolId || 'kotone');
    app.elements.script.value = normalized.script;
    showPanel('home');
    applyStageCamera('story');
    app.compile();
    await waitUntilPlaybackSettles();
  } catch (error) {
    app.setChatStatus(String(error?.message || error || '第一话生成失败。'), 'error');
  } finally {
    app.chatState.pending = false;
    app.setChatControlsDisabled(false);
    if (button) button.disabled = false;
    deferEventOpening = false;
  }
  await playPendingEventOpening();
}

async function loadSandboxWorldbook() {
  try {
    tavernBook = await loadTavernWorldbook('初星学园');
  } catch {
    tavernBook = [];
  }
}

function describePlanPreview(preview) {
  if (!preview) return '';
  const labels = preview.segments.map((entry) => `${entry.label} ${entry.duration}分钟`).join('、');
  return `预计 ${formatClock(preview.startMinutes)}～${formatClock(preview.endMinutes)}：${labels}；成长 ${preview.segments.filter((entry) => entry.kind === 'lesson' || entry.kind === 'training').length} 次；初星币 +${preview.rewards.coins || 0}`;
}

let pendingLongPlan = null;
field('sandboxCustomTimeBtn')?.addEventListener('click', confirmCustomTime);
field('sandboxCustomTimeInput')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') confirmCustomTime();
});
field('sandboxPreviewPlanBtn')?.addEventListener('click', () => {
  const text = field('sandboxPlanInput')?.value || '';
  const parsed = parseLongPlan(text, state);
  const result = validateLongPlan(parsed, state);
  pendingLongPlan = result.ok ? parsed : null;
  field('sandboxCommitPlanBtn').disabled = !result.ok;
  field('sandboxPlanPreview').textContent = result.ok
    ? describePlanPreview(result.preview)
    : (result.errors?.[0]?.message || '计划无法执行，请调整安排。');
});
field('sandboxAiPlanBtn')?.addEventListener('click', async () => {
  const input = field('sandboxPlanInput');
  const button = field('sandboxAiPlanBtn');
  const status = field('sandboxPlanPreview');
  if (!input?.value.trim()) {
    if (status) status.textContent = '先写下你想安排的时间段。';
    return;
  }
  button.disabled = true;
  if (status) status.textContent = '正在让 AI 整理安排…';
  try {
    const normalized = normalizeSandboxPlanReply(await requestSandboxCompletion(buildSandboxPlanPrompt(state, input.value)));
    if (!normalized.ok) throw new Error(normalized.errors?.[0]?.message || 'AI 计划无法解析');
    const validation = validateLongPlan(normalized.plan, state);
    pendingLongPlan = validation.ok ? normalized.plan : null;
    field('sandboxCommitPlanBtn').disabled = !validation.ok;
    if (status) status.textContent = validation.ok ? describePlanPreview(validation.preview) : (validation.errors?.[0]?.message || 'AI 计划无法执行。');
  } catch (error) {
    if (status) status.textContent = `AI 暂不可用，已保留手动预览：${String(error?.message || error)}`;
  } finally {
    button.disabled = false;
  }
});
field('sandboxCommitPlanBtn')?.addEventListener('click', async () => {
  if (!pendingLongPlan) return;
  const result = commitLongPlan(pendingLongPlan, state);
  if (!result.ok) {
    field('sandboxPanelStatus').textContent = result.errors?.[0]?.message || '长时计划无法提交。';
    return;
  }
  state = applyQuestEffects(result.state, { type: 'sync_from_timeline' });
  state = writeSandboxSave(state);
  pendingLongPlan = null;
  field('sandboxCommitPlanBtn').disabled = true;
  field('sandboxPlanPreview').textContent = '';
  render();
  field('sandboxPanelStatus').textContent = `已推进 ${result.entries.length} 段行动，时间来到 ${formatClock(state.time.clockMinutes)}。`;
  if (state.time.clockMinutes >= state.time.endMinutes) void beginNextDay(state, 0);
});

field('sandboxSettleDayBtn')?.addEventListener('click', () => {
  void beginNextDay(state, 0);
});

function storeActionResult(result) {
  const previous = result.state.currentBackground;
  state = writeSandboxSave(syncSandboxLocationBackground(applyQuestEffects(result.state, { type: 'sync_from_timeline' })));
  if (result.beatScript && previous && previous !== state.currentBackground) {
    result.beatScript = result.beatScript.split(previous).join(state.currentBackground);
  }
}

async function playActionBeat(result) {
  applyStageCamera('chat');
  let script = result.beatScript || buildActionBeat(result.action, result.state);
  if (!idolVisible(state.idolOrder, state.currentLocationId)) script = withoutIdolCast(script);
  app.elements.script.value = script;
  document.querySelector('.sandbox-story-chrome')?.classList.add('is-visible');
  app.compile();
  const ready = await app.preloadPromise;
  if (ready) await app.goTo(0, { autoplay: false });
}

function produceFailureText(reason, kind) {
  if (reason === 'daily_growth_limit') return '今天的上课和训练已经到上限。';
  if (reason === 'day_end_exceeded') return '今天剩下的时间不够完成这项行动。';
  if (reason === 'low_stamina') return '体力不足，当前体力不足以进行该行动。';
  if (reason === 'wrong_location') {
    const location = getSandboxLocation(state.currentLocationId);
    return `${location.label}不适合进行${kind === 'lesson' ? '上课' : '训练'}，请先从地图切换地点。`;
  }
  return '当前行动无法执行。';
}

async function runProduceAction(kind, attribute) {
  const status = field('sandboxProduceStatus');
  const settlement = produceActionSettlement(state.idolId, kind, attribute, state.stats);
  if (!canLocationHostAction(state.currentLocationId, kind)) {
    if (status) status.textContent = produceFailureText('wrong_location', kind);
    return;
  }
  if (Number(state.stats?.stamina) < settlement.costs.stamina) {
    if (status) status.textContent = produceFailureText('low_stamina', kind);
    return;
  }
  const label = `${attribute}${kind === 'lesson' ? '公开课' : '训练'}`;
  const result = runSandboxAction({
    kind,
    attribute,
    label,
    locationId: state.currentLocationId,
    background: state.currentBackground,
    costs: settlement.costs,
    rewards: settlement.rewards,
  }, { state });
  if (!result.ok) {
    if (status) status.textContent = produceFailureText(result.reason, kind);
    renderProduceBoard();
    return;
  }
  storeActionResult(result);
  render();
  if (status) status.textContent = '';
  showPanel('home');
  await playActionBeat(result);
  if (state.time.clockMinutes >= state.time.endMinutes) await beginNextDay(state, 0);
}

async function runAction(kind) {
  if (!canLocationHostAction(state.currentLocationId, kind)) {
    const location = getSandboxLocation(state.currentLocationId);
    const status = field('sandboxPanelStatus');
    if (status) status.textContent = `${location.label}不适合进行${kind === 'lesson' ? '上课' : kind === 'training' ? '训练' : '这项行动'}，请先从地图切换地点。`;
    return false;
  }
  const result = runSandboxAction(
    { kind, locationId: state.currentLocationId, background: state.currentBackground },
    { state },
  );
  const status = field('sandboxPanelStatus');
  if (!result.ok) {
    if (status) status.textContent = `当前行动无法执行：${result.reason}`;
    return false;
  }
  storeActionResult(result);
  render();
  if (status) status.textContent = `${result.action.label}完成，时间推进到 ${formatClock(state.time.clockMinutes)}。`;
  await playActionBeat(result);
  if (state.time.clockMinutes >= state.time.endMinutes) await beginNextDay(state, 0);
  return true;
}

document.querySelectorAll('[data-panel]').forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});
document.querySelectorAll('[data-action-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.actionKind === 'commission') {
      showPanel('commissions');
      return;
    }
    runAction(button.dataset.actionKind);
  });
});
field('sandboxProduceActions')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-produce-kind]');
  if (!button || button.disabled) return;
  runProduceAction(button.dataset.produceKind, button.dataset.produceAttribute);
});
field('sandboxNotebookBtn')?.addEventListener('click', () => showPanel('journal'));
const sandboxPhone = mountSandboxPhone({
  getClockLabel: () => formatTimeLabel(state?.time?.clockMinutes || 0),
  getDayLabel: () => `第${state?.day || 1}日`,
  getDispatchLabel: () => getSandboxLocation(state?.currentLocationId || 'home_classroom').label,
  onDispatch: dispatchIdolToCurrentLocation,
});
field('sandboxPhoneBtn')?.addEventListener('click', () => sandboxPhone.open());
field('sandboxPhoneCorner')?.addEventListener('click', () => sandboxPhone.open());
field('sandboxPanelClose')?.addEventListener('click', () => showPanel('home'));
document.querySelectorAll('[data-map-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mapMode === mapMode) return;
    mapMode = button.dataset.mapMode;
    if (panelKind === 'map') renderMapPanel();
  });
});
field('sandboxTravelChoices')?.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-travel-choice]');
  if (choice) chooseTravel(choice.dataset.travelChoice);
});
field('sandboxTravelBack')?.addEventListener('click', () => showTravelMenu('gate'));
field('sandboxTravelClose')?.addEventListener('click', hideTravelDialog);
field('sandboxTravelDialog')?.addEventListener('click', (event) => {
  if (event.target === field('sandboxTravelDialog')) hideTravelDialog();
});
field('sandboxBondEpisodeBtn')?.addEventListener('click', () => { playProduceOpening(); });
field('sandboxSuggestBtn')?.addEventListener('click', () => {
  const panel = field('sandboxSuggestPanel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
  field('sandboxSuggestBtn')?.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
});
field('sandboxStartIdols')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-idol]');
  if (!button) return;
  startIdolId = button.dataset.idol || startIdolId;
  renderStartScreen();
});
field('sandboxStartBtn')?.addEventListener('click', () => { beginProduce(); });
field('sandboxStartWeirdScriptBtn')?.addEventListener('click', enterWeirdScriptMode);
field('sandboxWeirdScriptAutoBtn')?.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleWeirdScriptAutoplay();
});
field('sandboxAreaBtn')?.addEventListener('click', openCurrentArea);
field('sandboxOrderBtn')?.addEventListener('click', () => showOrderMenu('root'));
field('sandboxOrderChoices')?.addEventListener('click', (event) => {
  const place = event.target.closest('[data-order-place]');
  const kind = event.target.closest('[data-order-kind]');
  const command = orderCommandFromChoice({
    orderKind: kind?.dataset.orderKind || '',
    orderPlace: place?.dataset.orderPlace || '',
  });
  if (!command) return;
  if (command.menu) showOrderMenu(command.menu);
  else issueIdolOrder(command);
});
field('sandboxPassTimeBtn')?.addEventListener('click', openPassDialog);
field('sandboxPassClose')?.addEventListener('click', closePassDialog);
field('sandboxPassConfirm')?.addEventListener('click', confirmPassTime);
field('sandboxPassInput')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') confirmPassTime();
});
document.querySelectorAll('[data-pass-minutes]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = field('sandboxPassInput');
    if (input) input.value = button.dataset.passMinutes || '';
    setText('sandboxPassStatus', '');
    input?.focus();
  });
});
field('sandboxPassDialog')?.addEventListener('click', (event) => {
  if (event.target === field('sandboxPassDialog')) closePassDialog();
});
field('sandboxOrderBack')?.addEventListener('click', () => showOrderMenu('root'));
field('sandboxOrderClose')?.addEventListener('click', hideOrderDialog);
field('sandboxOrderDialog')?.addEventListener('click', (event) => {
  if (event.target === field('sandboxOrderDialog')) hideOrderDialog();
});
field('sandboxSaveSettingsBtn')?.addEventListener('click', saveSandboxSettings);
field('sandboxSettingsHomeBtn')?.addEventListener('click', leaveWeirdScriptMode);
['sandboxApiBase', 'sandboxApiModel', 'sandboxApiKey', 'sandboxTtsEnabled', 'sandboxTtsProxy', 'sandboxTtsModel', 'sandboxTtsKey'].forEach((id) => {
  field(id)?.addEventListener('change', saveSandboxSettings);
});
['sandboxTaaEnabled', 'sandboxPlateSharpen'].forEach((id) => {
  field(id)?.addEventListener('change', saveSandboxPicture);
});
field('sandboxDialogueFontSize')?.addEventListener('input', () => {
  const picture = readSandboxPicture();
  applySandboxDialogueFontSize({ ...picture, dialogueFontSize: field('sandboxDialogueFontSize')?.value });
});
field('sandboxDialogueFontSize')?.addEventListener('change', saveSandboxPicture);
fillSandboxSettings();
field('sandboxResetBtn')?.addEventListener('click', () => {
  clearSandboxSave();
  localBridge.restore([]);
  state = createSandboxState({ idolId: startIdolId || '藤田琴音' });
  writeSandboxSave(state);
  pendingLongPlan = null;
  field('sandboxCommitPlanBtn').disabled = true;
  field('sandboxPlanPreview').textContent = '';
  app.stop();
  showPanel('home');
  render();
  renderStartScreen();
  field('sandboxPanelStatus').textContent = '沙盒存档已重置。';
});

field('sandboxPresenceBtn')?.addEventListener('click', () => {
  renderCampusPresence();
  if (isSandboxCampusLocation(state.currentLocationId)) field('sandboxPresenceDialog')?.showModal();
});
field('sandboxPresenceClose')?.addEventListener('click', () => field('sandboxPresenceDialog')?.close());
field('sandboxEventHook')?.addEventListener('click', () => showPanel('journal'));
field('sandboxEventRetryBtn')?.addEventListener('click', () => retryDailyEvent());
field('sandboxWeirdScriptBackBtn')?.addEventListener('click', leaveWeirdScriptMode);
field('sandboxWeirdScriptGenerateBtn')?.addEventListener('click', () => { void generateWeirdScript(); });
field('sandboxWeirdScriptContinueBtn')?.addEventListener('click', () => { void generateWeirdScript({ continuation: true }); });
field('sandboxWeirdScriptEditorBtn')?.addEventListener('click', openBeatEditor);
document.querySelectorAll('[data-weird-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    if (weirdScriptBusy) return;
    const selected = button.dataset.weirdMode;
    weirdScriptMode = selected === WEIRD_SCRIPT_MODE.EXPAND
      ? WEIRD_SCRIPT_MODE.EXPAND
      : selected === WEIRD_SCRIPT_MODE.DIRECT
        ? WEIRD_SCRIPT_MODE.DIRECT
        : WEIRD_SCRIPT_MODE.FULL;
    weirdScriptCompleted = '';
    weirdScriptLastBackground = '';
    setWeirdScriptStatus(weirdScriptModeCopy().status);
    updateWeirdScriptControls();
  });
});
field('sandboxWeirdScriptInput')?.addEventListener('input', () => {
  if (weirdScriptBusy) return;
  weirdScriptCompleted = '';
  weirdScriptLastBackground = '';
  updateWeirdScriptControls();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || weirdScriptPage === 'idle') return;
  event.preventDefault();
  leaveWeirdScriptMode();
});

syncInlineChat();
consumeBeatEditorResult();
const opening = presenceOpening(state);
const savedOrder = normalizeIdolOrder(state.idolOrder);
if (opening.order.mode !== savedOrder.mode || opening.order.locationId !== savedOrder.locationId) {
  state = writeSandboxSave({ ...state, idolOrder: opening.order });
}
app.elements.script.value = opening.script;
app.compile();
app.preloadPromise?.then((ready) => {
  if (ready) return app.goTo(0, { autoplay: false });
  return undefined;
}).catch(() => {});
render();
renderStartScreen();
showPanel(panelKind);
loadSandboxWorldbook();
if (produceRunStarted(state)) {
  void ensureDailyEvent();
  void ensureDailyCommissions();
}

window.hatsuSandboxHome = {
  app,
  enterWeirdScriptMode,
  leaveWeirdScriptMode,
  generateWeirdScript,
  get state() { return state; },
  refresh() {
    state = readSandboxSave();
    localBridge.restore(state.chatHistory);
    render();
    renderStartScreen();
    return state;
  },
  resetSave() {
    clearSandboxSave();
    localBridge.restore([]);
    state = createSandboxState({ idolId: '藤田琴音' });
    writeSandboxSave(state);
    render();
    renderStartScreen();
    return state;
  },
  validateAction(kind) {
    return validateAction(state, { kind });
  },
  selectLocation,
  settleDay() {
    const result = settleSandboxDay(state);
    state = writeSandboxSave(result.state);
    render();
    return result;
  },
};

window.addEventListener('beforeunload', () => { responsiveLayout.disconnect(); mapView?.dispose(); bridge.dispose(); app.dispose(); }, { once: true });