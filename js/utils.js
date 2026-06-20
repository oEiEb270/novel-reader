// ===== 工具函数 =====

/**
 * 创建 DOM 元素
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = val;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, val);
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

/**
 * 显示 Toast 提示
 */
export function showToast(message, duration = 2000) {
  const toast = createElement('div', { className: 'toast' }, [message]);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

/**
 * 防抖函数
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 解析 Hash 路由
 * 返回 { path, params, query }
 */
export function parseRoute(hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathStr, queryStr] = raw.split('?');
  const segments = pathStr.split('/').filter(Boolean);

  // 解析查询参数
  const query = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });
  }

  return { segments, query, raw };
}

/**
 * 匹配路由模式
 * 支持 :param 动态参数
 */
export function matchRoute(pattern, segments) {
  const patternSegs = pattern.split('/').filter(Boolean);

  if (patternSegs.length !== segments.length) return null;

  const params = {};
  for (let i = 0; i < patternSegs.length; i++) {
    if (patternSegs[i].startsWith(':')) {
      params[patternSegs[i].slice(1)] = segments[i];
    } else if (patternSegs[i] !== segments[i]) {
      return null;
    }
  }

  return params;
}

/**
 * 格式化日期
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化字数
 */
export function formatWordCount(count) {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万字';
  }
  return count + '字';
}

/**
 * 获取分类中文名
 */
export function getCategoryName(cat) {
  const map = {
    all: '全部',
    fantasy: '玄幻',
    urban: '都市',
    scifi: '科幻',
    history: '历史',
    martial: '武侠',
    romance: '言情',
    suspense: '悬疑',
  };
  return map[cat] || cat;
}

/**
 * 获取分类图标
 */
export function getCategoryIcon(cat) {
  const map = {
    all: '📚',
    fantasy: '🐉',
    urban: '🏙️',
    scifi: '🚀',
    history: '🏯',
    martial: '⚔️',
    romance: '💕',
    suspense: '🔍',
  };
  return map[cat] || '📖';
}

/**
 * 生成封面占位符
 */
export function getCoverPlaceholder(title) {
  const colors = ['#667eea', '#764ba2', '#e74c3c', '#27ae60', '#f39c12', '#2980b9', '#8e44ad', '#16a085'];
  const idx = title.length % colors.length;
  return {
    bg: colors[idx],
    char: title.charAt(0),
  };
}

/**
 * 高亮关键词
 */
export function highlightText(text, keyword) {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 获取已读章节集合
 */
export function getReadChapters(novelId) {
  try {
    const data = JSON.parse(localStorage.getItem('readChapters') || '{}');
    return data[novelId] || new Set();
  } catch {
    return new Set();
  }
}

/**
 * 添加已读章节
 */
export function addReadChapter(novelId, chapterNum) {
  try {
    const data = JSON.parse(localStorage.getItem('readChapters') || '{}');
    if (!data[novelId]) data[novelId] = [];
    if (!data[novelId].includes(chapterNum)) {
      data[novelId].push(chapterNum);
    }
    localStorage.setItem('readChapters', JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * 判断章节是否已读
 */
export function isChapterRead(novelId, chapterNum) {
  try {
    const data = JSON.parse(localStorage.getItem('readChapters') || '{}');
    return (data[novelId] || []).includes(chapterNum);
  } catch {
    return false;
  }
}
