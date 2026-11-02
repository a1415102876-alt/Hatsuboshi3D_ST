import { applyAction } from './sandbox-core.js';

const ACTION_LINES = Object.freeze({
  lesson: '琴音把今天的课堂笔记重新整理了一遍，先把能掌握的部分稳稳记下来。',
  training: '琴音在教室里做完一轮基础训练，虽然有些喘，但还是认真确认了自己的进步。',
  commission: '一份新的外部委托送到了手上，琴音一边确认要求，一边开始计算这次机会能带来什么。',
  explore: '琴音和制作人一起整理了接下来想去看的地方，把学园里的小发现记进了备忘录。',
  chat: '琴音把手里的事情暂时放下，认真听制作人说完了今天想聊的内容。',
  rest: '琴音在教室里安静休息了一会儿，紧绷的肩膀终于慢慢放松下来。',
});

function escapeXml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildActionBeat(action = {}, state = {}) {
  const kind = String(action.kind || 'rest');
  const text = ACTION_LINES[kind] || `${String(action.label || '行动')}暂时告一段落。`;
  const id = `sandbox-${kind}-${Number(state.day) || 1}-${Number(state.time?.clockMinutes) || 0}`;
  const background = String(action.background || state.currentBackground || '3d-adv-classroom-00-00-noon').trim() || '3d-adv-classroom-00-00-noon';
  return `<beat id="${id}" speaker="kotone" cue="talk" face="neutral" look="camera" position="center" background="${escapeXml(background)}" shot="medium" wait="text"><display lang="zh">${escapeXml(text)}</display></beat>`;
}

export function runSandboxAction(action = {}, context = {}) {
  const state = context.state;
  const result = applyAction(state, action);
  if (!result.ok) {
    return {
      ...result,
      beatScript: '',
      settlement: null,
      interruption: false,
    };
  }
  return {
    ok: true,
    state: result.state,
    action: result.action,
    entry: result.entry,
    beatScript: buildActionBeat({ ...result.action, background: action.background }, result.state),
    settlement: {
      start: result.entry.start,
      end: result.entry.end,
      duration: result.entry.duration,
      costs: { ...result.entry.costs },
      rewards: { ...result.entry.rewards },
    },
    interruption: false,
  };
}
