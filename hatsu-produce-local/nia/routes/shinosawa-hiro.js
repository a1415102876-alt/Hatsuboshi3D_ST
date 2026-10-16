(function registerShinosawaHiroNiaRoute(root) {
  "use strict";

  const routes = root.HatsuNiaRoutes;
  if (!routes || routes.getById("shinosawa-hiro")) return;

  routes.register({
    schemaVersion: 1,
    routeId: "shinosawa-hiro",
    idolName: "筱泽广",
    status: "available",
    assets: {
      avatar: "./assets/avatars/shinosawa-hiro.png",
      finaleVideo: "assets/campusmode/Shinosawa-Hiro-Campusmode.mp4"
    },
    dossier: {
      schoolYear: "1年2组",
      report: [
        "14岁大学毕业的天才少女。",
        "详细的履历记于别处。",
        "入学测试成绩为、笔试满分、实操0分。",
        "学园长亲自面试后给出优的评价。",
        "放弃了备受期待的将来、选择成为偶像的理由目前还不得而知。"
      ]
    },
    draftDefaults: {
      goal: "让现在支持广的粉丝更加喜欢她，并让新观众愿意见证她挑战几乎不可能的胜利。",
      image: "美丽神秘、头脑出众，却偏偏选择最不擅长的偶像道路；广会因困难而由衷喜悦，也会认真珍惜每一位支持自己的粉丝。",
      approach: "通过直播与初星圈分享广在笨拙挑战中的细小进步，让神秘感与真实努力共同成为粉丝持续关注的理由。"
    },
    inheritedAffinity: {
      value: 100,
      max: 100,
      tag: "AFF_HIRO_100",
      relationshipSummary: "制作人与广已经共同完成 First Live，并坦白所谓试用期从一开始就是正式合同；两人是会一起享受困难、事与愿违和偶像活动的命运共同体。",
      promises: "制作人尊重广白手起家、不公开天才履历的选择；广接受今后继续由制作人指导，并约定从今往后每天都要在一起。",
      memories: "制作人陪广从只能进行复健式训练走到第一次登台，见证她发现自己喜欢偶像、赢下不被看好的暖场演出，也记得她想要变得可爱的朴素愿望。"
    },
    opening: {
      episode: 11,
      title: "N.I.A · 荆棘密布的第二步",
      anchors: [
        "制作人邀请广参加 NEXT IDOL AUDITION，说明在 FINALE 获胜能让她作为实力派新人扬名。",
        "广确认自己胜算极低、甚至可能尚不具备选拔资格，却因这条路困难得像地狱而兴奋起来。",
        "制作人说明 N.I.A 是偶像与制作人的合作赛，承诺成为广最坚强的后盾；两人决定共同挑战几乎不可能的胜利。",
        "广希望现在支持自己的少数粉丝能更加喜欢她，并让他们庆幸成为她的粉丝。",
        "两人决定成立粉丝俱乐部、进行宣传并从第一轮选拔开始积累胜利；结尾进入第一轮企划准备，不推进日程或数值。"
      ]
    },
    rounds: [
      { round: 1, stageName: "第一轮试镜", isFinale: false, opponent: null },
      {
        round: 2,
        stageName: "第二轮试镜 · QUARTET",
        isFinale: false,
        opponents: [
          { id: "hanami-ume", name: "花海佑芽", avatar: "./assets/avatars/hanami-ume.png" }
        ]
      },
      {
        round: 3,
        stageName: "FINALE",
        isFinale: true,
        opponents: [
          { id: "hanami-ume", name: "花海佑芽", avatar: "./assets/avatars/hanami-ume.png" },
          { id: "kuramoto-china", name: "仓本千奈", avatar: "./assets/avatars/kuramoto-china.png" }
        ]
      }
    ],
    episodes: [
      {
        eventId: "nia-hiro-fans-5000", episode: 12,
        trigger: { type: "fans", threshold: 5000 },
        title: "N.I.A · 被神化的偶像", subtitle: "广的 N.I.A 第 12 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "广发现自己的 N.I.A 排名异常飙升，要求制作人解释发生了什么。",
          "制作人成立粉丝俱乐部并发布突出广美丽、神秘气质的 MV；MV 播放量和俱乐部人数远超预期。",
          "粉丝迅速创作并传播插画、音乐、漫画和小说；制作人尝试引导后，广仍在粉丝群体中被神化为女神。",
          "广虽然困扰于过度狂热，却真心为粉丝增加而开心，并再次确认自己喜欢这些奇怪而热情的支持者。"
        ]
      },
      {
        eventId: "nia-hiro-fans-10000", episode: 13,
        trigger: { type: "fans", threshold: 10000 },
        title: "N.I.A · 朋友也是对手", subtitle: "广的 N.I.A 第 13 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "千奈告诉广自己加入了筱泽广粉丝俱乐部，两人因朋友成为粉丝而彼此害羞。",
          "广得知粉丝内部形成派系并擅自制定演唱会规矩，立即联系制作人处理周边和入场问题。",
          "千奈确认在初星学园第一次遇到珍贵朋友；广也确认佑芽与千奈是自己最初的朋友。",
          "千奈主动请求广把自己当作对手，广接受并提出三人一起追上、超越佑芽。",
          "广以 FINALE 优胜为目标；千奈宣言要把广、佑芽和其他 N.I.A 偶像都甩在身后，朋友之间正式建立竞争关系。"
        ]
      },
      {
        eventId: "nia-hiro-round2-audition-eve", episode: 14,
        trigger: { type: "round_day_complete", round: 2, day: 5 },
        title: "N.I.A · 最好的朋友与对手", subtitle: "广的 N.I.A 第 14 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "广在佑芽赢下选拔后前来刺探敌情，并告诉佑芽自己与千奈都已追上排行榜、目标是在 FINALE 夺冠。",
          "佑芽因最初补习组的朋友终于追上而由衷兴奋，正式把广视作自己的对手。",
          "广故意描述战胜佑芽后会多么开心，以此刺激佑芽绝不能放水。",
          "两人确认彼此既是最好的朋友也是对手；广相信在 N.I.A 合作赛中与制作人并肩就有机会获胜。"
        ]
      },
      {
        eventId: "nia-hiro-round2-quartet-opening", episode: 15,
        trigger: { type: "audition_eve", round: 2 },
        title: "N.I.A · QUARTET 全力对决", subtitle: "广的 N.I.A 第 15 话剧情",
        background: "./assets/scenes/Producer_Office.png",
        promptAnchors: [
          "广与制作人确认本轮是 QUARTET；广已经竭力刺激佑芽，因为不愿对朋友有丝毫放水。",
          "广希望与全力以赴的佑芽堂堂正正较量，并主动选择紧张、困难的局面。",
          "制作人认真要求既然是广亲手把对手逼到这个地步，就必须赢下比赛。",
          "广感受到制作人和现场粉丝的支持，承认原本不适合当偶像的自己如今也可能获胜，并决定从大家那里汲取力量击败佑芽。"
        ]
      },
      {
        eventId: "nia-hiro-round2-quartet-victory", episode: 16,
        trigger: { type: "audition_complete", round: 2 },
        title: "N.I.A · 第一次真正的对手", subtitle: "广的 N.I.A 第 16 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "广击败佑芽后体力耗尽，由佑芽背到后台；她确认自己只是超越极限但没有生命危险。",
          "佑芽坦率认输并承认广很厉害，同时约定下一次一定会赢回来。",
          "广因佑芽与千奈是自己最初的朋友、佑芽又是自己第一次在舞台上见到的真正偶像而感动落泪。",
          "广正式称佑芽为自己第一次真正的对手；两人确认比赛才刚开始，广兑现此前约定，在胜利后满足地长叹。"
        ]
      },
      {
        eventId: "nia-hiro-round3-first-business", episode: 17,
        trigger: { type: "first_business_complete", round: 3 },
        title: "N.I.A · 补习组三人的约定", subtitle: "广的 N.I.A 第 17 话剧情",
        background: "./assets/scenes/Kuramoto_Bedroom.png",
        promptAnchors: [
          "广与佑芽观看千奈出演的节目并交换千奈周边，广以老粉身份承诺善待新粉丝。",
          "佑芽祝贺千奈进入 N.I.A 排名前十；广和佑芽肯定千奈的可爱与偶像实力，让她更有自信。",
          "三人回顾从吊车尾补习组一路训练、学习和竞争到可能共同登上 FINALE 的经历。",
          "广说明成为偶像后的叹息有时代表获得成就后的满足；佑芽和千奈早已理解她。",
          "广、佑芽、千奈确认彼此是朋友也是对手，并约定在 FINALE 一决胜负。"
        ]
      },
      {
        eventId: "nia-hiro-round3-finale-eve", episode: 18,
        trigger: { type: "schedule_complete", round: 3 },
        title: "N.I.A · FINALE 出发之前", subtitle: "广的 N.I.A 第 18 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "制作人告诉广即将参加 FINALE，广确认千奈、佑芽和自己终于要共同争夺冠军。",
          "两人回顾曾经的吊车尾补习组席卷 N.I.A，制作人坦白直到广战胜佑芽才真正预料到这一刻。",
          "制作人想在决战前尽情夸奖广，广拒绝提前接受夸奖，要求等自己获胜回来后再说。",
          "广带着要赢下比赛并回来接受夸奖的约定出发，不提前演出或结算 FINALE。"
        ]
      },
      {
        eventId: "nia-hiro-finale-victory", episode: 19,
        trigger: { type: "finale_complete" },
        title: "N.I.A · 最棒的朋友与胜利", subtitle: "广的 N.I.A 第 19 话剧情",
        background: "./assets/scenes/NIA_Stage_Backstage.png",
        promptAnchors: [
          "广赢得 FINALE 后向制作人报告胜利并主动索要夸奖；制作人因全程见证她的努力而一时无法组织语言。",
          "广确认制作人记得自己的心情就已经足够，并请求制作人去见来到现场的父母。",
          "广力竭睡着后，佑芽与千奈前来祝贺，同时坦率表达不甘并宣言下次不会输。",
          "广其实中途醒来并听见两人的话，确认佑芽和千奈是自己第一次交到、也是最棒的朋友与对手。"
        ]
      },
      {
        eventId: "nia-hiro-finale-epilogue", episode: 20,
        trigger: { type: "finale_complete" },
        title: "N.I.A · 一起做顶级偶像的梦", subtitle: "广的 N.I.A 第 20 话剧情",
        background: "./assets/scenes/Hiro_NIA_Episode20_Sunset.png",
        promptAnchors: [
          "制作人与广的父亲单独谈话后疲惫归来；广从母亲处得知制作人在两人相遇不久后就曾登门确认父母对她未来的想法。",
          "制作人从未用不存在的偶像天赋欺骗广的父亲，却始终尊重广把享受困难、战胜朋友放在才能与效率之前。",
          "广要求制作人改用更亲近的称呼，并察觉他有重要而沉重的请求。",
          "制作人承认广依然不适合当偶像，却仍想把她培育成顶级偶像；偶像既然是两人共同的兴趣，他们也可以共同做梦。",
          "广接受这个贪心、任性又强人所难的梦想；她约定若有一天成为学园最棒的偶像，就会努力大声说出目前还无法表达的心意。"
        ]
      }
    ],
    promptProvider: "route-anchors"
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
