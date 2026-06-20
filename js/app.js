// ===== 应用入口 =====
import { initRouter, register } from './router.js';
import { initNavbar } from './components/navbar.js';
import { renderHome } from './pages/home.js';
import { renderCategory } from './pages/category.js';
import { renderSearch } from './pages/search.js';
import { renderDetail } from './pages/detail.js';
import { renderReader } from './pages/reader.js';
import { renderBookmarks } from './pages/bookmarks.js';
import { renderImport } from './pages/import.js';
import { getTheme, applyTheme } from './store.js';

/**
 * 启动应用
 */
async function bootstrap() {
  // 应用保存的主题
  const theme = getTheme();
  applyTheme(theme);

  // 初始化导航栏
  initNavbar();

  // 注册路由
  register('/', () => renderHome());
  register('/category/:category', (params) => renderCategory(params.category));
  register('/search', (params, query) => renderSearch(query.q || ''));
  register('/novel/:id', (params) => renderDetail(params.id));
  register('/novel/:id/chapter/:num', (params) => renderReader(params.id, parseInt(params.num)));
  register('/bookmarks', () => renderBookmarks());
  register('/import', () => renderImport());

  // 启动路由
  initRouter();
}

// 启动
bootstrap();
