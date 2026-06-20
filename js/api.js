// ===== Mock API 层 =====
// 模拟后端接口，所有方法返回 Promise
// 后续替换此模块即可对接真实后端

import { getImportedNovels, getPublishedImportedNovels, getImportedChapters } from './store.js';

let novelsData = null;
let chaptersData = null;
let communityNovels = null;

// ===== 内存缓存 =====
// 章节缓存：key = `${novelId}_${chapterNum}`，避免重复读取 IndexedDB/网络
const chapterCache = new Map();
const CACHE_MAX = 50; // 最多缓存 50 章
const chapterCacheKeys = []; // LRU 淘汰队列

function cacheChapter(key, chapter) {
  if (chapterCacheKeys.length >= CACHE_MAX) {
    const oldest = chapterCacheKeys.shift();
    chapterCache.delete(oldest);
  }
  chapterCache.set(key, chapter);
  chapterCacheKeys.push(key);
}

function getCachedChapter(key) {
  return chapterCache.get(key) || null;
}

// 小说详情缓存
const novelDetailCache = new Map();

/**
 * 加载本地数据 + 社区小说
 */
async function loadData() {
  if (!novelsData) {
    const [novelsRes, chaptersRes, communityRes] = await Promise.all([
      fetch('data/novels.json').then(r => r.json()).catch(() => []),
      fetch('data/chapters.json').then(r => r.json()).catch(() => ({})),
      fetch('community/index.json').then(r => r.json()).catch(() => []),
    ]);
    novelsData = novelsRes;
    chaptersData = chaptersRes;
    communityNovels = communityRes;
  }
}

/**
 * 模拟网络延迟（已优化为 0，真实网络环境下会被实际请求耗时取代）
 */
function delay(ms) {
  // 移除人工延迟：本地数据读取是即时的，章节内容直接返回
  // 仅在非生产调试时可通过 URL 参数 ?debug_delay=200 启用
  if (typeof window !== 'undefined' && window.location) {
    const p = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const debugMs = parseInt(p.get('debug_delay'));
    if (debugMs > 0) ms = debugMs;
    else ms = 0;
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 合并内置小说和导入的小说
 */
function mergeNovels(builtIn) {
  // 本地导入的已发布小说
  const imported = getPublishedImportedNovels().map(n => ({
    ...n,
    isImported: true,
  }));
  // 社区小说（从 GitHub 仓库加载）
  const community = (communityNovels || []).map(n => ({
    ...n,
    id: n.id || ('community_' + n.title),
    cover: n.cover || '',
    isCommunity: true,
    source: 'community',
  }));
  // 社区小说优先，然后本地导入，然后内置
  return [...community, ...imported, ...builtIn];
}

/**
 * 获取小说列表
 */
export async function fetchNovels(category = 'all', page = 1, pageSize = 20) {
  await loadData();
  await delay(200);

  let list = mergeNovels(novelsData);

  if (category && category !== 'all') {
    list = list.filter(n => n.category === category);
  }

  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 搜索小说
 */
export async function searchNovels(query, page = 1, pageSize = 20) {
  await loadData();
  await delay(300);

  if (!query || !query.trim()) {
    return { items: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const q = query.trim().toLowerCase();
  const allList = mergeNovels(novelsData);
  const list = allList.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.author.toLowerCase().includes(q)
  );

  const total = list.length;
  const items = list.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取小说详情
 */
export async function fetchNovelDetail(id) {
  // 命中缓存 → 即时返回（同一小说详情在阅读期间不变）
  if (novelDetailCache.has(id)) return novelDetailCache.get(id);

  let result;

  // 先检查是否是社区小说
  if (id.startsWith('community_')) {
    await loadData();
    const communityNovel = (communityNovels || []).find(n => (n.id || ('community_' + n.title)) === id);
    if (!communityNovel) throw new Error('小说不存在');

    // 动态生成章节目录（不下载章节文件，秒开）
    const total = communityNovel.totalChapters || 0;
    const chapterList = [];
    for (let i = 1; i <= total; i++) {
      chapterList.push({
        novelId: id,
        chapterNum: i,
        title: `第${i}章`,
        wordCount: 0,
      });
    }

    result = {
      ...communityNovel,
      id,
      totalChapters: total,
      chapterList,
      isCommunity: true,
    };
  } else if (id.startsWith('import_')) {
    // 导入的小说（包括已下架的）
    const imported = getImportedNovels().find(n => n.id === id);
    if (!imported) throw new Error('小说不存在');
    const chapters = await getImportedChapters(id);
    const isUnpublished = imported.status === 'unpublished';
    const chapterList = chapters.map((c, i) => ({
      novelId: id,
      chapterNum: c.chapterNum || i + 1,
      title: c.title || `第${i + 1}章`,
      wordCount: c.content ? c.content.replace(/<[^>]+>/g, '').length : 0,
    }));
    result = {
      ...imported,
      totalChapters: chapterList.length,
      chapterList,
      isImported: true,
      isUnpublished,
    };
  } else {
    await loadData();

    const novel = novelsData.find(n => n.id === id);
    if (!novel) throw new Error('小说不存在');

    const chapters = chaptersData[id] || [];

    const fullChapterList = [];
    for (let i = 1; i <= novel.totalChapters; i++) {
      const existing = chapters.find(c => c.chapterNum === i);
      fullChapterList.push({
        novelId: id,
        chapterNum: i,
        title: existing
          ? existing.title
          : `第${i}章 ${generateChapterTitle(novel.category, i)}`,
        wordCount: existing ? existing.wordCount : Math.floor(2000 + Math.random() * 3000),
      });
    }

    result = { ...novel, chapterList: fullChapterList, isImported: false };
  }

  novelDetailCache.set(id, result);
  return result;
}

/**
 * 获取章节内容
 */
export async function fetchChapter(novelId, chapterNum, options = {}) {
  const cacheKey = `${novelId}_${chapterNum}`;

  // 命中内存缓存 → 即时返回
  const cached = options.skipCache ? null : getCachedChapter(cacheKey);
  if (cached) return cached;

  // ===== 社区小说章节 =====
  if (novelId.startsWith('community_')) {
    await delay(0);
    await loadData();
    const communityNovel = (communityNovels || []).find(n => (n.id || ('community_' + n.title)) === novelId);
    if (!communityNovel) throw new Error('小说不存在');

    // 计算章节所属分片
    const chunkStart = Math.floor((chapterNum - 1) / 100) * 100 + 1;
    const chunkEnd = Math.min(chunkStart + 99, communityNovel.totalChapters || 9999);
    const chunkFile = `community/${novelId}_${chunkStart}_${chunkEnd}.json`;

    try {
      const resp = await fetch(chunkFile);
      if (resp.ok) {
        const chapters = await resp.json();
        const chapter = chapters.find(c => (c.chapterNum || 0) === chapterNum);
        if (chapter) {
          const result = {
            novelId,
            chapterNum,
            title: chapter.title || `第${chapterNum}章`,
            content: chapter.content || '<p>暂无内容</p>',
            wordCount: chapter.content ? chapter.content.replace(/<[^>]+>/g, '').length : 0,
            novelTitle: communityNovel.title,
            totalChapters: communityNovel.totalChapters || chapters.length,
          };
          cacheChapter(cacheKey, result);
          // 顺便缓存同分片内的其他章节
          for (const ch of chapters) {
            const k = `${novelId}_${ch.chapterNum || 0}`;
            if (k !== cacheKey && !chapterCache.has(k)) {
              cacheChapter(k, {
                novelId,
                chapterNum: ch.chapterNum || 0,
                title: ch.title || `第${ch.chapterNum || 0}章`,
                content: ch.content || '<p>暂无内容</p>',
                wordCount: ch.content ? ch.content.replace(/<[^>]+>/g, '').length : 0,
                novelTitle: communityNovel.title,
                totalChapters: communityNovel.totalChapters || chapters.length,
              });
            }
          }
          return result;
        }
      }
    } catch { /* ignore */ }
    throw new Error('章节不存在');
  }

  // ===== 导入的小说章节 =====
  if (novelId.startsWith('import_')) {
    await delay(0);
    const imported = getImportedNovels().find(n => n.id === novelId);
    if (!imported) throw new Error('小说不存在');
    const chapters = await getImportedChapters(novelId);
    const idx = chapters.findIndex(c => (c.chapterNum || 0) === chapterNum);
    if (idx < 0) throw new Error('章节不存在');
    const chapter = chapters[idx];
    const result = {
      novelId,
      chapterNum,
      title: chapter.title || `第${chapterNum}章`,
      content: chapter.content || '<p>暂无内容</p>',
      wordCount: chapter.content ? chapter.content.replace(/<[^>]+>/g, '').length : 0,
      novelTitle: imported.title,
      totalChapters: chapters.length,
      isUnpublished: imported.status === 'unpublished',
    };
    cacheChapter(cacheKey, result);
    return result;
  }

  // ===== 内置小说章节 =====
  await loadData();

  const novel = novelsData.find(n => n.id === novelId);
  if (!novel) throw new Error('小说不存在');

  const novelChapters = chaptersData[novelId] || [];
  const chapter = novelChapters.find(c => c.chapterNum === chapterNum);

  let result;
  if (chapter) {
    result = { ...chapter, novelTitle: novel.title, totalChapters: novel.totalChapters };
  } else {
    result = {
      novelId,
      chapterNum,
      title: `第${chapterNum}章 ${generateChapterTitle(novel.category, chapterNum)}`,
      content: generateChapterContent(novel.title, chapterNum),
      wordCount: Math.floor(2000 + Math.random() * 3000),
      novelTitle: novel.title,
      totalChapters: novel.totalChapters,
    };
  }
  cacheChapter(cacheKey, result);
  return result;
}

/**
 * 预加载章节到缓存（后台静默执行，不阻塞当前页面）
 * 在阅读器中当前章节渲染完成后调用，预加载相邻章节
 */
export async function prefetchChapters(novelId, chapterNums) {
  if (!Array.isArray(chapterNums)) chapterNums = [chapterNums];
  // 并行预加载，但不等待结果
  for (const n of chapterNums) {
    const cacheKey = `${novelId}_${n}`;
    if (!chapterCache.has(cacheKey)) {
      // fire-and-forget — 不阻塞
      fetchChapter(novelId, n).catch(() => {});
    }
  }
}

/**
 * 清除小说详情缓存（离开阅读器时调用）
 */
export function clearNovelCache(novelId) {
  novelDetailCache.delete(novelId);
}

/**
 * 获取热门小说（推荐）
 */
export async function fetchHotNovels(limit = 6) {
  await loadData();
  await delay(200);

  // 内置小说按总字数排序
  const sorted = [...novelsData].sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
  // 导入的小说追加在前面
  const imported = getPublishedImportedNovels().slice(0, 3).map(n => ({
    ...n,
    isImported: true,
  }));
  const all = [...imported, ...sorted];
  return all.slice(0, limit);
}

// ===== 辅助函数 =====

function generateChapterTitle(category, num) {
  const titles = {
    fantasy: ['觉醒', '试炼', '突破', '秘境', '传承', '决战', '天劫', '涅槃', '封神', '问道'],
    urban: ['归来', '重逢', '暗流', '布局', '反击', '崛起', '风云', '登顶', '真相', '盛世'],
    scifi: ['信号', '探索', '发现', '危机', '抉择', '突围', '真相', '新世界', '对决', '未来'],
    history: ['赴任', '暗斗', '布局', '惊变', '周旋', '破局', '崛起', '风云', '功成', '归隐'],
  };
  const pool = titles[category] || titles.fantasy;
  return pool[(num - 1) % pool.length];
}

function generateChapterContent(title, num) {
  const paragraphs = [
    `<p>第${num}章的内容正在徐徐展开……</p>`,
    `<p>这是一个关于《${title}》的精彩章节。故事进行到这里，情节愈发扣人心弦。</p>`,
    `<p>主角面临着前所未有的挑战与机遇。每一次选择都可能改变命运的轨迹，而这一次，他将做出怎样的决定？</p>`,
    `<p>周围的形势变得越来越复杂。昔日的朋友可能变成敌人，曾经的对手也可能成为盟友。在这个波诡云谲的世界里，唯有实力才是永恒的真理。</p>`,
    `<p>时间一分一秒地过去，紧张的气氛弥漫在空气中。所有人都屏住了呼吸，等待着即将发生的一切。</p>`,
    `<p>这一章节的内容到此暂告一段落。更精彩的情节，敬请期待下一章。</p>`,
  ];
  return paragraphs.slice(0, 3 + (num % 4)).join('\n');
}
