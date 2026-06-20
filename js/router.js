// ===== Hash 路由管理 =====
import { parseRoute, matchRoute } from './utils.js';

const routes = [];
let currentRoute = null;
let beforeHooks = [];

/**
 * 注册路由
 * @param {string} pattern - 路由模式，如 '/novel/:id'
 * @param {function} handler - 处理函数，接收 (params, query)
 */
export function register(pattern, handler) {
  routes.push({ pattern, handler });
}

/**
 * 注册全局前置守卫
 */
export function beforeEach(hook) {
  beforeHooks.push(hook);
}

/**
 * 导航到指定路径
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * 获取当前路由信息
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * 处理路由变化
 */
async function handleRoute() {
  const hash = window.location.hash || '#/';
  const { segments, query, raw } = parseRoute(hash);

  // 查找匹配的路由
  let matched = null;
  let params = null;

  for (const route of routes) {
    params = matchRoute(route.pattern, segments);
    if (params) {
      matched = route;
      break;
    }
  }

  // 404 处理
  if (!matched) {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">🔍</span>
        <p>页面不存在</p>
        <a href="#/" style="color:var(--accent);margin-top:12px;display:inline-block;">返回首页</a>
      </div>`;
    return;
  }

  // 执行前置守卫
  for (const hook of beforeHooks) {
    const result = await hook(matched.pattern, params, query);
    if (result === false) return;
  }

  currentRoute = { pattern: matched.pattern, params, query, raw };

  // 更新底部导航激活状态
  updateBottomNav(matched.pattern);

  // 执行路由处理函数
  const main = document.getElementById('main-content');
  main.className = ''; // 重置阅读器布局类
  main.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>';

  try {
    await matched.handler(params, query, main);
  } catch (err) {
    console.error('路由处理出错:', err);
    main.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚠️</span>
        <p>加载失败，请刷新重试</p>
      </div>`;
  }
}

/**
 * 更新底部导航高亮
 */
function updateBottomNav(pattern) {
  const items = document.querySelectorAll('.bottom-nav-item');
  items.forEach(item => item.classList.remove('active'));

  if (pattern === '/') {
    items[0]?.classList.add('active');
  } else if (pattern.startsWith('/category')) {
    items[1]?.classList.add('active');
  } else if (pattern === '/bookmarks') {
    items[2]?.classList.add('active');
  }
}

/**
 * 初始化路由
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // 初始加载
  handleRoute();
}
