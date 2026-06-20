// ===== 状态管理 + localStorage 持久化 =====
// 小数据（元数据、书签、进度等）→ localStorage
// 大数据（章节内容）→ IndexedDB（突破 5MB 限制）

import * as DB from './db.js';

const STORE_VERSION = 2;

// ===== 主题应用 =====
// 将主题应用逻辑放在此处，避免 app.js 的循环依赖

export function applyTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-sepia');
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  } else if (theme === 'sepia') {
    document.body.classList.add('theme-sepia');
  }
}

/**
 * 获取书架（收藏列表）
 */
export function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('bookmarks') || '[]');
  } catch {
    return [];
  }
}

/**
 * 添加收藏
 */
export function addBookmark(novel) {
  const bookmarks = getBookmarks();
  const exists = bookmarks.find(b => b.novelId === novel.id);
  if (!exists) {
    bookmarks.unshift({
      novelId: novel.id,
      novelTitle: novel.title,
      cover: novel.cover || '',
      author: novel.author,
      category: novel.category,
      addedAt: Date.now(),
    });
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }
  return bookmarks;
}

/**
 * 移除收藏
 */
export function removeBookmark(novelId) {
  let bookmarks = getBookmarks();
  bookmarks = bookmarks.filter(b => b.novelId !== novelId);
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  return bookmarks;
}

/**
 * 判断是否已收藏
 */
export function isBookmarked(novelId) {
  return getBookmarks().some(b => b.novelId === novelId);
}

/**
 * 切换收藏状态，返回新状态
 */
export function toggleBookmark(novel) {
  if (isBookmarked(novel.id)) {
    removeBookmark(novel.id);
    return false;
  } else {
    addBookmark(novel);
    return true;
  }
}

// ===== 阅读进度 =====

/**
 * 获取所有阅读进度
 */
export function getReadingProgress() {
  try {
    return JSON.parse(localStorage.getItem('readingProgress') || '{}');
  } catch {
    return {};
  }
}

/**
 * 保存阅读进度
 */
export function saveReadingProgress(novelId, chapterNum, chapterTitle, scrollPos = 0) {
  const progress = getReadingProgress();
  progress[novelId] = {
    novelId,
    chapterNum,
    chapterTitle,
    scrollPos,
    updatedAt: Date.now(),
  };
  localStorage.setItem('readingProgress', JSON.stringify(progress));
}

/**
 * 获取某本小说的阅读进度
 */
export function getNovelProgress(novelId) {
  const progress = getReadingProgress();
  return progress[novelId] || null;
}

// ===== 主题设置 =====

/**
 * 获取主题
 */
export function getTheme() {
  return localStorage.getItem('theme') || 'light';
}

/**
 * 保存主题
 */
export function saveTheme(theme) {
  localStorage.setItem('theme', theme);
}

// ===== 字体大小 =====

/**
 * 获取字体大小
 */
export function getFontSize() {
  return localStorage.getItem('fontSize') || 'md';
}

/**
 * 保存字体大小
 */
export function saveFontSize(size) {
  localStorage.setItem('fontSize', size);
}

// ===== 字体类型 =====
export function getFontFamily() {
  return localStorage.getItem('fontFamily') || 'system';
}
export function saveFontFamily(family) {
  localStorage.setItem('fontFamily', family);
}

// ===== 行距 =====
export function getLineHeight() {
  return localStorage.getItem('lineHeight') || 'normal';
}
export function saveLineHeight(height) {
  localStorage.setItem('lineHeight', height);
}

// ===== 页宽 =====
export function getPageWidth() {
  return localStorage.getItem('pageWidth') || 'normal';
}
export function savePageWidth(width) {
  localStorage.setItem('pageWidth', width);
}

// ===== 阅读历史 =====

/**
 * 获取阅读历史
 */
export function getReadingHistory() {
  try {
    return JSON.parse(localStorage.getItem('readingHistory') || '[]');
  } catch {
    return [];
  }
}

/**
 * 添加阅读记录
 */
export function addReadingHistory(novelId, novelTitle, cover, chapterNum, chapterTitle) {
  const history = getReadingHistory();
  // 移除旧记录
  const filtered = history.filter(h => h.novelId !== novelId);
  filtered.unshift({
    novelId,
    novelTitle,
    cover,
    chapterNum,
    chapterTitle,
    readAt: Date.now(),
  });
  // 最多保留 50 条
  const trimmed = filtered.slice(0, 50);
  localStorage.setItem('readingHistory', JSON.stringify(trimmed));
}

/**
 * 导出所有数据（备份用）
 */
export function exportData() {
  return {
    version: STORE_VERSION,
    bookmarks: getBookmarks(),
    readingProgress: getReadingProgress(),
    readingHistory: getReadingHistory(),
    readChapters: JSON.parse(localStorage.getItem('readChapters') || '{}'),
    theme: getTheme(),
    fontSize: getFontSize(),
    exportedAt: new Date().toISOString(),
  };
}

// ===== 导入的小说 =====

/**
 * 获取所有导入的小说元数据
 */
export function getImportedNovels() {
  try {
    return JSON.parse(localStorage.getItem('importedNovels') || '[]');
  } catch {
    return [];
  }
}

/**
 * 保存导入的小说元数据
 */
export function saveImportedNovels(novels) {
  localStorage.setItem('importedNovels', JSON.stringify(novels));
}

/**
 * 添加一本导入的小说
 */
export function addImportedNovel(novel) {
  const novels = getImportedNovels();
  // 默认状态为已发布
  if (!novel.status) novel.status = 'published';
  const idx = novels.findIndex(n => n.id === novel.id);
  if (idx >= 0) {
    novels[idx] = { ...novels[idx], ...novel };
  } else {
    novels.push(novel);
  }
  saveImportedNovels(novels);
}

/**
 * 获取已发布的导入小说（用于公开展示）
 */
export function getPublishedImportedNovels() {
  return getImportedNovels().filter(n => n.status !== 'unpublished');
}

/**
 * 切换小说的发布状态（上架/下架）
 * 返回新状态
 */
export function toggleNovelStatus(novelId) {
  const novels = getImportedNovels();
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return null;
  novel.status = novel.status === 'unpublished' ? 'published' : 'unpublished';
  saveImportedNovels(novels);
  return novel.status;
}

/**
 * 下架小说
 */
export function unpublishNovel(novelId) {
  const novels = getImportedNovels();
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;
  novel.status = 'unpublished';
  saveImportedNovels(novels);
}

/**
 * 重新上架小说
 */
export function publishNovel(novelId) {
  const novels = getImportedNovels();
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;
  novel.status = 'published';
  saveImportedNovels(novels);
}

/**
 * 删除导入的小说（及其章节）
 */
export async function removeImportedNovel(novelId) {
  // 删除元数据
  const novels = getImportedNovels().filter(n => n.id !== novelId);
  saveImportedNovels(novels);
  // 删除章节（IndexedDB）
  DB.deleteChapters(novelId).catch(() => {});
  // 删除收藏
  removeBookmark(novelId);
  // 删除进度
  const progress = getReadingProgress();
  delete progress[novelId];
  localStorage.setItem('readingProgress', JSON.stringify(progress));
}

/**
 * 获取导入小说的所有章节（异步，从 IndexedDB 读取）
 */
export async function getImportedChapters(novelId) {
  try {
    return await DB.getChapters(novelId);
  } catch {
    return [];
  }
}

/**
 * 保存导入小说的章节（异步，写入 IndexedDB）
 */
export async function saveImportedChapters(novelId, chapters) {
  return DB.saveChapters(novelId, chapters);
}

/**
 * 追加章节到已有小说
 */
export async function appendImportedChapters(novelId, chapters) {
  return DB.appendChapters(novelId, chapters);
}

/**
 * 获取章节总数（异步）
 */
export async function getImportedChapterCount(novelId) {
  return DB.getChapterCount(novelId);
}

/**
 * 获取所有导入小说的数据导出（含章节，用于备份）
 */
export async function exportImportedAll() {
  return DB.exportAllData();
}

/**
 * 从备份导入全部数据
 */
export async function importFromBackup(data) {
  return DB.importAllData(data);
}
