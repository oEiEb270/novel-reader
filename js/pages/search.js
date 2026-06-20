// ===== 搜索页 =====
import { searchNovels } from '../api.js';
import { renderNovelList } from '../components/novelCard.js';

export async function renderSearch(query) {
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="search-page">
      <div class="section-title">
        <span class="icon">🔍</span>
        ${query ? `搜索："${query}"` : '搜索'}
      </div>
      <div id="search-results">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>搜索中...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const result = await searchNovels(query);
    const resultsDiv = document.getElementById('search-results');

    if (result.items.length === 0) {
      resultsDiv.innerHTML = `
        <div class="empty-state">
          <span class="icon">🔍</span>
          <p>${query ? `未找到与"${query}"相关的小说` : '请输入搜索关键词'}</p>
          ${query ? '<p style="margin-top:8px;font-size:13px;">试试其他关键词吧</p>' : ''}
        </div>`;
    } else {
      resultsDiv.innerHTML = `
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
          共找到 ${result.total} 本相关小说
        </p>
        ${renderNovelList(result.items, query)}
      `;
    }
  } catch (err) {
    console.error('搜索失败:', err);
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚠️</span>
        <p>搜索失败，请刷新重试</p>
      </div>`;
  }
}
