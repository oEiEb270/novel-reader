// ===== 阅读器页 =====
import { fetchChapter, fetchNovelDetail, prefetchChapters } from '../api.js';
import { getFontSize, saveFontSize, getTheme, saveTheme, applyTheme,
         saveReadingProgress, addReadingHistory } from '../store.js';
import { addReadChapter, isChapterRead } from '../utils.js';

export async function renderReader(novelId, chapterNum) {
  const main = document.getElementById('main-content');
  main.className = 'reader-page';

  try {
    const [chapter, novel] = await Promise.all([
      fetchChapter(novelId, chapterNum),
      fetchNovelDetail(novelId),
    ]);

    const savedFontSize = getFontSize();
    const theme = getTheme();

    main.innerHTML = `
      ${novel.isUnpublished ? `
        <div style="background:var(--accent-light);border:1px solid var(--accent);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:8px;color:var(--accent);font-size:13px;">
          ⚠️ 本小说已被下架，仅您自己可见。
        </div>` : ''}

      <div class="reader-toolbar">
        <div class="tool-group">
          <button class="tool-btn" onclick="window.location.hash='#/novel/${novelId}'" title="返回详情">←</button>
          <button class="tool-btn" id="catalog-toggle" title="目录">📋</button>
          <span style="font-size:13px;color:var(--text-muted);">${chapterNum} / ${novel.totalChapters}</span>
        </div>
        <div class="tool-group">
          <button class="tool-btn font-size-btn" data-size="sm" title="缩小字体">A⁻</button>
          <span class="font-size-label">标准</span>
          <button class="tool-btn font-size-btn" data-size="lg" title="放大字体">A⁺</button>
        </div>
        <div class="tool-group">
          <button class="tool-btn theme-tool-btn" data-theme="light" title="日间模式">☀️</button>
          <button class="tool-btn theme-tool-btn" data-theme="dark" title="夜间模式">🌙</button>
          <button class="tool-btn theme-tool-btn" data-theme="sepia" title="护眼模式">📜</button>
        </div>
      </div>

      <div class="reader-content font-${savedFontSize}" id="reader-content">
        <h1 class="chapter-title">${chapter.title}</h1>
        ${chapter.content}
      </div>

      <div class="chapter-nav">
        <button class="nav-btn" id="prev-chapter" ${chapterNum <= 1 ? 'disabled' : ''}>◀ 上一章</button>
        <button class="nav-btn" id="next-chapter" ${chapterNum >= novel.totalChapters ? 'disabled' : ''}>下一章 ▶</button>
      </div>

      <div class="catalog-overlay" id="catalog-overlay"></div>
      <div class="catalog-sidebar" id="catalog-sidebar">
        <div class="catalog-header">
          <h3>📋 目录（${novel.totalChapters}章）</h3>
          <button class="catalog-close" id="catalog-close">✕</button>
        </div>
        <div class="catalog-list" id="catalog-list">
          ${renderCatalogList(novel.chapterList, novelId, chapterNum)}
        </div>
      </div>

      <div class="reader-progress-bar" id="reader-progress" style="width:0%"></div>
    `;

    addReadChapter(novelId, chapterNum);
    saveReadingProgress(novelId, chapterNum, chapter.title, 0);
    addReadingHistory(novelId, novel.title, novel.cover || '', chapterNum, chapter.title);

    initToolbarEvents(savedFontSize, theme);
    bindReaderEvents(novelId, chapterNum, novel.totalChapters);
    initScrollProgress();

    // 后台预加载相邻章节（不阻塞当前页面）
    const toPreload = [];
    if (chapterNum > 1) toPreload.push(chapterNum - 1);
    if (chapterNum < novel.totalChapters) toPreload.push(chapterNum + 1);
    if (toPreload.length > 0) {
      prefetchChapters(novelId, toPreload);
    }
  } catch (err) {
    console.error('阅读器加载失败:', err);
    main.innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><p>章节加载失败</p><a href="#/novel/${novelId}">返回详情页</a></div>`;
  }
}

function renderCatalogList(chapters, novelId, currentNum) {
  return chapters.map(ch => {
    const readClass = isChapterRead(novelId, ch.chapterNum) ? 'read' : '';
    const currentClass = ch.chapterNum === currentNum ? 'current' : '';
    return `<div class="chapter-item ${readClass} ${currentClass}" data-chapter="${ch.chapterNum}" data-novel="${novelId}">
      <span>${ch.title}</span>${readClass ? '<span class="chapter-badge">已读</span>' : ''}
    </div>`;
  }).join('');
}

function initToolbarEvents(fs, theme) {
  // 字体大小
  const fontLabel = document.querySelector('.font-size-label');
  const fontLabels = { sm: '小号', md: '标准', lg: '大号' };
  if (fontLabel) fontLabel.textContent = fontLabels[fs] || '标准';

  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sizes = ['sm', 'md', 'lg'];
      const cur = getFontSize();
      let idx = sizes.indexOf(cur);
      idx = btn.dataset.size === 'sm' ? Math.max(0, idx - 1) : Math.min(2, idx + 1);
      const ns = sizes[idx];
      saveFontSize(ns);
      if (fontLabel) fontLabel.textContent = fontLabels[ns];
      const c = document.getElementById('reader-content');
      if (c) { c.classList.remove('font-sm', 'font-md', 'font-lg'); c.classList.add('font-' + ns); }
    });
  });

  // 主题
  document.querySelectorAll('.theme-tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
    btn.addEventListener('click', () => {
      const t = btn.dataset.theme;
      applyTheme(t);
      saveTheme(t);
      document.querySelectorAll('.theme-tool-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
    });
  });
}

function bindReaderEvents(novelId, chapterNum, totalChapters) {
  // 上下章
  document.getElementById('prev-chapter').addEventListener('click', () => {
    if (chapterNum > 1) window.location.hash = `#/novel/${novelId}/chapter/${chapterNum - 1}`;
  });
  document.getElementById('next-chapter').addEventListener('click', () => {
    if (chapterNum < totalChapters) window.location.hash = `#/novel/${novelId}/chapter/${chapterNum + 1}`;
  });

  // 键盘翻页
  document.addEventListener('keydown', function kh(e) {
    const sidebar = document.getElementById('catalog-sidebar');
    if (sidebar && sidebar.classList.contains('open')) return;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && chapterNum > 1) {
      window.location.hash = `#/novel/${novelId}/chapter/${chapterNum - 1}`;
    }
    if ((e.key === 'ArrowRight' || e.key === 'd') && chapterNum < totalChapters) {
      window.location.hash = `#/novel/${novelId}/chapter/${chapterNum + 1}`;
    }
  });

  // 目录
  const sidebar = document.getElementById('catalog-sidebar');
  const overlay = document.getElementById('catalog-overlay');
  function toggleCatalog(show) {
    if (sidebar) sidebar.classList.toggle('open', show);
    if (overlay) overlay.classList.toggle('show', show);
  }
  document.getElementById('catalog-toggle').addEventListener('click', () => toggleCatalog(true));
  document.getElementById('catalog-close').addEventListener('click', () => toggleCatalog(false));
  document.getElementById('catalog-overlay').addEventListener('click', () => toggleCatalog(false));

  document.querySelectorAll('#catalog-list .chapter-item').forEach(item => {
    item.addEventListener('click', () => {
      window.location.hash = `#/novel/${item.dataset.novel}/chapter/${item.dataset.chapter}`;
    });
  });
}

function initScrollProgress() {
  const bar = document.getElementById('reader-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0) bar.style.width = Math.min((window.scrollY / h) * 100, 100) + '%';
  }, { passive: true });
}
