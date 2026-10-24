import { BeatPlayerApp } from './beat-player.js?v=20261024-idle-chat-v2';
import { createLocalChatBridge } from './beat-chat.js?v=20261024-worldbook-v1';
import { loadTavernWorldbook } from './worldbook-scan.js?v=20261024-worldbook-v1';
import { applyFishTtsSettings, fishTtsStatus, resolveFishTtsSettings } from './free-chat-tts.js?v=20261024-tts-v1';

const SETTINGS_KEY = 'hatsuFreeChatSettings';

const IDOL_CORES = {
    藤田琴音: '现实收益、被选择的不安、夸奖作为燃料、从不能相信自己到相信制作人。',
    月村手毬: '冷淡外壳、脆弱内心、讨厌旧日的自己、需要精确而严格的支持。',
    花海咲季: '骄傲、好胜、害怕输给重要对手，但会把恐惧转回胜利计划。',
    花海佑芽: '直觉型行动力、对姐姐咲季的憧憬与胜负心、压倒性成长欲、把失败立刻转成下一次挑战。',
    筱泽广: '理论极强、身体极弱、喜欢为了成功而陷入困难的过程。',
    十王星南: '学园顶点、被完美形象困住、重新学习数值以外的偶像魅力。',
    秦谷美铃: '慵懒、照顾欲、温柔独占欲、安静自负、按自己的步调走向顶点。',
    仓本千奈: '能力不足与优渥出身带来的羞耻、总想放弃却会回来完成下一步、把他人的支持变成真心回礼。',
    葛城莉莉娅: '从零开始的异国少女、自我否定与害羞、即使害怕也会行动的坚韧、把得到的支持认真还给观众。',
    紫云清夏: '开朗轻佻的保护色、芭蕾伤痛留下的恐惧、害怕认真后再次失去、以渐进训练重新选择舞台。',
    有村麻央: '永远屈居星南之下的执念，既渴望超越又藏着惜与依赖；用好强遮住怕再输。宿舍长的可靠外壳下，也有想为自己而赢的心情。',
    姬崎莉波: '温柔成熟的姐姐气质、过去扮演妹妹偶像的失败、从刻意营销到自然照顾、也承认自己想被保护与喜欢竞争。',
    雨夜燕: '学生会副会长，实力与傲气都摆在面上。视星南为对手，严格，也会照顾人，嘴上不承认自己想被陪。',
};

const DEFAULT_SYSTEM_PROMPT = [
    '你是初星学园的偶像 {{idol}}。',
    '人物要点：{{core}}',
    '这是闲聊：不消耗行动，不推进日程，不改数值。围绕玩家此刻的话自然回应，保持角色口吻，不要擅自推进重大矛盾。',
    '本轮输出格式以用户消息中的 Beat 要求为准。',
].join('\n');

const DEFAULT_WORLDBOOK = '常驻：闲聊发生在初星学园的家·教室（午）。不要改写课程、训练和演出日程。';

function readStoredSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function field(id) {
    return document.getElementById(id);
}

function selectedIdolName() {
    const select = field('chatIdolSelect');
    return select?.selectedOptions?.[0]?.textContent?.trim() || '';
}

function collectSettings() {
    const idolName = selectedIdolName();
    return {
        baseUrl: field('chatApiBase')?.value || '',
        apiKey: field('chatApiKey')?.value || '',
        model: field('chatApiModel')?.value || '',
        temperature: field('chatApiTemperature')?.value,
        maxTokens: field('chatApiMaxTokens')?.value,
        systemPrompt: field('chatSystemPrompt')?.value || '',
        worldbook: field('chatWorldbook')?.value || '',
        worldbookEntries: tavernBook,
        idolName,
        idolCore: IDOL_CORES[idolName] || '',
    };
}

function saveSettings() {
    const settings = collectSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        worldbook: settings.worldbook,
    }));
}

function syncFishTts({ persist = false } = {}) {
    const saved = resolveFishTtsSettings();
    const config = applyFishTtsSettings({
        ...saved,
        enabled: Boolean(field('chatTtsEnabled')?.checked),
        apiKey: field('chatTtsApiKey')?.value || '',
    }, {
        persist,
        onError: message => app?.setChatStatus?.(String(message || '角色语音播放失败'), 'error'),
    });
    const status = field('chatTtsStatus');
    if (status) status.textContent = fishTtsStatus(config);
    return config;
}

function fillFishTts() {
    const saved = resolveFishTtsSettings();
    if (field('chatTtsEnabled')) field('chatTtsEnabled').checked = saved.enabled;
    if (field('chatTtsApiKey')) field('chatTtsApiKey').value = saved.apiKey || '';
    syncFishTts();
}

function fillSettings(stored) {
    field('chatApiBase').value = stored.baseUrl || '';
    field('chatApiKey').value = stored.apiKey || '';
    field('chatApiModel').value = stored.model || '';
    field('chatApiTemperature').value = stored.temperature || '0.8';
    field('chatApiMaxTokens').value = stored.maxTokens || '800';
    field('chatSystemPrompt').value = stored.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    field('chatWorldbook').value = stored.worldbook ?? DEFAULT_WORLDBOOK;
    const settings = field('chatSettings');
    if (settings) settings.open = !stored.baseUrl || !stored.model;
}

function restoreChatLog(app, idolName) {
    for (const turn of app.chatBridge.historyFor(idolName)) {
        app.appendChatLine(turn.role, turn.text, turn.label);
    }
}

let tavernBook = [];

function setWorldbookStatus(text) {
    const status = field('chatWorldbookStatus');
    if (status) status.textContent = text;
}

async function loadHatsuboshiWorldbook() {
    setWorldbookStatus('正在读取酒馆世界书「初星学园」。');
    try {
        tavernBook = await loadTavernWorldbook('初星学园');
        const count = tavernBook.length;
        setWorldbookStatus(`已读取酒馆世界书「初星学园」，共 ${count} 条。发送时按扫描深度、次要关键词和递归标记激活。`);
        if (field('chatWorldbook')?.value.trim() === DEFAULT_WORLDBOOK.trim()) {
            field('chatWorldbook').value = '';
            saveSettings();
        }
    } catch {
        tavernBook = [];
        setWorldbookStatus('没有连上酒馆，世界书「初星学园」未载入。请从酒馆页面打开本页；下方文本框仍可作为补充。');
    }
}

const stored = readStoredSettings();
fillSettings(stored);
fillFishTts();

const bridge = createLocalChatBridge({ getSettings: collectSettings });
const app = new BeatPlayerApp(document, { chatBridge: bridge, loadSample: false });
const enterChatMode = app.enterChatMode.bind(app);
app.enterChatMode = idolKey => {
    const entered = enterChatMode(idolKey);
    restoreChatLog(app, selectedIdolName());
    return entered;
};

for (const id of ['chatApiBase', 'chatApiKey', 'chatApiModel', 'chatApiTemperature', 'chatApiMaxTokens', 'chatSystemPrompt', 'chatWorldbook']) {
    field(id)?.addEventListener('change', saveSettings);
}
for (const id of ['chatTtsEnabled', 'chatTtsApiKey']) {
    field(id)?.addEventListener('change', () => syncFishTts({ persist: true }));
}

field('clearChatBtn')?.addEventListener('click', () => {
    const idolName = selectedIdolName();
    bridge.clear(idolName);
    app.clearChatLog();
    app.appendChatLine('system', `已清空${idolName}的本次闲聊。`, '系统');
});

app.enterChatMode(field('chatIdolSelect')?.value || 'kotone');
loadHatsuboshiWorldbook();
window.freeChat = app;
window.addEventListener('beforeunload', () => {
    saveSettings();
    app.dispose();
    bridge.dispose();
}, { once: true });
