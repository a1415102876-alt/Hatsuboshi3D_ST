(() => {
  "use strict";

  function create(host, { idolId, assetBase, onRetry } = {}) {
    const root = document.createElement("div");
    root.className = "nia-audition-loading";
    root.dataset.phase = "closing";
    root.innerHTML = `<div class="nia-audition-iris" aria-hidden="true"></div>
      <div class="nia-audition-corners" aria-hidden="true"></div>
      <div class="nia-audition-loading-content" role="status" aria-live="polite">
        <div class="nia-audition-resource-progress" role="status" style="font-size:12px;font-weight:650;color:#24364e;text-align:center;max-width:80vw;overflow-wrap:anywhere;margin-bottom:10px"></div>
        <progress class="nia-audition-resource-bar" max="1" style="width:min(260px,60vw);height:5px;accent-color:#24364e;margin-bottom:18px"></progress>
        <svg class="nia-audition-clock" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" aria-hidden="true">
          <circle cx="50" cy="50" r="41"></circle><path class="minute" d="M50 50V20"></path><path class="hour" d="M50 50V30"></path>
        </svg>
        <p class="nia-audition-loading-label">试镜进行中</p>
        <div class="nia-audition-loading-idol"><img class="idol-open" alt="当前育成偶像的Q版小人" draggable="false"><img class="idol-blink" alt="" aria-hidden="true" draggable="false"></div>
        <button type="button" class="vn-btn nia-audition-loading-retry" hidden>重新载入演出</button>
      </div>`;
    host.append(root);
    const iris = root.querySelector(".nia-audition-iris");
    const content = root.querySelector(".nia-audition-loading-content");
    const retry = root.querySelector("button");
    retry.addEventListener("click", () => onRetry?.());
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const animations = new Set();
    let disposed = false, failed = false, revealing = false;
    const current = () => !disposed && !failed;
    const cancelAnimations = () => { for (const animation of animations) animation.cancel(); animations.clear(); };
    for (const [index, image] of [...root.querySelectorAll("img")].entries()) {
      image.src = new URL(`../mmd-dialogue-stage/ui/loading-sd/img_sd_${idolId}_cmmn-0${index}.png`, assetBase).href;
    }
    // A transparent circular hole keeps the live Beat canvas underneath intact.
    // Animate its size, not its scale, so the surrounding blue shadow stays full size.
    async function animate(element, frames, duration) {
      if (!current()) return false;
      if (!reducedMotion && element.animate) {
        const animation = element.animate(frames, { duration, easing: "cubic-bezier(.42, 0, .58, 1)", fill: "forwards" });
        animations.add(animation);
        try { await animation.finished; } catch { return false; }
        animations.delete(animation);
        if (!current()) return false;
        Object.assign(element.style, frames.at(-1));
        animation.cancel();
      } else Object.assign(element.style, frames.at(-1));
      return current();
    }
    const covered = (async () => {
      if (!await animate(iris, [{ width: "300vmax", height: "300vmax" }, { width: "0px", height: "0px" }], 860)) return false;
      root.dataset.phase = "waiting";
      return true;
    })();
    return {
      covered,
      updateProgress(progress = {}) {
        if (!current()) return;
        const mb = value => (Number(value || 0) / 1048576).toFixed(1);
        root.querySelector(".nia-audition-resource-progress").textContent = progress.phase === "checking" ? "检查资源缓存…"
          : progress.phase === "preparing" ? "正在加载模型、动作与场景…"
          : `下载 ${mb(progress.receivedBytes)} / ${mb(progress.downloadBytes)} MB · 缓存 ${mb(progress.cachedBytes)} MB`;
        const bar = root.querySelector("progress");
        if (progress.phase === "downloading") bar.value = progress.downloadBytes ? Math.min(1, progress.receivedBytes / progress.downloadBytes) : 1;
        else bar.removeAttribute("value");
      },
      async reveal() {
        if (revealing || !await covered || !current()) return false;
        revealing = true;
        root.dataset.phase = "opening";
        if (!await animate(content, [{ opacity: "1" }, { opacity: "0" }], 180)) return false;
        if (!await animate(iris, [{ width: "0px", height: "0px" }, { width: "300vmax", height: "300vmax" }], 860)) return false;
        root.dataset.phase = "complete";
        root.hidden = true;
        return true;
      },
      fail(message) {
        if (disposed || failed) return;
        failed = true;
        cancelAnimations();
        root.hidden = false;
        root.dataset.phase = "error";
        iris.style.width = iris.style.height = "0px";
        content.style.opacity = "1";
        root.querySelector(".nia-audition-loading-label").textContent = message || "演出加载失败，请重新载入。";
        retry.hidden = false;
      },
      dispose() { disposed = true; cancelAnimations(); root.remove(); }
    };
  }

  globalThis.HatsuNiaAuditionLoading = { create };
})();
