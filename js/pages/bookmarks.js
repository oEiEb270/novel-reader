// ===== 书架页 =====
import { getBookmarks, getReadingHistory, getReadingProgress, removeBookmark } from '../store.js';
import { getCategoryName, getCoverPlaceholder } from '../utils.js';
import { showToast } from '../utils.js';

export async function renderBookmarks() {
  const main = document.getElementById('main-content');

  const bookmarks = getBookmarks();
  const history = getReadingHistory();
  const progress = getReadingProgress();

  main.innerHTML = `
    <div class="bookmarks-page">
      <!-- 标签切换 -->
      <div class="category-tabs" style="margin-bottom:20px;">
        <button class="category-tab active" data-tab="shelf">📚 我的书架</button>
        <button class="category-tab" data-tab="history">🕐 阅读历史</button>
      </div>

      <!-- 书架 -->
      <div id="tab-shelf">
        ${bookmarks.length === 0 ? `
          <div class="empty-state">
            <span class="icon">📚</span>
            <p>书架空空如也</p>
            <p style="font-size:13px;margin-top:4px;">去发现一些有趣的小说吧！</p>
            <a href="#/" style="color:var(--accent);margin-top:12px;display:inline-block;">去首页看看</a>
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
            共收藏 ${bookmarks.length} 本小说
          </div>
          <div class="novel-list">
            ${bookmarks.map(b => {
              const prog = progress[b.novelId];
              const placeholder = getCoverPlaceholder(b.novelTitle);
              return `
                <div class="novel-list-item bookmarked-item" data-id="${b.novelId}">
                  <div class="cover-sm" onclick="window.location.hash='#/novel/${b.novelId}'">
                    ${b.cover
                      ? `<img src="${b.cover}" alt="${b.novelTitle}">`
                      : `<span style="color:${placeholder.bg};font-weight:bold;">${placeholder.char}</span>`
                    }
                  </div>
                  <div class="info" onclick="window.location.hash='#/novel/${b.novelId}'">
                    <div class="title">${b.novelTitle}</div>
                    <div class="meta">
                      <span>✍️ ${b.author || ''}</span>
                      <span>📂 ${getCategoryName(b.category || 'all')}</span>
                    </div>
                    ${prog ? `
                      <div style="font-size:12px;color:var(--accent);margin-top:4px;">
                        📖 读到：${prog.chapterTitle || `第${prog.chapterNum}章`}
                      </div>
                    ` : '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">尚未阅读</div>'}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    ${prog ? `
                      <button class="btn btn-primary" style="padding:6px 14px;font-size:12px;"
                        onclick="window.location.hash='#/novel/${b.novelId}/chapter/${prog.chapterNum}'">
                        继续读
                      </button>
                    ` : `
                      <button class="btn btn-primary" style="padding:6px 14px;font-size:12px;"
                        onclick="window.location.hash='#/novel/${b.novelId}'">
                        去看看
                      </button>
                    `}
                    <button class="remove-bookmark-btn" data-id="${b.novelId}" title="取消收藏">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 阅读历史 -->
      <div id="tab-history" style="display:none;">
        ${history.length === 0 ? `
          <div class="empty-state">
            <span class="icon">🕐</span>
            <p>暂无阅读记录</p>
            <a href="#/" style="color:var(--accent);margin-top:12px;display:inline-block;">去首页看看</a>
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
            最近阅读 ${history.length} 本
          </div>
          <div class="novel-list">
            ${history.slice(0, 20).map(h => {
              const prog = progress[h.novelId];
              const placeholder = getCoverPlaceholder(h.novelTitle);
              const timeAgo = getTimeAgo(h.readAt);
              return `
                <div class="novel-list-item">
                  <div class="cover-sm" onclick="window.location.hash='#/novel/${h.novelId}/chapter/${h.chapterNum}'">
                    ${h.cover
                      ? `<img src="${h.cover}" alt="${h.novelTitle}">`
                      : `<span style="color:${placeholder.bg};font-weight:bold;">${placeholder.char}</span>`
                    }
                  </div>
                  <div class="info" onclick="window.location.hash='#/novel/${h.novelId}/chapter/${h.chapterNum}'">
                    <div class="title">${h.novelTitle}</div>
                    <div class="meta">
                      <span>读到：${h.chapterTitle || `第${h.chapterNum}章`}</span>
                      <span>${timeAgo}</span>
                    </div>
                    ${prog && prog.chapterNum > h.chapterNum ? `
                      <div style="font-size:12px;color:var(--accent);margin-top:4px;">
                        最新：${prog.chapterTitle || `第${prog.chapterNum}章`}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // 标签切换事件
  bindBookmarkEvents();
}

function bindBookmarkEvents() {
  // 标签切换
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('tab-shelf').style.display = target === 'shelf' ? 'block' : 'none';
      document.getElementById('tab-history').style.display = target === 'history' ? 'block' : 'none';
    });
  });

  // 取消收藏
  document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const novelId = btn.dataset.id;
      removeBookmark(novelId);
      showToast('已取消收藏');
      // 移除对应的列表项
      const item = btn.closest('.bookmarked-item');
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        item.style.transition = 'all 0.3s ease';
        setTimeout(() => item.remove(), 300);
      }
    });
  });
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}
