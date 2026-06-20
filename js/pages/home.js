// ===== 首页 =====
import { fetchHotNovels, fetchNovels } from '../api.js';
import { renderNovelGrid } from '../components/novelCard.js';
import { getCategoryIcon, getCategoryName } from '../utils.js';
import { getReadingHistory } from '../store.js';

const CATEGORIES = ['fantasy', 'urban', 'scifi', 'history'];

export async function renderHome() {
  const main = document.getElementById('main-content');

  try {
    const [hotNovels, ...categoryResults] = await Promise.all([
      fetchHotNovels(6),
      ...CATEGORIES.map(c => fetchNovels(c, 1, 6)),
    ]);

    // 阅读历史
    const history = getReadingHistory().slice(0, 4);

    main.innerHTML = `
      <div class="home-page">
        <!-- 分类入口 -->
        <section style="margin-bottom:28px;">
          <div class="category-tabs">
            <a href="#/category/all" class="category-tab active">📚 全部</a>
            ${CATEGORIES.map(c => `
              <a href="#/category/${c}" class="category-tab">${getCategoryIcon(c)} ${getCategoryName(c)}</a>
            `).join('')}
          </div>
        </section>

        <!-- 阅读历史 -->
        ${history.length > 0 ? `
        <section style="margin-bottom:28px;">
          <div class="section-title">
            <span class="icon">🕐</span> 最近阅读
          </div>
          <div class="novel-list">
            ${history.map(h => {
              return `
                <div class="novel-list-item" onclick="window.location.hash='#/novel/${h.novelId}/chapter/${h.chapterNum}'">
                  <div class="cover-sm">
                    <span style="font-size:1.5rem;">📖</span>
                  </div>
                  <div class="info">
                    <div class="title">${h.novelTitle}</div>
                    <div class="meta">
                      <span>读到：${h.chapterTitle || `第${h.chapterNum}章`}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
        ` : ''}

        <!-- 热门推荐 -->
        <section style="margin-bottom:28px;">
          <div class="section-title">
            <span class="icon">🔥</span> 热门推荐
          </div>
          <div id="hot-novels">
            ${renderNovelGrid(hotNovels)}
          </div>
        </section>

        <!-- 分类分区 -->
        ${CATEGORIES.map((cat, i) => {
          const result = categoryResults[i];
          const novels = result ? result.items : [];
          return `
            <section style="margin-bottom:28px;">
              <div class="section-title">
                <span class="icon">${getCategoryIcon(cat)}</span>
                ${getCategoryName(cat)}
                <a href="#/category/${cat}" style="font-size:13px;color:var(--accent);margin-left:auto;">查看更多 →</a>
              </div>
              ${renderNovelGrid(novels.slice(0, 6))}
            </section>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('首页加载失败:', err);
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚠️</span>
        <p>加载失败，请刷新重试</p>
      </div>`;
  }
}
