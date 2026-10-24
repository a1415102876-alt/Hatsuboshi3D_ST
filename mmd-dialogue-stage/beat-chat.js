import { parseBeatScript } from './beat-protocol.js';
import { activateTavernWorldbook, importTavernWorldbook } from './worldbook-scan.js';

const DEFAULT_BACKGROUND = '家·教室（午）';
const DEFAULT_TIMEOUT = 120000;
const BUILTIN_SPEAKERS = new Set(['producer', '制作人', 'narrator', '旁白']);

function escapeAttribute(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function removeAttribute(source, name) {
    const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi');
    return String(source || '').replace(pattern, '');
}

function setAttribute(source, name, value) {
    return `${String(source || '').trim()} ${name}="${escapeAttribute(value)}"`.trim();
}

/**
 * Build the small, self-contained prompt used by the standalone chat panel.
 * It deliberately asks for Beat markup so the response can re-enter the
 * existing action, expression, lip-sync and TTS pipeline.
 */
export function buildChatPrompt({ idolName, userText, background = DEFAULT_BACKGROUND } = {}) {
    const idol = String(idolName || '').trim();
    const text = String(userText || '').trim();
    if (!text) throw new Error('消息不能为空');
    if (!idol) throw new Error('未选择偶像');
    return [
        '[HATSU_OUTPUT_MODE:BEAT_CHAT]',
        '你正在为初星学园 3D 闲聊模式生成一轮简短回复。',
        `当前偶像：${idol}`,
        `当前场景：${background}。镜头固定为 medium，不要输出 camera、camera-motion、camera-duration、camera-ease 或运镜描述。`,
        '只输出一个或多个 <beat>...</beat>，不要输出解释、Markdown 代码围栏、VN 的 <dialogue>、旧格式标签、选项或 NIA 结构。',
        `每个情绪或动作变化拆成独立 Beat；speaker 使用 ${idol}，只有确实需要制作人回应时才使用 producer。`,
        '每个 Beat 都使用 cue、face、look、position、background 和 shot 等现有字段；background 固定为当前场景，shot 固定为 medium，position 固定为 center。',
        '回复应自然承接玩家的话，保持角色口吻，并在需要时给出日语 <tts lang="ja">；不要把日语放进 display 文本。',
        `玩家说：${text}`,
    ].join('\n');
}

/** Force chat responses into the single fixed scene and medium shot. */
export function forceMediumBeatScript(source, { background = DEFAULT_BACKGROUND } = {}) {
    const input = String(source || '').trim();
    if (!input) return '';
    const scene = String(background || DEFAULT_BACKGROUND).trim() || DEFAULT_BACKGROUND;
    return input.replace(/<beat\b([^>]*)>([\s\S]*?)<\/beat>/gi, (_match, rawAttrs, body) => {
        let attrs = String(rawAttrs || '');
        for (const name of ['background', 'shot', 'camera', 'camera-motion', 'camera-duration', 'camera-ease', 'position', 'look']) {
            attrs = removeAttribute(attrs, name);
        }
        attrs = setAttribute(attrs, 'background', scene);
        attrs = setAttribute(attrs, 'shot', 'medium');
        attrs = setAttribute(attrs, 'position', 'center');
        attrs = setAttribute(attrs, 'look', 'camera');
        return `<beat ${attrs}>${body}</beat>`;
    });
}

/**
 * Normalize and validate one model reply before handing it to BeatPlayerApp.
 * A response containing no complete Beat is never allowed to become dialogue.
 */
export function normalizeChatReply(source, options = {}) {
    const raw = String(source || '').replace(/^```(?:xml|html|text)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (!raw || /<\/?(?:dialogue|vn|nia_[a-z_]+)\b/i.test(raw)) {
        return { ok: false, error: '闲聊回复不是 Beat 格式。' };
    }
    const matches = raw.match(/<beat\b[^>]*>[\s\S]*?<\/beat>/gi) || [];
    if (!matches.length || matches.length !== (raw.match(/<beat\b/gi) || []).length) {
        return { ok: false, error: '闲聊回复缺少完整的 Beat 结束标签。' };
    }
    const script = forceMediumBeatScript(matches.join('\n'), options);
    const parsed = parseBeatScript(script, {
        allowOtherSpeakers: true,
        backgrounds: [options.background || DEFAULT_BACKGROUND],
        defaultBackground: options.background || DEFAULT_BACKGROUND,
    });
    if (!parsed.beats.length || parsed.errors.some(error => ['malformed-beat', 'empty-text'].includes(error.code))) {
        return { ok: false, error: '闲聊回复中没有可播放的完整 Beat。', errors: parsed.errors };
    }
    return { ok: true, script, beats: parsed.beats, errors: parsed.errors };
}

function makeRequestId(prefix = 'beat-chat') {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function getParentWindow(windowRef) {
    try {
        return windowRef?.parent && windowRef.parent !== windowRef ? windowRef.parent : null;
    } catch (error) {
        return null;
    }
}

/**
 * Small postMessage adapter for the existing st.html transactional bridge.
 * It does not mutate the host chat itself; the host owns that transaction.
 */
export function createChatBridge({ windowRef = globalThis.window, timeoutMs = DEFAULT_TIMEOUT } = {}) {
    const listeners = new Map();
    const contextWaiters = new Set();
    const host = getParentWindow(windowRef);
    let disposed = false;
    let context = null;

    const removeListener = (eventName, handler) => {
        try { windowRef?.removeEventListener?.(eventName, handler); } catch (error) {}
    };
    const onMessage = event => {
        const data = event?.data || {};
        if (data.source !== 'hatsuboshi-produce-host') return;
        if (data.type === 'character') {
            context = { character: data.character || null, saveScope: String(data.saveScope || '') };
            for (const resolve of contextWaiters) resolve(context);
            contextWaiters.clear();
            if (!listeners.size) removeListener('message', onMessage);
            return;
        }
        if (!['aiReplyCommitted', 'primaryAiError'].includes(data.type)) return;
        const requestId = String(data.requestId || '');
        const pending = listeners.get(requestId);
        if (!pending || String(data.channelLeaseId || '') !== pending.channelLeaseId) return;
        listeners.delete(requestId);
        clearTimeout(pending.timer);
        removeListener('message', onMessage);
        if (data.type === 'primaryAiError') {
            pending.reject(new Error(String(data.error || '闲聊生成失败')));
        } else {
            pending.resolve({
                requestId,
                channelLeaseId: pending.channelLeaseId,
                text: String(data.text || data.rawText || ''),
                rawText: String(data.rawText || data.text || ''),
                isFinal: data.isFinal !== false,
            });
        }
    };

    const post = payload => {
        if (disposed) throw new Error('闲聊桥已关闭');
        if (!host?.postMessage) throw new Error('当前页面没有连接到 SillyTavern');
        host.postMessage(payload, '*');
    };

    const requestContext = () => {
        if (context) return Promise.resolve(context);
        if (!host?.postMessage) return Promise.reject(new Error('当前页面没有连接到 SillyTavern'));
        return new Promise((resolve, reject) => {
            let waiter;
            const timer = setTimeout(() => {
                contextWaiters.delete(waiter);
                reject(new Error('未能读取当前酒馆角色档案'));
            }, Math.min(Number(timeoutMs) || DEFAULT_TIMEOUT, 10000));
            waiter = value => {
                clearTimeout(timer);
                resolve(value);
            };
            contextWaiters.add(waiter);
            windowRef?.addEventListener?.('message', onMessage);
            try { post({ source: 'hatsuboshi-produce', type: 'getCharacter' }); }
            catch (error) { clearTimeout(timer); contextWaiters.delete(waiter); reject(error); }
        });
    };

    const send = (prompt, { saveScope = context?.saveScope || `beat-chat-${Date.now()}`, requestId = makeRequestId() } = {}) => {
        const text = String(prompt || '').trim();
        if (!text) return Promise.reject(new Error('闲聊提示词为空'));
        if (!host?.postMessage) return Promise.reject(new Error('当前页面没有连接到 SillyTavern'));
        const channelLeaseId = makeRequestId('beat-chat-lease');
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                listeners.delete(requestId);
                removeListener('message', onMessage);
                reject(new Error('闲聊生成超时，请重试'));
            }, Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT);
            listeners.set(requestId, { resolve, reject, timer, channelLeaseId });
            windowRef?.addEventListener?.('message', onMessage);
            try {
                post({
                    source: 'hatsuboshi-produce',
                    type: 'sendPrompt',
                    requestId,
                    channelLeaseId,
                    saveScope: String(saveScope || `beat-chat-${Date.now()}`),
                    ownerKind: 'beat_chat',
                    generationMode: 'shujuku_same_layer',
                    prompt: text,
                });
            } catch (error) {
                clearTimeout(timer);
                listeners.delete(requestId);
                removeListener('message', onMessage);
                reject(error);
            }
        });
    };

    return {
        requestContext,
        send,
        get context() { return context; },
        dispose() {
            disposed = true;
            for (const pending of listeners.values()) {
                clearTimeout(pending.timer);
                pending.reject(new Error('闲聊桥已关闭'));
            }
            listeners.clear();
            contextWaiters.clear();
            removeListener('message', onMessage);
        },
    };
}

export function chatCompletionsUrl(baseUrl) {
    const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

export function applyChatPreset(template, { idol = '', core = '' } = {}) {
    return String(template || '')
        .replace(/\{\{\s*idol\s*\}\}/g, idol)
        .replace(/\{\{\s*char\s*\}\}/g, idol)
        .replace(/\{\{\s*core\s*\}\}/g, core);
}

function worldbookKeys(entry) {
    const source = Array.isArray(entry?.keys) ? entry.keys : Array.isArray(entry?.key) ? entry.key : entry?.key;
    const list = Array.isArray(source) ? source : String(source || '').split(/[、,，]/);
    return list.map(key => String(key || '').trim()).filter(Boolean);
}

function normalizeWorldbookEntry(entry) {
    if (!entry || entry.disable || entry.enabled === false) return null;
    const content = String(entry.content || '').trim().slice(0, 2000);
    if (!content) return null;
    return {
        keys: worldbookKeys(entry),
        content,
        constant: Boolean(entry.constant),
        comment: String(entry.comment || '').trim(),
    };
}

function normalizeWorldbookData(data) {
    const rawEntries = Array.isArray(data)
        ? data
        : Array.isArray(data?.entries)
            ? data.entries
            : data?.entries && typeof data.entries === 'object'
                ? Object.values(data.entries)
                : [];
    return rawEntries.map(normalizeWorldbookEntry).filter(Boolean).slice(0, 40);
}

function parsePlainWorldbook(text) {
    return String(text || '').split(/\n---\n/).map(block => {
        const lines = block.trim().split('\n').map(line => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        const head = lines[0];
        if (/^常驻(?:[:：]|$)/.test(head)) {
            const inline = head.replace(/^常驻[:：]?/, '').trim();
            const content = [inline, ...lines.slice(1)].filter(Boolean).join('\n').trim();
            return content ? { keys: [], content, constant: true } : null;
        }
        const keyMatch = head.match(/^关键词[:：]\s*(.*)$/);
        if (!keyMatch) return null;
        const keys = keyMatch[1].split(/[、,，]/).map(key => key.trim()).filter(Boolean);
        const content = lines.slice(1).join('\n').trim();
        return keys.length && content ? { keys, content, constant: false } : null;
    }).filter(Boolean).slice(0, 40);
}

/** Accept a SillyTavern worldbook JSON export or the small plain-text format. */
export function parseWorldbook(source) {
    const text = String(source || '').trim();
    if (!text) return [];
    if (text.startsWith('{') || text.startsWith('[')) {
        try {
            return normalizeWorldbookData(JSON.parse(text));
        } catch (error) {
            // A JSON-looking draft can still be edited as plain text.
        }
    }
    return parsePlainWorldbook(text);
}

/**
 * Constant entries always qualify. Keyword entries qualify when any primary
 * key occurs in the scan text. The result is inserted once, in this order.
 */
export function matchWorldbookEntries(entries, text, { maxChars = 2400 } = {}) {
    const haystack = String(text || '').toLowerCase();
    const selected = [];
    let used = 0;
    const add = entry => {
        if (!entry || used >= maxChars) return;
        const content = String(entry.content || '').trim().slice(0, maxChars - used);
        if (!content) return;
        selected.push({ ...entry, content });
        used += content.length;
    };
    for (const entry of entries || []) if (entry.constant) add(entry);
    for (const entry of entries || []) {
        if (entry.constant || !entry.keys?.length) continue;
        const hit = entry.keys.some(key => key && haystack.includes(String(key).toLowerCase()));
        if (hit) add(entry);
    }
    return selected;
}

export function extractChatIdolName(prompt) {
    return (String(prompt || '').match(/当前偶像：(.+)/) || [])[1]?.trim() || '';
}

export function extractChatPlayerLine(prompt) {
    return (String(prompt || '').match(/玩家说：([\s\S]*)$/) || [])[1]?.trim() || '';
}

export function assembleLocalChatMessages({ systemPrompt = '', worldEntries = [], history = [], userPrompt = '' } = {}) {
    const lore = worldEntries.map(entry => entry.content.trim()).filter(Boolean).join('\n\n');
    const system = [String(systemPrompt || '').trim(), lore ? `【世界书】\n${lore}` : ''].filter(Boolean).join('\n\n');
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    for (const item of history) {
        if (!item || (item.role !== 'user' && item.role !== 'assistant')) continue;
        const content = String(item.content || '').trim();
        if (!content) continue;
        messages.push({ role: item.role, content });
    }
    messages.push({ role: 'user', content: String(userPrompt || '') });
    return messages;
}

function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}

function chatDisplayText(beats) {
    return (beats || []).map(beat => `${beat.speaker}：${beat.text}`).join('\n');
}

function chatWorldbookEntries(settings, scanMessages, idol) {
    const text = String(settings.worldbook || '').trim();
    let pasted = [];
    if (text.startsWith('{') || text.startsWith('[')) {
        try {
            pasted = importTavernWorldbook(JSON.parse(text));
        } catch {
            pasted = [];
        }
    }
    if (!pasted.length) pasted = importTavernWorldbook(parseWorldbook(text));
    const loaded = Array.isArray(settings.worldbookEntries) ? settings.worldbookEntries : [];
    return activateTavernWorldbook([...loaded, ...pasted], scanMessages, {
        characterName: idol,
        userName: settings.userName || '制作人',
    });
}

/**
 * Browser chat-completion bridge. It keeps the Beat player's send/requestContext
 * shape, and supplies the worldbook plus recent turns that SillyTavern used to inject.
 */
export function createLocalChatBridge({ fetchImpl = globalThis.fetch, getSettings, timeoutMs = DEFAULT_TIMEOUT, historyLimit = 8 } = {}) {
    const histories = new Map();
    let disposed = false;

    const readSettings = () => {
        const settings = typeof getSettings === 'function' ? getSettings() : {};
        return settings && typeof settings === 'object' ? settings : {};
    };
    const turnsFor = idol => histories.get(String(idol || '')) || [];
    const remember = (idol, turn) => {
        const key = String(idol || '');
        const next = [...turnsFor(key), turn].slice(-historyLimit);
        histories.set(key, next);
    };

    return {
        requestContext() {
            if (disposed) return Promise.reject(new Error('闲聊桥已关闭'));
            return Promise.resolve({ character: { name: '初星学园' }, saveScope: 'local-free-chat' });
        },
        historyFor(idolName) {
            return turnsFor(idolName).map(turn => ({ ...turn }));
        },
        clear(idolName) {
            histories.delete(String(idolName || ''));
        },
        async send(prompt, { requestId = makeRequestId(), saveScope = 'local-free-chat' } = {}) {
            if (disposed) throw new Error('闲聊桥已关闭');
            const text = String(prompt || '').trim();
            if (!text) throw new Error('闲聊提示词为空');
            const settings = readSettings();
            const url = chatCompletionsUrl(settings.baseUrl);
            const model = String(settings.model || '').trim();
            if (!url || !model) throw new Error('请先填写 API 地址和模型');
            const idol = extractChatIdolName(text) || String(settings.idolName || '').trim();
            const playerLine = extractChatPlayerLine(text);
            const history = turnsFor(idol);
            const scanMessages = [text, ...[...history].reverse().map(turn => turn.content)];
            const messages = assembleLocalChatMessages({
                systemPrompt: applyChatPreset(settings.systemPrompt, { idol, core: settings.idolCore }),
                worldEntries: chatWorldbookEntries(settings, scanMessages, idol),
                history: history.map(turn => ({ role: turn.role, content: turn.content })),
                userPrompt: text,
            });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_TIMEOUT);
            try {
                const response = await fetchImpl(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${String(settings.apiKey || '').trim()}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: clampNumber(settings.temperature, 0.8, 0, 2),
                        max_tokens: clampNumber(settings.maxTokens, 800, 64, 4000),
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error(`闲聊生成失败：HTTP ${response.status}`);
                const json = await response.json();
                const reply = String(json?.choices?.[0]?.message?.content || '').trim();
                const normalized = normalizeChatReply(reply);
                if (!normalized.ok) throw new Error(normalized.error || '闲聊回复不是 Beat 格式。');
                if (playerLine) remember(idol, { role: 'user', content: `玩家说：${playerLine}`, text: playerLine, label: '你' });
                remember(idol, { role: 'assistant', content: normalized.script, text: chatDisplayText(normalized.beats), label: idol || '偶像' });
                return {
                    requestId,
                    channelLeaseId: 'local',
                    saveScope,
                    text: reply,
                    rawText: reply,
                    isFinal: true,
                };
            } catch (error) {
                if (error?.name === 'AbortError') throw new Error('闲聊生成超时，请重试');
                throw error;
            } finally {
                clearTimeout(timer);
            }
        },
        dispose() {
            disposed = true;
        },
    };
}

export { BUILTIN_SPEAKERS };
