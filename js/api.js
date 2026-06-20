// ===== Mock API 层 =====
// 模拟后端接口，所有方法返回 Promise
// 后续替换此模块即可对接真实后端

import { getImportedNovels, getPublishedImportedNovels, getImportedChapters } from './store.js';

let novelsData = null;
let chaptersData = null;
let communityNovels = null;

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
 * 模拟网络延迟
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * ms));
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
  await delay(200);

  // 先检查是否是社区小说
  if (id.startsWith('community_')) {
    const communityNovel = (communityNovels || []).find(n => (n.id || ('community_' + n.title)) === id);
    if (!communityNovel) throw new Error('小说不存在');

    // 从 community/{id}.json 获取章节
    let chapterList = [];
    try {
      const resp = await fetch(`community/${id}.json`);
      if (resp.ok) {
        const chapters = await resp.json();
        chapterList = chapters.map((c, i) => ({
          novelId: id,
          chapterNum: c.chapterNum || i + 1,
          title: c.title || `第${i + 1}章`,
          wordCount: c.content ? c.content.replace(/<[^>]+>/g, '').length : 0,
        }));
      }
    } catch { /* ignore */ }

    return {
      ...communityNovel,
      id,
      totalChapters: chapterList.length || communityNovel.totalChapters || 0,
      chapterList,
      isCommunity: true,
    };
  }

  // 先检查是否是导入的小说（包括已下架的）
  if (id.startsWith('import_')) {
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
    return {
      ...imported,
      totalChapters: chapterList.length,
      chapterList,
      isImported: true,
      isUnpublished,
    };
  }

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

  return { ...novel, chapterList: fullChapterList, isImported: false };
}

/**
 * 获取章节内容
 */
export async function fetchChapter(novelId, chapterNum) {
  await delay(250);

  // 社区小说章节
  if (novelId.startsWith('community_')) {
    const communityNovel = (communityNovels || []).find(n => (n.id || ('community_' + n.title)) === novelId);
    if (!communityNovel) throw new Error('小说不存在');

    try {
      const resp = await fetch(`community/${novelId}.json`);
      if (resp.ok) {
        const chapters = await resp.json();
        const chapter = chapters.find(c => (c.chapterNum || 0) === chapterNum);
        if (chapter) {
          return {
            novelId,
            chapterNum,
            title: chapter.title || `第${chapterNum}章`,
            content: chapter.content || '<p>暂无内容</p>',
            wordCount: chapter.content ? chapter.content.replace(/<[^>]+>/g, '').length : 0,
            novelTitle: communityNovel.title,
            totalChapters: chapters.length,
          };
        }
      }
    } catch { /* ignore */ }
    throw new Error('章节不存在');
  }

  // 导入的小说章节
  if (novelId.startsWith('import_')) {
    const imported = getImportedNovels().find(n => n.id === novelId);
    if (!imported) throw new Error('小说不存在');
    const chapters = await getImportedChapters(novelId);
    const idx = chapters.findIndex(c => (c.chapterNum || 0) === chapterNum);
    if (idx < 0) throw new Error('章节不存在');
    const chapter = chapters[idx];
    return {
      novelId,
      chapterNum,
      title: chapter.title || `第${chapterNum}章`,
      content: chapter.content || '<p>暂无内容</p>',
      wordCount: chapter.content ? chapter.content.replace(/<[^>]+>/g, '').length : 0,
      novelTitle: imported.title,
      totalChapters: chapters.length,
      isUnpublished: imported.status === 'unpublished',
    };
  }

  await loadData();

  const novel = novelsData.find(n => n.id === novelId);
  if (!novel) throw new Error('小说不存在');

  const novelChapters = chaptersData[novelId] || [];
  const chapter = novelChapters.find(c => c.chapterNum === chapterNum);

  if (chapter) {
    return { ...chapter, novelTitle: novel.title, totalChapters: novel.totalChapters };
  }

  return {
    novelId,
    chapterNum,
    title: `第${chapterNum}章 ${generateChapterTitle(novel.category, chapterNum)}`,
    content: generateChapterContent(novel.title, chapterNum),
    wordCount: Math.floor(2000 + Math.random() * 3000),
    novelTitle: novel.title,
    totalChapters: novel.totalChapters,
  };
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
