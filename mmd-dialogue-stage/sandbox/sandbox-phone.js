import { chatCompletionsUrl } from '../beat-chat.js?v=20261026-stage-v1';
import { readStoredFreeChatSettings } from './sandbox-chat.js?v=20261026-settings-persist-v1';

export const SANDBOX_PHONE_STORAGE_KEY = 'hatsuSandboxPhoneV1';
export const SANDBOX_PHONE_LIKED_KEY = 'hatsu_phone_music_liked_v1';
export const SANDBOX_PHONE_MUSIC_CDN = 'https://pub-cfdeb8f85de84d8193695eca002e7880.r2.dev';

export const SANDBOX_PHONE_IDOLS = [
  '藤田琴音', '有村麻央', '姬崎莉波', '花海咲季', '花海佑芽', '紫云清夏',
  '葛城莉莉娅', '十王星南', '秦谷美铃', '雨夜燕', '月村手毬', '仓本千奈', '筱泽广', '亚纱里老师',
];

export const SANDBOX_PHONE_APPS = [
  { id: 'line', name: 'LINE', label: 'L', theme: '#06c755', ready: true },
  { id: 'music', name: '音乐', label: 'M', theme: '#1db954', ready: true },
  { id: 'broadcast', name: '广播部', label: 'B', theme: '#ff8a4c', note: '广播部还连着育成页的节目稿和来访安排。' },
  { id: 'sns', name: '初星圈', label: '星', theme: 'linear-gradient(135deg, #ff6b8a, #f9c584)', note: '初星圈还连着育成页的动态和通知。' },
  { id: 'world-engine', name: '初星世界引擎', label: '星', theme: 'linear-gradient(135deg, #167c80, #22324a)', note: '初星世界引擎还连着育成页的世界档案。' },
  { id: 'sandbox-console', name: '沙盒控制台', label: 'SC', theme: 'linear-gradient(135deg, #d7874f, #5c3145)', note: '沙盒控制台改的是育成页存档。这边的时间和地点仍在主界面调整。' },
];

export function defaultPhoneState() {
  return { friends: ['藤田琴音'], messages: { 藤田琴音: [] } };
}

export function normalizePhoneState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const friends = [];
  const incoming = Array.isArray(source.friends) ? source.friends : ['藤田琴音'];
  for (const name of incoming) {
    const idol = String(name || '').trim();
    if (SANDBOX_PHONE_IDOLS.includes(idol) && !friends.includes(idol)) friends.push(idol);
  }
  if (!friends.includes('藤田琴音')) friends.unshift('藤田琴音');
  const stored = source.messages && typeof source.messages === 'object' ? source.messages : {};
  const messages = {};
  for (const idol of friends) {
    const list = Array.isArray(stored[idol]) ? stored[idol] : [];
    messages[idol] = list.slice(-40).map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      text: cleanPhoneReply(item?.text).slice(0, 500),
    })).filter((item) => item.text);
  }
  return { friends, messages };
}

export function readPhoneState(storage) {
  try {
    return normalizePhoneState(JSON.parse(storage.getItem(SANDBOX_PHONE_STORAGE_KEY) || 'null'));
  } catch {
    return defaultPhoneState();
  }
}

export function writePhoneState(storage, phone) {
  storage.setItem(SANDBOX_PHONE_STORAGE_KEY, JSON.stringify(normalizePhoneState(phone)));
}

export function addPhoneFriend(phone, name) {
  const next = normalizePhoneState(phone);
  const idol = String(name || '').trim();
  if (!SANDBOX_PHONE_IDOLS.includes(idol)) return { phone: next, added: false };
  if (next.friends.includes(idol)) return { phone: next, added: false };
  next.friends.push(idol);
  next.messages[idol] = [];
  return { phone: next, added: true };
}

export function appendPhoneMessage(phone, idol, role, text) {
  const next = normalizePhoneState(phone);
  const clean = cleanPhoneReply(text).slice(0, 500);
  if (!next.friends.includes(idol) || !clean) return next;
  next.messages[idol] = [...(next.messages[idol] || []), {
    role: role === 'assistant' ? 'assistant' : 'user',
    text: clean,
  }].slice(-40);
  return next;
}

export function cleanPhoneReply(text) {
  return String(text || '')
    .replace(/<beat\b[^>]*>[\s\S]*?<\/beat>/gi, '')
    .replace(/【初星时间标记】\s*\d+/g, '')
    .replace(/【初星任务标记】\s*[A-Za-z0-9_-]+/g, '')
    .replace(/<quest_flag\b[^>]*\/?>/gi, '')
    .replace(/<time_mark\b[^>]*\/?>/gi, '')
    .replace(/<relationship_update\b[^>]*\/?>/gi, '')
    .replace(/<scene_cast(?:_patch)?\b[^>]*>[\s\S]*?<\/scene_cast(?:_patch)?>/gi, '')
    .trim();
}

export function buildPhoneLineMessages({ idol, history = [] } = {}) {
  const recent = history.slice(-12).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: item.text,
  }));
  return [
    {
      role: 'system',
      content: `你是${idol}，正在用 LINE 和制作人私聊。这是手机里的一条短消息，不是舞台演出，也不推进日程。只输出一条口语回复。不要写 Beat、镜头、站位、时间标记、好感标签或数值，不要代替制作人说话。`,
    },
    ...recent,
  ];
}

export async function requestPhoneReply({ settings, idol, history, fetchImpl = fetch } = {}) {
  const url = chatCompletionsUrl(settings?.baseUrl);
  const model = String(settings?.model || '').trim();
  if (!url || !String(settings?.apiKey || '').trim() || !model) {
    throw new Error('请先在设置里填写闲聊 API。');
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: buildPhoneLineMessages({ idol, history }),
    }),
  });
  if (!response.ok) throw new Error(`手机聊天没有接通（${response.status}）。`);
  const data = await response.json();
  const text = cleanPhoneReply(data?.choices?.[0]?.message?.content || '');
  if (!text) throw new Error('没有收到回复。');
  return text;
}

export function phoneMusicUrl(key) {
  const file = String(key || '').trim();
  if (!file) return '';
  if (/^https?:\/\//i.test(file)) return file;
  return `${SANDBOX_PHONE_MUSIC_CDN}/${file.split('/').map(encodeURIComponent).join('/')}`;
}

export function phoneTracks() {
  const list = typeof window !== 'undefined' && Array.isArray(window.HATSU_TRACKS) ? window.HATSU_TRACKS : [];
  return list.filter((track) => track && track.file && track.title);
}

function escapePhoneText(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export function mountSandboxPhone({ getClockLabel = () => '', getDayLabel = () => '', getDispatchLabel = () => '当前地点', onDispatch = null } = {}) {
  const root = document.getElementById('sandboxPhone');
  if (!root || root.dataset.bound === '1') return { open() {}, close() {} };
  root.dataset.bound = '1';
  const home = document.getElementById('sandboxPhoneHome');
  const line = document.getElementById('sandboxPhoneLine');
  const music = document.getElementById('sandboxPhoneMusic');
  const simple = document.getElementById('sandboxPhoneSimple');
  const grid = document.getElementById('sandboxPhoneGrid');
  const dock = document.getElementById('sandboxPhoneDock');
  const lineBody = document.getElementById('sandboxPhoneLineBody');
  const lineForm = document.getElementById('sandboxPhoneLineForm');
  const lineInput = document.getElementById('sandboxPhoneLineInput');
  const lineTitle = document.getElementById('sandboxPhoneLineTitle');
  const lineStatus = document.getElementById('sandboxPhoneLineStatus');
  const dispatchButton = document.getElementById('sandboxPhoneDispatch');
  const musicList = document.getElementById('sandboxPhoneMusicList');
  const nowTitle = document.getElementById('sandboxPhoneNowTitle');
  const nowArtist = document.getElementById('sandboxPhoneNowArtist');
  const playButton = document.getElementById('sandboxPhonePlay');
  const audio = document.getElementById('sandboxPhoneAudio');
  let view = 'home';
  let activeIdol = '藤田琴音';
  let lineMode = 'list';
  let pending = false;
  let trackIndex = -1;

  function storagePhone() {
    return readPhoneState(localStorage);
  }

  function show(next) {
    view = next;
    home.hidden = next !== 'home';
    line.hidden = next !== 'line';
    music.hidden = next !== 'music';
    simple.hidden = next !== 'simple';
    root.querySelector('.sandbox-phone-status').classList.toggle('is-line', next === 'line');
    root.querySelector('.sandbox-phone-status').classList.toggle('is-music', next === 'music');
  }

  function renderHome() {
    document.getElementById('sandboxPhoneDate').textContent = getDayLabel();
    document.getElementById('sandboxPhoneClock').textContent = getClockLabel();
    const icon = (app) => `
      <button type="button" class="sandbox-phone-app" data-phone-app="${app.id}">
        <span class="sandbox-phone-app-badge" style="background:${app.theme}">${escapePhoneText(app.label)}</span>
        <span>${escapePhoneText(app.name)}</span>
      </button>`;
    grid.innerHTML = `${SANDBOX_PHONE_APPS.map(icon).join('')}
      <div class="sandbox-phone-app is-empty" aria-hidden="true"><span class="sandbox-phone-app-badge">+</span><span>添加应用</span></div>`;
    dock.innerHTML = SANDBOX_PHONE_APPS.slice(0, 4).map(icon).join('');
  }

  function renderLine() {
    const phone = storagePhone();
    lineForm.hidden = lineMode !== 'chat';
    if (lineMode === 'add') {
      lineTitle.textContent = '添加好友';
      lineBody.innerHTML = SANDBOX_PHONE_IDOLS.map((idol) => {
        const added = phone.friends.includes(idol);
        return `<button type="button" class="sandbox-phone-row" data-phone-friend="${escapePhoneText(idol)}" ${added ? 'disabled' : ''}>
          <strong>${escapePhoneText(idol)}</strong><span>${added ? '已添加' : '添加'}</span>
        </button>`;
      }).join('');
      return;
    }
    if (lineMode === 'chat') {
      lineTitle.textContent = activeIdol;
      if (dispatchButton) {
        dispatchButton.hidden = typeof onDispatch !== 'function';
        dispatchButton.textContent = `邀请到${String(getDispatchLabel() || '当前地点')}`;
        dispatchButton.disabled = pending;
      }
      const messages = phone.messages[activeIdol] || [];
      lineBody.innerHTML = messages.map((item) => `
        <p class="sandbox-phone-bubble is-${item.role}">${escapePhoneText(item.text)}</p>
      `).join('') || '<p class="sandbox-phone-empty">还没有消息。</p>';
      lineBody.scrollTop = lineBody.scrollHeight;
      return;
    }
    lineTitle.textContent = '聊天';
    lineBody.innerHTML = phone.friends.map((idol) => {
      const last = (phone.messages[idol] || []).at(-1);
      return `<button type="button" class="sandbox-phone-row" data-phone-thread="${escapePhoneText(idol)}">
        <strong>${escapePhoneText(idol)}</strong><span>${escapePhoneText(last?.text || '发一条消息')}</span>
      </button>`;
    }).join('');
  }

  function likedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(SANDBOX_PHONE_LIKED_KEY) || '[]')); }
    catch { return new Set(); }
  }

  function renderMusic() {
    const tracks = phoneTracks();
    const liked = likedSet();
    musicList.innerHTML = tracks.map((track, index) => `
      <button type="button" class="sandbox-phone-track${index === trackIndex ? ' is-current' : ''}" data-phone-track="${index}">
        <strong>${escapePhoneText(track.title)}</strong>
        <span>${escapePhoneText(track.artist || '')}</span>
        <em>${liked.has(track.file) ? '已喜欢' : '喜欢'}</em>
      </button>`).join('') || '<p class="sandbox-phone-empty">歌单还没有载入。</p>';
    const current = tracks[trackIndex];
    nowTitle.textContent = current?.title || '还没有播放';
    nowArtist.textContent = current?.artist || '';
    playButton.textContent = audio && !audio.paused && current ? '暂停' : '播放';
  }

  function openApp(id) {
    const app = SANDBOX_PHONE_APPS.find((entry) => entry.id === id);
    if (!app) return;
    if (id === 'line') {
      lineMode = 'list';
      if (lineStatus) lineStatus.textContent = '';
      show('line');
      renderLine();
      return;
    }
    if (id === 'music') {
      show('music');
      renderMusic();
      return;
    }
    document.getElementById('sandboxPhoneSimpleTitle').textContent = app.name;
    document.getElementById('sandboxPhoneSimpleText').textContent = app.note;
    show('simple');
  }

  function playTrack(index) {
    const tracks = phoneTracks();
    if (!audio || !tracks.length) return;
    trackIndex = (index + tracks.length) % tracks.length;
    audio.src = phoneMusicUrl(tracks[trackIndex].file);
    audio.play().catch(() => {});
    renderMusic();
  }

  function open() {
    renderHome();
    show('home');
    root.hidden = false;
  }

  function close() {
    root.hidden = true;
  }

  root.addEventListener('click', (event) => {
    if (event.target === root) close();
    const appButton = event.target.closest('[data-phone-app]');
    if (appButton) openApp(appButton.dataset.phoneApp);
    const thread = event.target.closest('[data-phone-thread]');
    if (thread) {
      activeIdol = thread.dataset.phoneThread;
      lineMode = 'chat';
      renderLine();
    }
    const friend = event.target.closest('[data-phone-friend]');
    if (friend && !friend.disabled) {
      const result = addPhoneFriend(storagePhone(), friend.dataset.phoneFriend);
      writePhoneState(localStorage, result.phone);
      renderLine();
    }
    const track = event.target.closest('[data-phone-track]');
    if (track) {
      const like = event.target.closest('em');
      const index = Number(track.dataset.phoneTrack);
      const file = phoneTracks()[index]?.file;
      if (like && file) {
        const liked = likedSet();
        if (liked.has(file)) liked.delete(file);
        else liked.add(file);
        localStorage.setItem(SANDBOX_PHONE_LIKED_KEY, JSON.stringify([...liked]));
        renderMusic();
        return;
      }
      playTrack(index);
    }
    if (event.target.closest('[data-phone-back]')) {
      if (view === 'line' && lineMode !== 'list') {
        lineMode = 'list';
        renderLine();
      } else {
        show('home');
        renderHome();
      }
    }
    if (event.target.closest('[data-phone-home]')) {
      show('home');
      renderHome();
    }
    if (event.target.id === 'sandboxPhoneAdd') {
      lineMode = lineMode === 'add' ? 'list' : 'add';
      renderLine();
    }
  });

  lineForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = lineInput.value.trim();
    if (!text || pending) return;
    const settings = readStoredFreeChatSettings(localStorage);
    let phone = appendPhoneMessage(storagePhone(), activeIdol, 'user', text);
    writePhoneState(localStorage, phone);
    lineInput.value = '';
    renderLine();
    pending = true;
    if (lineStatus) lineStatus.textContent = '正在等待回复…';
    try {
      const reply = await requestPhoneReply({ settings, idol: activeIdol, history: phone.messages[activeIdol] });
      phone = appendPhoneMessage(storagePhone(), activeIdol, 'assistant', reply);
      writePhoneState(localStorage, phone);
      if (lineStatus) lineStatus.textContent = '';
    } catch (error) {
      if (lineStatus) lineStatus.textContent = error.message || '没有收到回复。';
    } finally {
      pending = false;
      renderLine();
    }
  });

  dispatchButton?.addEventListener('click', async () => {
    if (pending || typeof onDispatch !== 'function') return;
    pending = true;
    if (lineStatus) lineStatus.textContent = `正在联系${activeIdol}…`;
    renderLine();
    try {
      const result = await onDispatch({ idolId: activeIdol });
      const message = String(result?.message || '').trim();
      if (message) {
        const phone = appendPhoneMessage(storagePhone(), activeIdol, 'assistant', message);
        writePhoneState(localStorage, phone);
      }
      if (lineStatus) lineStatus.textContent = '';
    } catch (error) {
      if (lineStatus) lineStatus.textContent = error?.message || '联络没有接通。';
    } finally {
      pending = false;
      renderLine();
    }
  });

  document.getElementById('sandboxPhonePrev')?.addEventListener('click', () => playTrack(trackIndex - 1));
  document.getElementById('sandboxPhoneNext')?.addEventListener('click', () => playTrack(trackIndex + 1));
  playButton?.addEventListener('click', () => {
    if (!audio) return;
    if (trackIndex < 0) {
      playTrack(0);
      return;
    }
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
    renderMusic();
  });
  audio?.addEventListener('play', renderMusic);
  audio?.addEventListener('pause', renderMusic);
  audio?.addEventListener('ended', () => playTrack(trackIndex + 1));
  document.getElementById('sandboxPhoneClose')?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) close();
  });

  return { open, close };
}
