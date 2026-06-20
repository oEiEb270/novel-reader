// ===== 小说详情页 =====
import { fetchNovelDetail } from '../api.js';
import { getCoverPlaceholder, getCategoryName, formatDate, formatWordCount, isChapterRead } from '../utils.js';
import { toggleBookmark, isBookmarked, getNovelProgress } from '../store.js';
import { showToast } from '../utils.js';

export async function renderDetail(novelId) {
  const main = document.getElementById('main-content');

  try {
    const novel = await fetchNovelDetail(novelId);
    const bookmarked = isBookmarked(novelId);
    const progress = getNovelProgress(novelId);
    const placeholder = getCoverPlaceholder(novel.title);

    const sortOrder = { current: 'asc' };

    main.innerHTML = `
      <div class="novel-detail">
        ${novel.isUnpublished ? `
          <div style="background:var(--accent-light);border:1px solid var(--accent);
            border-radius:8px;padding:12px 20px;display:flex;align-items:center;gap:10px;
            color:var(--accent);font-size:14px;margin-bottom:4px;">
            <span style="font-size:1.2rem;">⚠️</span>
            <span>本小说已被下架，仅您自己可见，不会出现在公开列表和搜索结果中。</span>
          </div>
        ` : ''}
        <!-- 详情头部 -->
        <div class="detail-header">
          <div class="detail-cover">
            ${novel.cover
              ? `<img src="${novel.cover}" alt="${novel.title}">`
              : `<span style="color:${placeholder.bg};font-weight:bold;font-size:2.5rem;">${placeholder.char}</span>`
            }
          </div>
          <div class="detail-info">
            <h1 class="title">${novel.title}</h1>
            <div class="meta">
              <span>✍️ ${novel.author}</span>
              <span>📂 ${getCategoryName(novel.category)}</span>
              <span>📄 ${novel.totalChapters}章</span>
              <span>📝 ${formatWordCount(novel.wordCount || 0)}</span>
              <span>${novel.status === 'completed' ? '✅ 已完结' : '🔄 连载中'}</span>
              <span>🕐 ${formatDate(novel.updateTime)}</span>
            </div>
            <div class="intro">${novel.intro}</div>
            <div class="tags" style="display:flex;gap:6px;">
              ${(novel.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
            <div class="detail-actions">
              <button class="btn btn-primary" id="start-read-btn">
                ${progress ? `📖 继续阅读（第${progress.chapterNum}章）` : '📖 开始阅读'}
              </button>
              <button class="btn btn-outline ${bookmarked ? 'bookmarked' : ''}" id="bookmark-btn">
                ${bookmarked ? '❤️ 已收藏' : '🤍 加入书架'}
              </button>
            </div>
            ${progress ? `
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                上次读到：${progress.chapterTitle || `第${progress.chapterNum}章`}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 章节目录 -->
        <div class="chapter-list-section">
          <div class="chapter-list-header">
            <h3>📋 章节目录（共 ${novel.totalChapters} 章）</h3>
            <button class="chapter-sort-btn" id="sort-chapters">
              ${sortOrder.current === 'asc' ? '↑ 正序' : '↓ 倒序'}
            </button>
          </div>
          <div class="chapter-list" id="chapter-list">
            ${renderChapterList(novel.chapterList, novelId, sortOrder.current)}
          </div>
        </div>
      </div>
    `;

    // 事件绑定
    bindEvents(novel, novelId, sortOrder);
  } catch (err) {
    console.error('详情页加载失败:', err);
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚠️</span>
        <p>加载失败，请返回重试</p>
        <a href="#/" style="color:var(--accent);margin-top:12px;display:inline-block;">返回首页</a>
      </div>`;
  }
}

function renderChapterList(chapters, novelId, order) {
  const sorted = order === 'desc' ? [...chapters].reverse() : chapters;
  return sorted.map(ch => {
    const readClass = isChapterRead(novelId, ch.chapterNum) ? 'read' : '';
    return `
      <div class="chapter-item ${readClass}" data-chapter="${ch.chapterNum}" data-novel="${novelId}">
        <span class="chapter-title">${ch.title}</span>
        ${readClass ? '<span class="chapter-badge">已读</span>' : ''}
      </div>
    `;
  }).join('');
}

function bindEvents(novel, novelId, sortOrder) {
  // 开始/继续阅读
  const startBtn = document.getElementById('start-read-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const progress = getNovelProgress(novelId);
      const chapterNum = progress ? progress.chapterNum : 1;
      window.location.hash = `#/novel/${novelId}/chapter/${chapterNum}`;
    });
  }

  // 收藏
  const bookmarkBtn = document.getElementById('bookmark-btn');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      const isNowBookmarked = toggleBookmark(novel);
      const action = isNowBookmarked ? '已加入书架' : '已取消收藏';
      bookmarkBtn.innerHTML = isNowBookmarked ? '❤️ 已收藏' : '🤍 加入书架';
      bookmarkBtn.classList.toggle('bookmarked', isNowBookmarked);
      showToast(action);
    });
  }

  // 章节排序
  const sortBtn = document.getElementById('sort-chapters');
  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      sortOrder.current = sortOrder.current === 'asc' ? 'desc' : 'asc';
      sortBtn.textContent = sortOrder.current === 'asc' ? '↑ 正序' : '↓ 倒序';
      const listDiv = document.getElementById('chapter-list');
      if (listDiv) {
        listDiv.innerHTML = renderChapterList(novel.chapterList, novelId, sortOrder.current);
        bindChapterClicks();
      }
    });
  }

  // 章节点击
  bindChapterClicks();
}

function bindChapterClicks() {
  document.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', () => {
      const novelId = item.dataset.novel;
      const chapterNum = item.dataset.chapter;
      window.location.hash = `#/novel/${novelId}/chapter/${chapterNum}`;
    });
  });
}
