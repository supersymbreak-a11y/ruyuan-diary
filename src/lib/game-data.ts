export type TaskScope = "daily" | "weekly";

export function isCustomCover(id: string) {
  return (
    id.startsWith("data:") ||
    id.startsWith("blob:") ||
    id.startsWith("http://") ||
    id.startsWith("https://") ||
    id.startsWith("/covers/") ||
    id.startsWith("covers/")
  );
}

export function coverSrc(id: string) {
  if (!isCustomCover(id)) return "";
  if (id.startsWith("/covers/")) return `${import.meta.env.BASE_URL}${id.slice(1)}`;
  if (id.startsWith("covers/")) return `${import.meta.env.BASE_URL}${id}`;
  return id;
}

const STATIC_AI_BANNER_NAMES = new Set([
  "绣衣天下", "言简理直", "燕金募秀", "王侯秉德", "东阁待贤", "九门磔攘", "云雨滂润", "击金鸣鼓", "却月凌风",
  "壑林邀月", "天封孤狼", "天道不逾", "奉天华盖", "契阔谈宴", "异才奇士", "弓箭江东",
  "弹剑酿花", "弹香展骥", "彀弓衔刃", "形气复生", "形谍成光", "暮燕翻雷", "桓桓先征",
  "欺天罔地", "深藏北斗", "游说贤士", "绮花隐豹", "腾陵张胆", "英徽弥亮", "蛇蟒之蛰",
  "长生之术", "珠渊玉水", "白日昭只", "织囊画诗", "金相玉质", "铁弦千钧", "风兴云蒸", "谨司天英", "动如雷霆",
]);

export function staticAiCoverForPool(name: string) {
  return STATIC_AI_BANNER_NAMES.has(name) ? `/covers/ai/${name}.png` : undefined;
}

// Keep enough pixels for high-density displays. The banner is shown wider
// than 720px in the pool editor and on desktop, so the old 720x220 output
// looked visibly soft after scaling up.
const COVER_W = 1440;
const COVER_H = 440;

export function compressCover(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("请选择图片文件"));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法处理图片"));
        return;
      }
      const targetRatio = COVER_W / COVER_H;
      const srcRatio = img.width / img.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (srcRatio > targetRatio) {
        // Preserve the complete horizontal composition. The card's dark shade
        // can cover the right side, but subjects on the left must not be cropped.
        // Scale by height to fill the banner vertically without distortion;
        // overflow on the right is intentionally hidden by the dark overlay.
        const drawW = COVER_H * srcRatio;
        // Draw the original image from its true left edge without stretching.
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, drawW, COVER_H);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
        return;
      } else {
        sh = img.width / targetRatio;
        sy = Math.max(0, img.height * 0.16);
        if (sy + sh > img.height) sy = Math.max(0, (img.height - sh) / 2);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片无法读取，试试 jpg / png"));
    };
    img.src = url;
  });
}

export const DEFAULT_POOLS = [
  {
    id: "permanent",
    name: "绣衣天下",
    type: "permanent" as const,
    upNames: [] as string[],
    pity: 0,
    upPity: 0,
    guaranteedUp: false,
    cover: "/covers/xiu-yi-tian-xia-v2.png",
    archived: false,
    createdAt: "2024-09-26T00:00:00.000Z",
  },
  {
    id: "anniversary-yan-jin-mu-xiu",
    name: "燕金募秀",
    type: "anniversary" as const,
    upNames: [] as string[],
    pity: 0,
    upPity: 0,
    guaranteedUp: false,
    cover: "/covers/yan-jin-mu-xiu-v2.png",
    archived: false,
    createdAt: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "anniversary-yuan-men-qian-jiang",
    name: "辕门遣将",
    type: "anniversary" as const,
    // The two UP agents are intentionally left empty for users to configure.
    upNames: [] as string[],
    pity: 0,
    upPity: 0,
    guaranteedUp: false,
    cover: "/covers/yuan-men-qian-jiang.png",
    archived: false,
    createdAt: "2026-09-16T00:00:00.000Z",
  },
  {
    id: "limited-yan-jian-li-zhi",
    name: "言简理直",
    type: "limited" as const,
    upNames: [] as string[],
    pity: 0,
    upPity: 0,
    guaranteedUp: false,
    cover: "/covers/yan-jian-li-zhi-v2.png",
    archived: false,
    createdAt: "2026-09-15T00:00:00.000Z",
  },
];

export const SSR_AGENTS = [
  "贾诩",
  "郭解",
  "陆逊",
  "杨修",
  "华佗",
  "郭嘉",
  "吕蒙",
  "王粲",
  "鲁肃",
  "张辽",
  "马超",
  "孙尚香",
  "孙权",
  "周瑜",
  "甘吉",
  "葛洪",
  "令狐茂",
  "荀彧",
  "庞统",
  "庞德",
  "郭女王",
  "徐庶",
  "蔡琰",
  "张鲁",
  "张修",
  "张角",
  "张仲景",
  "张郃",
  "刘豹",
  "张飞",
  "张闿",
  "张邈",
  "戏学",
  "黄盖",
  "太史慈",
  "甘宁",
  "甄宓",
  "虞翻",
  "张燕",
  "夏侯惇",
  "荀攸",
  "诸葛瑾",
  "诸葛诞",
  "孔融",
  "黄月英",
  "凌统",
  "安期",
  "董奉",
  "曹植",
  "祢衡",
  "蒯越",
  "诸葛亮",
  "司马徽",
  "满宠",
  "刘繇",
  "张绣",
  "朱然",
  "士燮",
  "程昱",
  "董白",
  "张昭",
  "马腾",
  "庞羲",
  "钟繇",
  "程普",
  "夏侯渊",
  "刘璋",
  "法正",
  "简雍",
  "吕布",
  "曹丕",
];

/**
 * A deterministic portrait placeholder for every named 密探.  Keeping this
 * as an image URL means the card and the submit form share the same
 * name↔portrait binding, while still working for custom/up names that do not
 * have a bundled artwork file yet.
 */
export function portraitSrc(name: string) {
  const safeName = name.trim() || "未知密探";
    const bundledPortraits: Record<string, string> = {
      "周瑜": "/portraits/zhou-yu.png",
      "孙尚香": "/portraits/sun-shangxiang.png",
      "张飞": "/portraits/zhang-fei.png",
      "董奉": "/portraits/dong-feng.png",
      "凌统": "/portraits/ling-tong.png",
      "黄月英": "/portraits/huang-yueying.png",
      "徐庶": "/portraits/xu-shu.png",
      "荀彧": "/portraits/xun-yu.png",
      "张邈": "/portraits/zhang-miao.png",
      "荀攸": "/portraits/xun-you.png",
      "诸葛亮": "/portraits/zhuge-liang.png",
      "诸葛瑾": "/portraits/zhuge-jin.png",
      "虞翻": "/portraits/yu-fan.png",
      "马腾": "/portraits/ma-teng.png",
      "刘豹": "/portraits/liu-bao.png",
      "士燮": "/portraits/shi-xie.png",
      "甄宓": "/portraits/zhen-mi.png",
      "张燕": "/portraits/zhang-yan.png",
      "安期": "/portraits/an-qi.png",
      "吕布": "/portraits/lv-bu.png",
      "蔡琰": "/portraits/cai-yan.png",
      "钟繇": "/portraits/zhong-you.png",
      "张绣": "/portraits/zhang-xiu.png",
      "夏侯惇": "/portraits/xiahou-dun.png",
      "黄盖": "/portraits/huang-gai.png",
      "孔融": "/portraits/kong-rong.png",
      "刘璋": "/portraits/liu-zhang.png",
      "法正": "/portraits/fa-zheng-v5.png",
      "简雍": "/portraits/jian-yong-v3.png",
      "庞羲": "/portraits/pang-xi.png",
      "祢衡": "/portraits/ni-heng.png",
      "满宠": "/portraits/man-chong.png",
      "夏侯渊": "/portraits/xiahou-yuan.png",
      "张昭": "/portraits/zhang-zhao.png",
      "程普": "/portraits/cheng-pu.png",
      "孙权": "/portraits/sun-quan.png",
      "张角": "/portraits/zhang-jiao.png",
      "马超": "/portraits/ma-chao.png",
      "蒯越": "/portraits/kuai-yue.png",
      "张辽": "/portraits/zhang-liao.png",
      "曹丕": "/portraits/cao-pi.png",
      "张郃": "/portraits/zhang-he.png",
      "令狐茂": "/portraits/linghu-mao.png",
      "诸葛诞": "/portraits/zhuge-dan.png",
      "贾诩": "/portraits/jia-xu.png",
      "鲁肃": "/portraits/lu-su.png",
      "司马徽": "/portraits/sima-hui.png",
      "董白": "/portraits/dong-bai.png",
      "戏学": "/portraits/xi-xue.png",
      "庞统": "/portraits/pang-tong.png",
      "程昱": "/portraits/cheng-yu.png",
      "葛洪": "/portraits/ge-hong.png",
      "张仲景": "/portraits/zhang-zhongjing.png",
      "张鲁": "/portraits/zhang-lu.png",
      "陆逊": "/portraits/lu-xun.png",
      "郭嘉": "/portraits/guo-jia.png",
      "王粲": "/portraits/wang-can.png",
      "华佗": "/portraits/hua-tuo.png",
      "曹植": "/portraits/cao-zhi.png",
      "杨修": "/portraits/yang-xiu.png",
      "郭解": "/portraits/guo-jie.png",
      "吕蒙": "/portraits/lv-meng.png",
      "甘吉": "/portraits/gan-ji.png",
      // Keep the alternate spelling working for older/custom pool data.
      "干吉": "/portraits/gan-ji.png",
      "甘宁": "/portraits/gan-ning.png",
      "张修": "/portraits/zhang-xiu-2.png",
      "刘繇": "/portraits/liu-you.png",
      "朱然": "/portraits/zhu-ran.png",
      "张闿": "/portraits/zhang-kai.png",
      "太史慈": "/portraits/taishi-ci.png",
      "郭女王": "/portraits/guo-nvwang.png",
      "庞德": "/portraits/pang-de.png",
    };
  if (bundledPortraits[safeName]) {
    // Public assets live under the Vite base path on GitHub Pages
    // (`/ruyuan-diary/`), while local development uses `/`.
    return `${import.meta.env.BASE_URL}${bundledPortraits[safeName].slice(1)}`;
  }
  const hue = Array.from(safeName).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const initial = safeName.slice(0, 1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 38% 30%)"/><stop offset="1" stop-color="hsl(${(hue + 42) % 360} 48% 58%)"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><circle cx="150" cy="142" r="72" fill="hsl(${hue} 28% 78% / .75)"/><path d="M56 382c10-95 57-143 94-143s84 48 94 143" fill="hsl(${hue} 24% 88% / .86)"/><text x="150" y="166" text-anchor="middle" font-size="72" font-family="serif" fill="hsl(${hue} 42% 24%)">${initial}</text><path d="M24 24h252v352H24z" fill="none" stroke="#d49a22" stroke-width="8"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const SR_AGENTS = [
  "陈登",
  "阿蝉",
  "颜良",
  "史子眇",
  "文丑",
  "许攸",
  "严白虎",
  "许曼",
  "小乔",
];

export type DailyTask = {
  id: string;
  group: string;
  label: string;
  max: number;
  scope: TaskScope;
  hint?: string;
  rewardKey?: ResourceKey;
  rewardAmount?: number;
};

export const TASKS: DailyTask[] = [
  { id: "daily-zhuyu", group: "每日打卡", label: "每日茱萸", max: 1, scope: "daily", hint: "+50 白金币", rewardKey: "whiteGold", rewardAmount: 50 },
  { id: "month-card", group: "每日打卡", label: "月卡", max: 1, scope: "daily", hint: "+90 白金币", rewardKey: "whiteGold", rewardAmount: 90 },
  { id: "agent-training", group: "每日打卡", label: "密探特训", max: 1, scope: "daily", hint: "+50 白金币", rewardKey: "whiteGold", rewardAmount: 50 },
  { id: "fuchuan-month", group: "每日打卡", label: "符传月卡", max: 1, scope: "daily", hint: "填写符传数量", rewardKey: "fuchuan" },
];

export const RESOURCE_META = [
  {
    key: "whiteGold" as const,
    label: "白金币",
    head: "bg-mat-gold text-card",
    body: "bg-mat-gold-bg",
    num: "text-mat-gold",
  },
  {
    key: "tianji" as const,
    label: "天机符传",
    head: "bg-mat-blue text-card",
    body: "bg-mat-blue-bg",
    num: "text-mat-blue",
  },
  {
    key: "fuchuan" as const,
    label: "符传",
    head: "bg-mat-green text-card",
    body: "bg-mat-green-bg",
    num: "text-mat-green",
  },
  {
    key: "zhuyu" as const,
    label: "茱萸",
    head: "bg-mat-rose text-card",
    body: "bg-mat-rose-bg",
    num: "text-mat-rose",
  },
];

export type ResourceKey = (typeof RESOURCE_META)[number]["key"];

export const RESOURCE_KEYS = RESOURCE_META.map((m) => m.key);

export function isResourceKey(v: string): v is ResourceKey {
  return RESOURCE_KEYS.includes(v as ResourceKey);
}

export type LedgerSide = "income" | "expense";

export const LEDGER_REASONS: {
  id: string;
  side: LedgerSide;
  keys?: ResourceKey[];
}[] = [
  { id: "派遣", side: "income", keys: ["whiteGold", "zhuyu"] },
  { id: "每日茱萸", side: "income", keys: ["whiteGold"] },
  { id: "月卡", side: "income", keys: ["whiteGold"] },
  { id: "密探特训", side: "income", keys: ["whiteGold", "zhuyu", "fuchuan"] },
  { id: "茱萸转化", side: "income", keys: ["whiteGold"] },
  { id: "成就", side: "income", keys: ["whiteGold", "fuchuan"] },
  { id: "传闻/信赖值", side: "income", keys: ["whiteGold"] },
  { id: "地宫", side: "income", keys: ["whiteGold", "tianji"] },
  { id: "活动", side: "income", keys: ["whiteGold", "tianji", "fuchuan", "zhuyu"] },
  { id: "补偿", side: "income", keys: ["whiteGold", "tianji", "fuchuan", "zhuyu"] },
  { id: "兑换码", side: "income", keys: ["whiteGold", "tianji", "fuchuan"] },
  { id: "爵位奖励", side: "income", keys: ["whiteGold"] },
  { id: "主线", side: "income", keys: ["whiteGold", "fuchuan"] },
  { id: "爵位助力", side: "income", keys: ["whiteGold", "tianji", "fuchuan"] },
  { id: "主线助力", side: "income", keys: ["whiteGold", "tianji", "fuchuan"] },
  { id: "白金币购买", side: "income", keys: ["tianji", "fuchuan", "zhuyu"] },
  { id: "历险", side: "income", keys: ["tianji"] },
  { id: "礼包充值", side: "income", keys: ["tianji"] },
  { id: "月卡商店符传", side: "income", keys: ["fuchuan"] },
  { id: "招募商店", side: "income", keys: ["fuchuan"] },
  { id: "充值礼包", side: "income", keys: ["fuchuan"] },
  { id: "累充", side: "income", keys: ["fuchuan"] },
  { id: "充值", side: "income", keys: ["whiteGold", "tianji", "fuchuan"] },
  { id: "成长基金", side: "income", keys: ["whiteGold"] },
  { id: "sp碎片分解", side: "income", keys: ["whiteGold"] },
  { id: "天机符传", side: "expense", keys: ["whiteGold"] },
  { id: "符传", side: "expense", keys: ["whiteGold"] },
  { id: "月卡商店符传", side: "expense", keys: ["whiteGold"] },
  { id: "活动体力", side: "expense", keys: ["whiteGold"] },
  { id: "鸟食", side: "expense", keys: ["whiteGold"] },
  { id: "历练", side: "expense", keys: ["whiteGold"] },
  { id: "养成材料", side: "expense", keys: ["whiteGold"] },
  { id: "家具盲盒", side: "expense", keys: ["whiteGold"] },
  { id: "体力", side: "expense", keys: ["whiteGold"] },
  { id: "sp密探", side: "expense", keys: ["whiteGold"] },
  { id: "留音匣", side: "expense", keys: ["whiteGold"] },
  { id: "活动盲盒", side: "expense", keys: ["whiteGold"] },
  { id: "转盘骰子", side: "expense", keys: ["whiteGold"] },
  { id: "地宫次数", side: "expense", keys: ["whiteGold"] },
  { id: "密探招募", side: "expense", keys: ["tianji", "fuchuan"] },
  { id: "转化白金币", side: "expense", keys: ["zhuyu"] },
  { id: "其他", side: "income" },
  { id: "其他", side: "expense" },
];

export function reasonsFor(key: ResourceKey, side: LedgerSide) {
  return LEDGER_REASONS.filter(
    (r) => r.side === side && (!r.keys || r.keys.includes(key)),
  );
}

const STATS_COLOR_DIVISIONS: Partial<Record<ResourceKey, Partial<Record<LedgerSide, number>>>> = {
  whiteGold: { income: 19, expense: 15 },
  tianji: { income: 11 },
  fuchuan: { income: 15 },
  zhuyu: { income: 6 },
};

const reasonColorAtHue = (hue: number) => {
  const normalizedHue = ((hue % 360) + 360) % 360;
  return `oklch(78% 0.15 ${normalizedHue})`;
};

function reasonColorAtIndex(index: number, key: ResourceKey, side: LedgerSide) {
  const divisions = STATS_COLOR_DIVISIONS[key]?.[side] ?? reasonsFor(key, side).length;
  // Red is the first sector's midpoint; each rank advances counterclockwise by one sector.
  return reasonColorAtHue((index * 360) / Math.max(1, divisions));
}

// Assign the rank-ordered source a sector-midpoint color from its resource's hue wheel.
export function reasonColor(reason: string, index?: number, key?: ResourceKey, side?: LedgerSide) {
  if (index !== undefined && key && side) return reasonColorAtIndex(index, key, side);

  // Stable fallback for callers that don't have a visible-list position.
  let hash = 0;
  for (const char of reason) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return reasonColorAtHue(hash * 137.507764);
}
