import { BeatPlayerApp } from './beat-player.js?v=20261030-perf-diagnostic-v2';

const SAMPLE_SCRIPT = `<beat speaker="kotone" cue="pinch" look="mao" position="left" background="声乐练习室-午" shot="wide" wait="text">先让琴音和麻央一起入场，记录双人基础开销。</beat>
<beat speaker="rinami" cue="pinch" look="hski" position="left" shot="wide" wait="text">再让莉波和手毬加入，这一句开始保持四人同屏。</beat>
<beat speaker="mao" cue="talk" look="kotone" position="right" shot="wide" wait="text">我会保持待机并看向琴音，观察非主讲角色的渲染成本。</beat>
<beat speaker="hski" cue="talk" look="camera" position="right" shot="wide" wait="text">四个人同时在场时，继续点击下一句，让监测窗口收集稳定数据。</beat>`;

const $ = id => document.getElementById(id);
const refs = {
    script: $('perfScript'),
    run: $('runPerfBtn'),
    stop: $('stopPerfBtn'),
    reset: $('resetPerfBtn'),
    copy: $('copySnapshotBtn'),
    status: $('perfStatus'),
    summary: $('perfSummary'),
    actors: $('perfActors'),
    recommendations: $('perfRecommendations'),
};

refs.script.value = SAMPLE_SCRIPT;
let app = null;
let appInitError = null;
try {
    app = new BeatPlayerApp(document, { loadSample: false });
    // The monitor uses its own editor id so it can stay independent from the
    // regular Beat page. Reuse that textarea for BeatPlayerApp.compile().
    if (app.elements && !app.elements.script) app.elements.script = refs.script;
} catch (error) {
    appInitError = error;
    console.error('[Performance monitor] Beat stage initialization failed', error);
}
let lastSnapshot = null;
let longTaskMs = 0;
let longTaskCount = 0;

if (typeof PerformanceObserver === 'function') {
    try {
        const observer = new PerformanceObserver(list => {
            list.getEntries().forEach(entry => {
                longTaskMs += Number(entry.duration) || 0;
                longTaskCount += 1;
            });
        });
        observer.observe({ entryTypes: ['longtask'] });
    } catch { /* longtask is optional */ }
}

function setStatus(message, level = '') {
    refs.status.textContent = String(message || '');
    if (level) refs.status.dataset.level = level;
    else delete refs.status.dataset.level;
}

function value(value, digits = 1) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : '—';
}

function stat(label, content) {
    return `<div class="perf-stat"><small>${label}</small><strong>${content}</strong></div>`;
}

function actorCard(actor) {
    const model = actor.model || {};
    const renderer = actor.renderer || {};
    const frame = actor.frame || {};
    const phases = frame.phases || {};
    const activeClass = actor.present && actor.ready ? ' is-active' : '';
    const name = actor.idolId || 'unknown';
    return `<article class="perf-actor${activeClass}">
      <div class="perf-actor-head"><span>${name}${actor.costume ? ` · ${actor.costume}` : ''}</span><small>${actor.present ? '在场' : actor.ready ? '已加载' : '未就绪'}</small></div>
      <div class="perf-actor-grid">
        <div>FPS<span>${value(frame.fps, 1)}</span></div>
        <div>更新 ms<span>${value(frame.updateMs, 2)}</span></div>
        <div>动画 / 物理<span>${value(phases.animationMs, 2)} / ${value(phases.secondaryMotionMs, 2)}</span></div>
        <div>固定步<span>${actor.physics?.fixedSteps || 0}</span></div>
        <div>渲染 ms<span>${value(frame.renderMs, 2)}</span></div>
        <div>Draw Call<span>${renderer.calls || 0}</span></div>
        <div>三角形<span>${renderer.triangles || model.triangles || 0}</span></div>
        <div>网格 / 材质<span>${model.meshes || 0} / ${model.materials || 0}</span></div>
        <div>纹理<span>${renderer.textures || model.textures || 0}</span></div>
        <div>像素比<span>${value(renderer.pixelRatio, 2)}</span></div>
        <div>TAA / 描边<span>${actor.budget?.taa ? '开' : '关'} / ${actor.budget?.outline ? '开' : '关'}</span></div>
      </div>
    </article>`;
}

function renderSnapshot(snapshot) {
    if (!snapshot) return;
    lastSnapshot = snapshot;
    const aggregate = snapshot.aggregate || {};
    refs.summary.innerHTML = [
        stat('最低角色 FPS', value(snapshot.fps, 1)),
        stat('角色合计帧 ms', value(snapshot.frameMs, 2)),
        stat('动画更新 ms', value(aggregate.updateMs, 2)),
        stat('SecondaryMotion ms', value(aggregate.phases?.secondaryMotionMs, 2)),
        stat('固定步合计', aggregate.fixedSteps || 0),
        stat('渲染合计 ms', value(aggregate.renderMs, 2)),
        stat('Draw Call', aggregate.drawCalls || 0),
        stat('三角形', aggregate.triangles || 0),
        stat('在场 / 已加载', `${snapshot.activeActors || 0} / ${snapshot.loadedActors || 0}`),
        stat('长任务', `${longTaskCount} 次 / ${value(longTaskMs, 0)} ms`),
    ].join('');
    refs.actors.innerHTML = snapshot.actors?.length ? snapshot.actors.map(actorCard).join('') : '<p class="perf-empty">还没有角色资源。</p>';
    refs.recommendations.innerHTML = (snapshot.recommendations || ['等待采样。']).map(item => `<li>${item}</li>`).join('');
}

async function run() {
    const script = String(refs.script.value || '').trim();
    if (!script) return setStatus('请先输入 Beat 脚本。', 'error');
    if (!app) return setStatus(`舞台初始化失败：${appInitError?.message || appInitError || '未知错误'}`, 'error');
    refs.run.disabled = true;
    setStatus('正在解析和加载多角色资源……');
    try {
        app.stop();
        app.elements.script.value = script;
        app.compile();
        const ready = await app.preloadPromise;
        if (!ready) throw new Error('角色或场景资源没有完整就绪');
        if (app.elements.auto) app.elements.auto.checked = false;
        // The first two sample beats stage actors in pairs. Start on beat 2 so
        // all four actors are already present when the profiler becomes visible.
        await app.goTo(Math.min(1, app.compiled.beats.length - 1), { autoplay: false });
        setStatus('四人已入场。点击舞台文本框或“下一段”逐句播放，建议保持 5–10 秒后读取指标。');
    } catch (error) {
        console.error('[Performance monitor]', error);
        setStatus(error?.message || String(error), 'error');
    } finally {
        refs.run.disabled = false;
    }
}

refs.run.addEventListener('click', run);
refs.stop.addEventListener('click', () => { app?.stop(); setStatus('已停止采样。'); });
refs.reset.addEventListener('click', () => {
    refs.script.value = SAMPLE_SCRIPT;
    refs.script.dispatchEvent(new Event('input', { bubbles: true }));
    refs.script.focus();
    refs.script.scrollTop = 0;
    setStatus('已载入四人示例。请点击“加载并播放”开始采样。');
});
refs.copy.addEventListener('click', async () => {
    if (!lastSnapshot) return setStatus('还没有可复制的快照。', 'error');
    const text = JSON.stringify(lastSnapshot, null, 2);
    try {
        await navigator.clipboard.writeText(text);
        setStatus('性能快照已复制。');
    } catch {
        setStatus('复制失败，请打开开发者工具查看 lastSnapshot。', 'error');
        console.log('[Performance monitor snapshot]', lastSnapshot);
    }
});

setInterval(() => {
    if (!app) return;
    try { renderSnapshot(app.getPerformanceSnapshot()); } catch (error) { console.warn('[Performance monitor] snapshot failed', error); }
}, 500);


