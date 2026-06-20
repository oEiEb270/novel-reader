// ===== 分类页 =====
import { fetchNovels } from '../api.js';
import { renderNovelGrid } from '../components/novelCard.js';
import { getCategoryIcon, getCategoryName } from '../utils.js';

const CATEGORIES = [
  { key: 'all', name: '全部', icon: '📚' },
  { key: 'fantasy', name: '玄幻', icon: '🐉' },
  { key: 'urban', name: '都市', icon: '🏙️' },
  { key: 'scifi', name: '科幻', icon: '🚀' },
  { key: 'history', name: '历史', icon: '🏯' },
];

export async function renderCategory(category) {
  const main = document.getElementById('main-content');
  const currentCat = category || 'all';

  main.innerHTML = `
    <div class="category-page">
      <div class="category-tabs">
        ${CATEGORIES.map(c => `
          <a href="#/category/${c.key}" class="category-tab ${c.key === currentCat ? 'active' : ''}">
            ${c.icon} ${c.name}
          </a>
        `).join('')}
      </div>
      <div id="category-content">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const result = await fetchNovels(currentCat === 'all' ? null : currentCat);
    const content = document.getElementById('category-content');
    const catName = currentCat === 'all' ? '全部' : getCategoryName(currentCat);

    content.innerHTML = `
      <div class="section-title">
        <span class="icon">${getCategoryIcon(currentCat)}</span>
        ${catName}小说
        <span style="font-size:13px;color:var(--text-muted);font-weight:normal;">
          （共 ${result.total} 本）
        </span>
      </div>
      ${renderNovelGrid(result.items)}
    `;
  } catch (err) {
    console.error('分类页加载失败:', err);
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚠️</span>
        <p>加载失败，请刷新重试</p>
      </div>`;
  }
}
