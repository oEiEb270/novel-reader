// ===== 阅读器工具栏 =====
import { getFontSize, saveFontSize, getTheme, saveTheme, applyTheme,
         getFontFamily, saveFontFamily, getLineHeight, saveLineHeight,
         getPageWidth, savePageWidth } from '../store.js';

/**
 * 渲染阅读器工具栏
 */
export function renderReaderToolbar(novelId, chapterNum, totalChapters, onCatalogToggle) {
  return `
    <div class="reader-toolbar">
      <!-- 返回 + 目录 -->
      <div class="tool-group">
        <button class="tool-btn" onclick="window.location.hash='#/novel/${novelId}'" title="返回详情">←</button>
        <button class="tool-btn" id="catalog-toggle" title="目录">📋</button>
        <span style="font-size:12px;color:var(--text-muted);margin:0 4px;">${chapterNum}/${totalChapters}</span>
      </div>

      <!-- 字体大小 -->
      <div class="tool-group">
        <button class="tool-btn font-size-btn" data-size="sm" title="缩小字体">A⁻</button>
        <span class="font-size-label">标准</span>
        <button class="tool-btn font-size-btn" data-size="lg" title="放大字体">A⁺</button>
      </div>

      <!-- 字体类型 -->
      <div class="tool-group">
        <select id="font-family-select" style="padding:4px 6px;border-radius:6px;font-size:12px;
          background:var(--input-bg);color:var(--text-primary);border:1px solid var(--border);
          cursor:pointer;max-width:80px;">
          <option value="system">默认</option>
          <option value="serif">宋体</option>
          <option value="sans">黑体</option>
          <option value="kai">楷体</option>
        </select>
      </div>

      <!-- 行距 -->
      <div class="tool-group">
        <button class="tool-btn line-height-btn" data-lh="compact" title="紧凑行距">≡</button>
        <button class="tool-btn line-height-btn active" data-lh="normal" title="标准行距">☰</button>
        <button class="tool-btn line-height-btn" data-lh="relaxed" title="宽松行距">≣</button>
      </div>

      <!-- 页宽 -->
      <div class="tool-group">
        <button class="tool-btn page-width-btn" data-pw="narrow" title="窄栏">◧</button>
        <button class="tool-btn page-width-btn active" data-pw="normal" title="标准">◨</button>
        <button class="tool-btn page-width-btn" data-pw="wide" title="宽栏">◩</button>
      </div>

      <!-- 主题 -->
      <div class="tool-group">
        <button class="tool-btn theme-tool-btn" data-theme="light" title="日间">☀️</button>
        <button class="tool-btn theme-tool-btn" data-theme="dark" title="夜间">🌙</button>
        <button class="tool-btn theme-tool-btn" data-theme="sepia" title="护眼">📜</button>
      </div>
    </div>
  `;
}

/**
 * 初始化阅读器工具栏事件
 */
export function initReaderToolbar(callbacks) {
  const { onFontSizeChange, onThemeChange, onCatalogToggle,
          onFontFamilyChange, onLineHeightChange, onPageWidthChange } = callbacks;

  // === 字体大小 ===
  const currentFontSize = getFontSize();
  const fontLabel = document.querySelector('.font-size-label');
  const fontLabels = { sm: '小号', md: '标准', lg: '大号' };
  if (fontLabel) fontLabel.textContent = fontLabels[currentFontSize] || '标准';

  document.querySelectorAll('.font-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sizes = ['sm', 'md', 'lg'];
      const current = getFontSize();
      const idx = sizes.indexOf(current);
      let newSize;
      if (btn.dataset.size === 'sm') {
        newSize = sizes[Math.max(0, idx - 1)];
      } else {
        newSize = sizes[Math.min(sizes.length - 1, idx + 1)];
      }
      saveFontSize(newSize);
      if (fontLabel) fontLabel.textContent = fontLabels[newSize] || '标准';
      onFontSizeChange(newSize);
    });
  });

  // === 字体类型 ===
  const fontFamilySelect = document.getElementById('font-family-select');
  if (fontFamilySelect) {
    fontFamilySelect.value = getFontFamily();
    fontFamilySelect.addEventListener('change', () => {
      const val = fontFamilySelect.value;
      saveFontFamily(val);
      onFontFamilyChange(val);
    });
  }

  // === 行距 ===
  const currentLineHeight = getLineHeight();
  updateBtnGroup('.line-height-btn', currentLineHeight);
  document.querySelectorAll('.line-height-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.lh;
      saveLineHeight(val);
      updateBtnGroup('.line-height-btn', val);
      onLineHeightChange(val);
    });
  });

  // === 页宽 ===
  const currentPageWidth = getPageWidth();
  updateBtnGroup('.page-width-btn', currentPageWidth);
  document.querySelectorAll('.page-width-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.pw;
      savePageWidth(val);
      updateBtnGroup('.page-width-btn', val);
      onPageWidthChange(val);
    });
  });

  // === 主题 ===
  const currentTheme = getTheme();
  updateBtnGroup('.theme-tool-btn', currentTheme);
  document.querySelectorAll('.theme-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      saveTheme(theme);
      updateBtnGroup('.theme-tool-btn', theme);
      onThemeChange(theme);
    });
  });

  // === 目录 ===
  const catalogBtn = document.getElementById('catalog-toggle');
  if (catalogBtn) {
    catalogBtn.addEventListener('click', onCatalogToggle);
  }
}

function updateBtnGroup(selector, activeVal) {
  document.querySelectorAll(selector).forEach(btn => {
    const val = btn.dataset.lh || btn.dataset.pw || btn.dataset.theme;
    btn.classList.toggle('active', val === activeVal);
  });
}
