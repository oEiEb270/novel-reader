// ===== 顶部导航栏 =====
import { navigate } from '../router.js';
import { getTheme, saveTheme, applyTheme } from '../store.js';

export function initNavbar() {
  const header = document.getElementById('navbar');
  header.innerHTML = `
    <div class="navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-brand">
          <span class="brand-icon">📚</span>
          <span>书香阁</span>
        </a>
        <div class="navbar-search">
          <input type="text" id="search-input" placeholder="搜索小说或作者...">
          <button class="search-btn" id="search-btn">🔍</button>
        </div>
        <div class="navbar-actions">
          <a href="#/import" class="nav-btn" title="导入小说">📥</a>
          <a href="#/bookmarks" class="nav-btn" title="书架">📖</a>
          <div class="theme-toggle">
            <button class="nav-btn" id="theme-btn" title="主题切换">🎨</button>
            <div class="theme-menu" id="theme-menu">
              <button class="theme-option" data-theme="light">
                ☀️ 日间模式
              </button>
              <button class="theme-option" data-theme="dark">
                🌙 夜间模式
              </button>
              <button class="theme-option" data-theme="sepia">
                📜 护眼模式
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 搜索功能
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // 主题切换
  const themeBtn = document.getElementById('theme-btn');
  const themeMenu = document.getElementById('theme-menu');

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    themeMenu.classList.remove('show');
  });

  // 主题选项
  const currentTheme = getTheme();
  themeMenu.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.dataset.theme === currentTheme) {
      opt.classList.add('active');
    }
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const theme = opt.dataset.theme;
      applyTheme(theme);
      saveTheme(theme);
      themeMenu.classList.remove('show');
      // 更新激活状态
      themeMenu.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
}
