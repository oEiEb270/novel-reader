// ===== 小说卡片组件 =====
import { getCoverPlaceholder } from '../utils.js';

/**
 * 渲染小说卡片（网格模式）
 */
export function renderNovelCard(novel) {
  const placeholder = getCoverPlaceholder(novel.title);
  const statusLabel = novel.status === 'completed' ? '已完结' : '连载中';
  const statusClass = novel.status === 'completed' ? 'completed' : '';

  return `
    <div class="novel-card" data-id="${novel.id}" onclick="window.location.hash='#/novel/${novel.id}'">
      <div class="cover">
        ${novel.cover
          ? `<img src="${novel.cover}" alt="${novel.title}" loading="lazy">`
          : `<div class="placeholder-cover" style="background:linear-gradient(135deg, ${placeholder.bg}22, ${placeholder.bg}44); color:${placeholder.bg}">${placeholder.char}</div>`
        }
        <span class="status-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="info">
        <div class="title">${novel.title}</div>
        <div class="author">${novel.author}</div>
      </div>
    </div>
  `;
}

/**
 * 渲染小说列表项（横向模式）
 */
export function renderNovelListItem(novel, keyword = '') {
  const placeholder = getCoverPlaceholder(novel.title);
  const statusLabel = novel.status === 'completed' ? '已完结' : '连载中';
  const intro = novel.intro || '暂无简介';

  // 高亮关键词
  const highlightTitle = keyword
    ? novel.title.replace(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>')
    : novel.title;

  return `
    <div class="novel-list-item" data-id="${novel.id}" onclick="window.location.hash='#/novel/${novel.id}'">
      <div class="cover-sm">
        ${novel.cover
          ? `<img src="${novel.cover}" alt="${novel.title}" loading="lazy">`
          : `<span style="color:${placeholder.bg}; font-weight:bold;">${placeholder.char}</span>`
        }
      </div>
      <div class="info">
        <div class="title">${highlightTitle}</div>
        <div class="meta">
          <span>✍️ ${novel.author}</span>
          <span>📂 ${novel.category}</span>
          <span>📄 ${novel.totalChapters}章</span>
          <span>${statusLabel}</span>
        </div>
        <div class="intro">${intro}</div>
        <div class="tags">
          ${(novel.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染小说列表包装器
 */
export function renderNovelList(novels, keyword = '') {
  if (!novels || novels.length === 0) {
    return `
      <div class="empty-state">
        <span class="icon">📭</span>
        <p>暂无小说</p>
      </div>`;
  }

  return `
    <div class="novel-list">
      ${novels.map(n => renderNovelListItem(n, keyword)).join('')}
    </div>`;
}

/**
 * 渲染小说网格包装器
 */
export function renderNovelGrid(novels) {
  if (!novels || novels.length === 0) {
    return `
      <div class="empty-state">
        <span class="icon">📭</span>
        <p>暂无小说</p>
      </div>`;
  }

  return `
    <div class="novel-grid">
      ${novels.map(n => renderNovelCard(n)).join('')}
    </div>`;
}
