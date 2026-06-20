// ===== 小说导入页 =====
import { addImportedNovel, saveImportedChapters, getImportedChapters,
         removeImportedNovel, getImportedNovels, getPublishedImportedNovels,
         exportImportedAll, importFromBackup,
         unpublishNovel, publishNovel, appendImportedChapters } from '../store.js';
import { showToast } from '../utils.js';
import { getCategoryName } from '../utils.js';

const CATEGORIES = ['fantasy', 'urban', 'scifi', 'history', 'martial', 'romance', 'suspense'];

// CORS 代理列表
const CORS_PROXIES = [
  { name: 'Proxy 1', url: 'https://api.allorigins.win/raw?url=' },
  { name: 'Proxy 2', url: 'https://corsproxy.io/?' },
];

export async function renderImport() {
  const main = document.getElementById('main-content');
  const importedNovels = getImportedNovels();

  main.innerHTML = `
    <div class="import-page" style="max-width:900px;margin:0 auto;">
      <div class="section-title">
        <span class="icon">📥</span> 导入小说
      </div>

      <!-- 导入方式选择 -->
      <div class="category-tabs" style="margin-bottom:20px;">
        <button class="category-tab active" data-tab="url">🌐 网址导入</button>
        <button class="category-tab" data-tab="file">📁 文件导入</button>
        <button class="category-tab" data-tab="text">📋 粘贴文本</button>
        <button class="category-tab" data-tab="manual">✍️ 手动录入</button>
        <button class="category-tab" data-tab="manage">📦 管理已导入</button>
        <button class="category-tab" data-tab="backup">💾 备份/还原</button>
      </div>

      <!-- 网址导入 -->
      <div id="tab-url" class="import-tab" style="display:block;">
        <div class="card">
          <h3 style="margin-bottom:8px;">通过网址获取小说内容</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            输入小说章节页面的网址，系统会尝试获取页面内容并自动拆分章节。
            如果遇到跨域限制，请尝试使用代理或改用"粘贴文本"方式。
          </p>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="text" id="import-url" placeholder="https://example.com/novel/chapter.html"
              style="flex:1;padding:10px 14px;border-radius:8px;background:var(--input-bg);
                color:var(--text-primary);border:1px solid var(--border);font-size:14px;">
            <button class="btn btn-primary" id="fetch-url-btn">获取内容</button>
          </div>
          <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-muted);">
            <span>使用代理：</span>
            ${CORS_PROXIES.map((p, i) => `
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="radio" name="proxy" value="${i}" ${i === 0 ? 'checked' : ''}>
                ${p.name}
              </label>
            `).join('')}
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="radio" name="proxy" value="-1"> 不使用代理
            </label>
          </div>
          <div id="url-status" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- 文件导入 -->
      <div id="tab-file" class="import-tab" style="display:none;">
        <div class="card">
          <h3 style="margin-bottom:8px;">从文件导入小说</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            支持 .txt 文本文件，自动识别编码（UTF-8 / GBK / GB2312）。
            系统会自动按章节标记（如"第X章"）拆分内容。
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <label class="btn btn-primary" style="cursor:pointer;">
              📁 选择文件
              <input type="file" id="file-input" accept=".txt,.text,.html,.htm"
                style="display:none;">
            </label>
            <span id="file-name" style="font-size:13px;color:var(--text-muted);
              display:flex;align-items:center;">未选择文件</span>
            <span id="file-encoding" style="font-size:12px;color:var(--text-muted);
              display:flex;align-items:center;"></span>
          </div>
          <div style="margin-bottom:12px;">
            <span style="font-size:12px;color:var(--text-muted);">编码检测：</span>
            <select id="encoding-select" style="padding:4px 8px;border-radius:4px;
              background:var(--input-bg);color:var(--text-primary);border:1px solid var(--border);font-size:12px;">
              <option value="auto">自动检测</option>
              <option value="utf-8">UTF-8</option>
              <option value="gbk">GBK / GB2312</option>
              <option value="big5">Big5 繁体</option>
            </select>
            <span style="font-size:12px;color:var(--text-muted);margin-left:12px;">章节分隔：</span>
            <select id="split-pattern-select" style="padding:4px 8px;border-radius:4px;
              background:var(--input-bg);color:var(--text-primary);border:1px solid var(--border);font-size:12px;">
              <option value="auto">自动识别（第X章）</option>
              <option value="numbered">数字序号（1. 2. 3.）</option>
              <option value="none">不拆分（整本一章）</option>
            </select>
          </div>
          <div id="file-preview" style="display:none;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">
              文件大小：<b id="file-size"></b> &nbsp;|&nbsp;
              编码：<b id="file-detected-enc"></b> &nbsp;|&nbsp;
              识别章节：<b id="file-chapter-count"></b>
            </div>
            <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);
              border-radius:8px;margin-bottom:12px;" id="file-chapter-list"></div>
            <button class="btn btn-primary" id="import-file-btn">确认并导入</button>
          </div>
          <div id="file-status" style="margin-top:8px;"></div>
        </div>
      </div>

      <!-- 粘贴文本 -->
      <div id="tab-text" class="import-tab" style="display:none;">
        <div class="card">
          <h3 style="margin-bottom:8px;">粘贴文本自动拆分章节</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            将小说内容复制粘贴到下方，系统会自动识别"第X章"等章节标记进行拆分。
            也可以手动输入分隔标记。
          </p>
          <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
            <label style="font-size:13px;display:flex;align-items:center;gap:4px;">
              <input type="radio" name="split-mode" value="auto" checked> 自动识别（第X章 / Chapter X）
            </label>
            <label style="font-size:13px;display:flex;align-items:center;gap:4px;">
              <input type="radio" name="split-mode" value="custom"> 自定义分隔符
            </label>
            <input type="text" id="custom-separator" placeholder="如：第.*章"
              style="width:140px;padding:4px 8px;border-radius:4px;background:var(--input-bg);
                color:var(--text-primary);border:1px solid var(--border);font-size:12px;display:none;">
          </div>
          <textarea id="paste-content" rows="15" placeholder="在此粘贴小说内容...&#10;&#10;例如：&#10;第一章 开头&#10;正文内容...&#10;&#10;第二章 发展&#10;正文内容..."
            style="width:100%;padding:14px;border-radius:8px;background:var(--input-bg);
              color:var(--text-primary);border:1px solid var(--border);font-size:14px;
              resize:vertical;font-family:inherit;line-height:1.8;"></textarea>
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button class="btn btn-primary" id="analyze-text-btn">🔍 分析拆分</button>
            <span id="split-result" style="font-size:13px;color:var(--text-muted);display:flex;align-items:center;"></span>
          </div>
          <div id="chapter-preview" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- 手动录入 -->
      <div id="tab-manual" class="import-tab" style="display:none;">
        <div class="card">
          <h3 style="margin-bottom:8px;">手动录入小说信息与章节</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            手动填写小说基本信息，然后逐章添加内容。
          </p>
          ${renderMetadataForm()}
          <div style="margin-top:16px;">
            <h4 style="margin-bottom:8px;">章节列表 <span id="manual-chapter-count" style="font-size:12px;color:var(--text-muted);">(0章)</span></h4>
            <div id="manual-chapters"></div>
            <button class="btn btn-outline" id="add-chapter-btn" style="margin-top:8px;">+ 添加章节</button>
          </div>
          <button class="btn btn-primary" id="save-manual-btn" style="margin-top:16px;">💾 保存小说</button>
          <div id="manual-status" style="margin-top:8px;"></div>
        </div>
      </div>

      <!-- 管理已导入 -->
      <div id="tab-manage" class="import-tab" style="display:none;">
        ${renderManagePanel(importedNovels)}
      </div>

      <!-- 备份还原 -->
      <div id="tab-backup" class="import-tab" style="display:none;">
        <div class="card">
          <h3 style="margin-bottom:12px;">💾 备份与还原</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
            备份所有导入的小说（含章节内容）为 JSON 文件，或从备份文件还原。
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="export-backup-btn">📤 导出备份</button>
            <label class="btn btn-outline" style="cursor:pointer;">
              📥 从文件还原
              <input type="file" id="import-backup-file" accept=".json" style="display:none;">
            </label>
          </div>
          <div id="backup-status" style="margin-top:12px;font-size:13px;"></div>
        </div>
      </div>

      <!-- 元数据编辑弹窗（URL和粘贴模式共用） -->
      <div id="metadata-modal" style="display:none;">
        <div class="catalog-overlay show" id="metadata-overlay"></div>
        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
          background:var(--card-bg);border-radius:12px;padding:24px;z-index:2001;
          max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.3);">
          <h3 style="margin-bottom:16px;">确认小说信息</h3>
          <div id="metadata-form-content"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-outline" id="metadata-cancel">取消</button>
            <button class="btn btn-primary" id="metadata-save">💾 确认导入</button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindImportEvents();
}

// ===== 元数据表单 =====
function renderMetadataForm(prefix = '') {
  return `
    <div class="metadata-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">
            书名 <span style="color:var(--accent);">*</span>
          </label>
          <input type="text" id="${prefix}novel-title" placeholder="输入小说书名"
            style="width:100%;padding:10px 12px;border-radius:6px;background:var(--input-bg);
              color:var(--text-primary);border:1px solid var(--border);font-size:14px;">
        </div>
        <div>
          <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">作者</label>
          <input type="text" id="${prefix}novel-author" placeholder="输入作者名"
            style="width:100%;padding:10px 12px;border-radius:6px;background:var(--input-bg);
              color:var(--text-primary);border:1px solid var(--border);font-size:14px;">
        </div>
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">分类</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${CATEGORIES.map(c => `
            <label style="display:flex;align-items:center;gap:3px;font-size:13px;
              padding:4px 10px;border-radius:16px;cursor:pointer;
              background:var(--bg-tertiary);color:var(--text-secondary);">
              <input type="radio" name="${prefix}novel-category" value="${c}" ${c === 'fantasy' ? 'checked' : ''}>
              ${getCategoryName(c)}
            </label>
          `).join('')}
        </div>
      </div>
      <div style="margin-top:12px;">
        <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">简介</label>
        <textarea id="${prefix}novel-intro" rows="3" placeholder="输入小说简介（可选）"
          style="width:100%;padding:10px 12px;border-radius:6px;background:var(--input-bg);
            color:var(--text-primary);border:1px solid var(--border);font-size:13px;
            resize:vertical;font-family:inherit;"></textarea>
      </div>
    </div>
  `;
}

// ===== 管理面板 =====
function renderManagePanel(novels) {
  if (novels.length === 0) {
    return `
      <div class="card">
        <div class="empty-state">
          <span class="icon">📭</span>
          <p>还没有导入任何小说</p>
        </div>
      </div>`;
  }

  const published = novels.filter(n => n.status !== 'unpublished').length;
  const unpublished = novels.filter(n => n.status === 'unpublished').length;

  return `
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
      共 ${novels.length} 本（已上架 ${published} 本${unpublished > 0 ? `，已下架 ${unpublished} 本` : ''}）
    </div>
    <div class="novel-list">
      ${novels.map(n => {
        const isOffline = n.status === 'unpublished';
        const chapterCount = n.totalChapters || 0;
        return `
          <div class="novel-list-item" style="align-items:center;${isOffline ? 'opacity:0.6;' : ''}">
            <div class="cover-sm" onclick="window.location.hash='#/novel/${n.id}'"
              style="cursor:pointer;">
              <span style="font-size:1.5rem;">${isOffline ? '🚫' : '📥'}</span>
            </div>
            <div class="info" onclick="window.location.hash='#/novel/${n.id}'"
              style="cursor:pointer;">
              <div class="title">
                ${n.title}
                ${isOffline ? '<span style="font-size:11px;color:var(--accent);margin-left:6px;">[已下架]</span>' : ''}
              </div>
              <div class="meta">
                <span>✍️ ${n.author || '未知'}</span>
                <span>📂 ${getCategoryName(n.category)}</span>
                <span>📄 ${chapterCount}章</span>
                <span>🕐 ${new Date(n.importedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;align-items:center;">
              <button class="btn btn-outline toggle-status-btn" data-id="${n.id}"
                style="padding:6px 12px;font-size:12px;white-space:nowrap;">
                ${isOffline ? '🔄 重新上架' : '⬇ 下架'}
              </button>
              <button class="btn btn-outline edit-imported-btn" data-id="${n.id}"
                style="padding:6px 12px;font-size:12px;">追加章节</button>
              <button class="remove-bookmark-btn delete-imported-btn" data-id="${n.id}"
                style="color:var(--accent);" title="删除">🗑</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ===== 事件绑定 =====
function bindImportEvents() {
  // ---- 标签切换 ----
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.import-tab').forEach(t => t.style.display = 'none');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });

  // ---- 剪切模式切换 ----
  document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const customInput = document.getElementById('custom-separator');
      customInput.style.display = radio.value === 'custom' ? 'inline-block' : 'none';
    });
  });

  // ---- 网址导入 ----
  document.getElementById('fetch-url-btn').addEventListener('click', fetchFromUrl);
  document.getElementById('import-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchFromUrl();
  });

  // ---- 文件导入 ----
  document.getElementById('file-input').addEventListener('change', handleFileSelect);
  document.getElementById('encoding-select').addEventListener('change', () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length > 0) handleFileSelect();
  });
  document.getElementById('split-pattern-select').addEventListener('change', () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length > 0) handleFileSelect();
  });

  // ---- 文本分析 ----
  document.getElementById('analyze-text-btn').addEventListener('click', analyzePastedText);

  // ---- 手动录入 ----
  document.getElementById('add-chapter-btn').addEventListener('click', addManualChapter);
  document.getElementById('save-manual-btn').addEventListener('click', saveManualNovel);
  // 初始化一个空章节
  addManualChapter();

  // ---- 备份还原 ----
  document.getElementById('export-backup-btn').addEventListener('click', exportBackup);
  document.getElementById('import-backup-file').addEventListener('change', importBackup);

  // ---- 管理面板 ----
  document.querySelectorAll('.edit-imported-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAppendChapterUI(btn.dataset.id);
    });
  });
  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const novelId = btn.dataset.id;
      const novel = getImportedNovels().find(n => n.id === novelId);
      const isUnpublished = novel?.status === 'unpublished';
      if (isUnpublished) {
        publishNovel(novelId);
        showToast('✅ 已重新上架');
      } else {
        if (confirm('确定下架这本小说吗？下架后不会出现在书架和搜索结果中，但仍保留数据。')) {
          unpublishNovel(novelId);
          showToast('⬇ 已下架');
        }
      }
      renderImport();
    });
  });

  document.querySelectorAll('.delete-imported-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('确定删除这本导入的小说吗？此操作不可恢复。')) {
        removeImportedNovel(btn.dataset.id);
        showToast('已删除');
        renderImport();
      }
    });
  });

  // ---- 元数据弹窗 ----
  document.getElementById('metadata-cancel').addEventListener('click', closeMetadataModal);
  document.getElementById('metadata-overlay').addEventListener('click', closeMetadataModal);
}

// ===== 网址获取 =====
async function fetchFromUrl() {
  const urlInput = document.getElementById('import-url');
  const statusDiv = document.getElementById('url-status');
  const url = urlInput.value.trim();

  if (!url) {
    statusDiv.innerHTML = '<span style="color:var(--accent);">请输入网址</span>';
    return;
  }

  statusDiv.innerHTML = '<span style="color:var(--text-secondary);">⏳ 正在获取内容...</span>';

  try {
    let html = null;
    const proxyIdx = document.querySelector('input[name="proxy"]:checked')?.value;

    // 先尝试直接获取
    if (proxyIdx === '-1') {
      try {
        const resp = await fetch(url);
        html = await resp.text();
      } catch (directErr) {
        statusDiv.innerHTML = `
          <span style="color:var(--accent);">❌ 直接获取失败（可能是跨域限制），请尝试使用代理。</span>`;
        return;
      }
    } else {
      // 使用代理
      const proxy = CORS_PROXIES[parseInt(proxyIdx)];
      const proxyUrl = proxy.url + encodeURIComponent(url);
      const resp = await fetch(proxyUrl);
      html = await resp.text();
    }

    if (!html) {
      statusDiv.innerHTML = '<span style="color:var(--accent);">❌ 未能获取到内容</span>';
      return;
    }

    // 提取文本内容
    const text = extractTextFromHtml(html);
    if (!text || text.length < 50) {
      statusDiv.innerHTML = '<span style="color:var(--accent);">❌ 提取到的内容太少，请检查网址是否正确</span>';
      return;
    }

    // 自动拆分章节
    const chapters = splitChapters(text, 'auto', '');
    statusDiv.innerHTML = `
      <span style="color:#27ae60;">✅ 成功获取！识别到 <b>${chapters.length}</b> 个章节，
        共 <b>${text.length}</b> 字</span>
      <button class="btn btn-primary" id="preview-url-chapters-btn"
        style="margin-left:12px;padding:6px 16px;font-size:13px;">预览并导入</button>
    `;

    // 预览按钮
    document.getElementById('preview-url-chapters-btn').addEventListener('click', () => {
      showMetadataModal(chapters, { title: '', author: '', category: 'fantasy', intro: '' });
    });
  } catch (err) {
    console.error('获取失败:', err);
    statusDiv.innerHTML = `<span style="color:var(--accent);">❌ 获取失败：${err.message}</span>`;
  }
}

// ===== 文件导入处理 =====
async function handleFileSelect() {
  const fileInput = document.getElementById('file-input');
  const fileNameEl = document.getElementById('file-name');
  const fileEncEl = document.getElementById('file-encoding');
  const previewDiv = document.getElementById('file-preview');
  const statusDiv = document.getElementById('file-status');
  const file = fileInput.files[0];

  if (!file) return;

  fileNameEl.textContent = file.name;
  fileEncEl.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
  statusDiv.innerHTML = '<span style="color:var(--text-secondary);">⏳ 正在读取文件...</span>';
  previewDiv.style.display = 'none';

  const encodingSelect = document.getElementById('encoding-select');
  const selectedEncoding = encodingSelect.value || 'auto';

  try {
    // 显示处理进度
    statusDiv.innerHTML = '<span style="color:var(--text-secondary);">⏳ 正在解析文本...</span>';

    let text;
    if (selectedEncoding === 'auto') {
      text = await readFileWithAutoEncoding(file);
    } else {
      text = await readFileWithEncoding(file, selectedEncoding);
    }

    if (!text || text.length < 20) {
      statusDiv.innerHTML = '<span style="color:var(--accent);">❌ 文件内容太少，无法导入</span>';
      return;
    }

    statusDiv.innerHTML = `<span style="color:var(--text-secondary);">⏳ 正在拆分章节...（${(text.length / 1024).toFixed(0)}KB）</span>`;

    // 对超大文本使用 setTimeout 分段处理，避免阻塞 UI
    const splitMode = document.getElementById('split-pattern-select').value;
    let chapters;

    if (text.length > 1000000) {
      // >1MB：使用 requestIdleCallback 或 setTimeout 分片处理
      chapters = await processLargeText(text, splitMode, statusDiv);
    } else {
      chapters = splitChapters(text, splitMode, '');
    }

    // 显示预览
    document.getElementById('file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    document.getElementById('file-detected-enc').textContent = selectedEncoding === 'auto' ? '自动检测' : selectedEncoding.toUpperCase();
    document.getElementById('file-chapter-count').textContent = `${chapters.length} 章`;

    let chapterListHtml;
    if (chapters.length === 0) {
      chapterListHtml = '<div style="padding:12px;color:var(--text-muted);">未识别到章节，整个文件将作为一章导入</div>';
    } else {
      chapterListHtml = chapters.slice(0, 30).map((ch, i) => `
        <div style="padding:8px 14px;border-bottom:1px solid var(--divider);
          display:flex;justify-content:space-between;align-items:center;font-size:13px;
          ${i === 0 ? 'background:var(--accent-light);' : ''}">
          <span><b>#${i + 1}</b> ${ch.title}</span>
          <span style="font-size:11px;color:var(--text-muted);">${ch.content.replace(/<[^>]+>/g, '').length} 字</span>
        </div>
      `).join('');
      if (chapters.length > 30) {
        chapterListHtml += `<div style="padding:8px 14px;color:var(--text-muted);font-size:12px;">... 还有 ${chapters.length - 30} 章</div>`;
      }
    }
    document.getElementById('file-chapter-list').innerHTML = chapterListHtml;
    previewDiv.style.display = 'block';
    statusDiv.innerHTML = '<span style="color:#27ae60;">✅ 文件读取成功</span>';

    // 存储解析结果供导入使用
    previewDiv.dataset.chapters = JSON.stringify(chapters.length > 0 ? chapters : [{ title: '第一章', content: text }]);

    // 尝试从文件名猜测书名
    const guessedTitle = file.name.replace(/\.(txt|text|html|htm)$/i, '').replace(/[_\-\s]+/g, ' ').trim();

    // 绑定导入按钮
    const importBtn = document.getElementById('import-file-btn');
    const newImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(newImportBtn, importBtn);
    newImportBtn.addEventListener('click', () => {
      const parsedChapters = JSON.parse(previewDiv.dataset.chapters || '[]');
      showMetadataModal(parsedChapters, {
        title: guessedTitle,
        author: '',
        category: 'fantasy',
        intro: '',
      });
    });

  } catch (err) {
    console.error('文件读取失败:', err);
    statusDiv.innerHTML = `<span style="color:var(--accent);">❌ 文件读取失败：${err.message}。请尝试手动选择编码格式。</span>`;
  }
}

/**
 * 自动检测编码并读取文件
 */
function readFileWithAutoEncoding(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 先尝试 UTF-8
    reader.onload = () => {
      const text = reader.result;
      // 检测是否有乱码（GBK 的特征是出现大量 � 或不可识别字符）
      const replacementChars = (text.match(/�/g) || []).length;
      const totalChars = text.length;
      const ratio = replacementChars / Math.max(totalChars, 1);

      if (ratio > 0.01) {
        // 可能是 GBK，用 GBK 重新读取
        readFileWithEncoding(file, 'gbk').then(resolve).catch(() => {
          // GBK 也失败，尝试 Big5
          readFileWithEncoding(file, 'big5').then(resolve).catch(() => {
            // 都失败，返回原始 UTF-8 结果
            resolve(text);
          });
        });
      } else {
        resolve(text);
      }
    };
    reader.onerror = () => reject(new Error('无法读取文件'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 用指定编码读取文件
 */
function readFileWithEncoding(file, encoding) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`无法用 ${encoding} 编码读取`));

    // 映射编码名称
    const encMap = {
      'gbk': 'gb2312',
      'big5': 'big5',
      'utf-8': 'utf-8',
    };
    reader.readAsText(file, encMap[encoding] || encoding);
  });
}

/**
 * 分片处理超大文本（>1MB），避免阻塞 UI
 * 每处理 200KB 就 yield 给浏览器
 */
async function processLargeText(text, splitMode, statusDiv) {
  const CHUNK = 200000; // 200KB per chunk
  const allChapters = [];
  let offset = 0;
  let chunkIdx = 0;
  const totalChunks = Math.ceil(text.length / CHUNK);

  while (offset < text.length) {
    // 在分块边界找到最近的换行符，避免切断章节标题
    let end = Math.min(offset + CHUNK, text.length);
    if (end < text.length) {
      const nlPos = text.lastIndexOf('\n', end);
      if (nlPos > offset + CHUNK * 0.5) {
        end = nlPos;
      }
    }

    const chunk = text.slice(offset, end);
    const chunkChapters = splitChapters(chunk, splitMode, '');

    // 合并相邻块的章节（第一个章节可能是上一块的延续）
    if (allChapters.length > 0 && chunkChapters.length > 0) {
      // 如果上一块的最后一个章节内容很短，可能是被切断了标题
      const last = allChapters[allChapters.length - 1];
      const first = chunkChapters[0];
      // 简单策略：将第一块的内容追加到上一块
      last.content += '\n' + first.content;
      // 移除第一块
      chunkChapters.shift();
    }

    for (const ch of chunkChapters) {
      allChapters.push(ch);
    }

    offset = end;
    chunkIdx++;

    if (statusDiv) {
      const pct = Math.round((chunkIdx / totalChunks) * 100);
      statusDiv.innerHTML = `<span style="color:var(--text-secondary);">⏳ 正在拆分章节... ${pct}%</span>`;
    }

    // yield 给浏览器，保持 UI 响应
    await new Promise(r => setTimeout(r, 0));
  }

  return allChapters;
}

/**
 * 按模式拆分章节（用于文件导入的旧接口，实际走 splitChapters）
 */
function splitChaptersByPattern(text, pattern) {
  if (!pattern) {
    return splitChapters(text, 'auto', '');
  }
  return doRegexSplit(text, pattern);
}

// ===== 从HTML提取文本 =====
function extractTextFromHtml(html) {
  // 移除 script 和 style
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  // 移除HTML标签
  text = text.replace(/<[^>]+>/g, '\n');
  // 解码实体
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#\d+;/g, '');
  // 清理空白
  text = text.replace(/\r/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  // 去除首尾空白
  text = text.trim();
  return text;
}

// ===== 快速字符串扫描拆分章节（避免正则回溯卡死） =====
function splitChapters(text, mode, customSep) {
  if (!text || text.length < 20) return [];

  // 使用字符串 indexOf 扫描，替代正则
  // 在大文本上正则 (?:^|\n)\s*((?:第[零一二三四五六七八九十百千万\d]+... 会灾难性回溯
  const chapters = [];

  if (mode === 'custom' && customSep) {
    // 自定义分隔符 — 仍用正则但对大文本分段处理
    return splitChaptersByCustomPattern(text, customSep);
  }

  // 快速扫描：逐行检测章节标题
  const lines = text.split('\n');
  let currentTitle = '';
  let currentContent = [];
  let foundFirst = false;

  const chineseNums = '零一二三四五六七八九十百千万';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (foundFirst) currentContent.push('');
      continue;
    }

    // 检测是否为新章节标题
    const isChapterHead = isChapterTitle(line, chineseNums);

    if (isChapterHead) {
      // 保存上一章
      if (foundFirst && currentContent.length > 0) {
        chapters.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
        });
      }
      currentTitle = line;
      currentContent = [];
      foundFirst = true;
    } else if (foundFirst) {
      currentContent.push(line);
    } else {
      // 还没找到第一章，文本可能是前言或没有章节标记
      currentContent.push(line);
    }
  }

  // 最后一章
  if (foundFirst && currentContent.length > 0) {
    chapters.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
    });
  }

  // 没有识别到任何章节
  if (chapters.length === 0 && text.trim().length > 0) {
    chapters.push({ title: '第一章', content: text.trim() });
  }

  // 清理和过滤
  return chapters.filter(c => c.content.length > 20);
}

/**
 * 判断一行是否是章节标题（纯字符串扫描，无正则回溯）
 */
function isChapterTitle(line, chineseNums) {
  if (line.length > 80 || line.length < 2) return false;

  // 中文"第X章" / "第X节" / "第X卷" 模式
  if (line.startsWith('第')) {
    let idx = 1;
    // 扫描数字部分
    while (idx < line.length && idx < 30) {
      const ch = line[idx];
      if (ch >= '0' && ch <= '9') { idx++; continue; }
      if (chineseNums.includes(ch)) { idx++; continue; }
      if (ch === '十' || ch === '百' || ch === '千' || ch === '万') { idx++; continue; }
      break;
    }
    if (idx > 1 && idx < line.length) {
      const next = line[idx];
      if (next === '章' || next === '节' || next === '卷' || next === '部' || next === '回') {
        return true;
      }
    }
  }

  // "Chapter X" 模式
  if (line.toLowerCase().startsWith('chapter')) {
    const rest = line.slice(7).trim();
    if (/^\d/.test(rest)) return true;
  }

  // "X. " / "X、" 模式（纯数字开头）
  if (line.length < 50 && /^\d{1,4}[\.、]\s*[^\d]/.test(line)) {
    return true;
  }

  return false;
}

/**
 * 自定义正则模式拆分（对超长文本分段处理）
 */
function splitChaptersByCustomPattern(text, customSep) {
  let regex;
  try {
    regex = new RegExp(customSep, 'gm');
  } catch {
    showToast('自定义分隔符格式无效');
    return [];
  }

  // 对超长文本(>1MB)分块处理，每 500KB 一块
  const CHUNK_SIZE = 500000;
  if (text.length <= CHUNK_SIZE) {
    return doRegexSplit(text, regex);
  }

  // 分块处理
  const chapters = [];
  let offset = 0;
  while (offset < text.length) {
    const chunk = text.slice(offset, offset + CHUNK_SIZE);
    const chunkChapters = doRegexSplit(chunk, regex);
    // 调整标题避免重复
    for (const ch of chunkChapters) {
      chapters.push(ch);
    }
    offset += CHUNK_SIZE;
  }

  return chapters;
}

function doRegexSplit(text, regex) {
  const splits = [];
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx && splits.length > 0) {
      splits[splits.length - 1].content = text.slice(lastIdx, match.index).trim();
    }
    splits.push({ title: match[1].trim(), content: '' });
    lastIdx = match.index + match[0].length;
  }

  if (splits.length > 0 && lastIdx < text.length) {
    splits[splits.length - 1].content = text.slice(lastIdx).trim();
  }

  return splits.filter(s => s.content && s.content.length > 20);
}

// ===== 分析粘贴文本 =====
function analyzePastedText() {
  const textarea = document.getElementById('paste-content');
  const resultSpan = document.getElementById('split-result');
  const previewDiv = document.getElementById('chapter-preview');
  const text = textarea.value.trim();

  if (!text) {
    resultSpan.innerHTML = '<span style="color:var(--accent);">请先粘贴内容</span>';
    return;
  }

  const mode = document.querySelector('input[name="split-mode"]:checked')?.value || 'auto';
  const customSep = document.getElementById('custom-separator').value;

  const chapters = splitChapters(text, mode, customSep);

  resultSpan.innerHTML = `<span style="color:#27ae60;">✅ 识别到 <b>${chapters.length}</b> 个章节</span>`;

  if (chapters.length === 0) {
    previewDiv.innerHTML = '';
    return;
  }

  previewDiv.innerHTML = `
    <div style="margin-top:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
      <div style="max-height:300px;overflow-y:auto;">
        ${chapters.map((ch, i) => `
          <div style="padding:10px 14px;border-bottom:1px solid var(--divider);
            display:flex;justify-content:space-between;align-items:center;
            ${i === 0 ? 'background:var(--accent-light);' : ''}">
            <span style="font-size:13px;">
              <b>#${i + 1}</b> ${ch.title}
            </span>
            <span style="font-size:11px;color:var(--text-muted);">
              ${ch.content.replace(/<[^>]+>/g, '').length} 字
            </span>
          </div>
        `).join('')}
      </div>
    </div>
    <button class="btn btn-primary" id="import-split-btn" style="margin-top:12px;">
      确认并导入这 ${chapters.length} 章
    </button>
  `;

  // 绑定导入按钮
  document.getElementById('import-split-btn').addEventListener('click', () => {
    showMetadataModal(chapters, { title: '', author: '', category: 'fantasy', intro: '' });
  });
}

// ===== 元数据弹窗 =====
function showMetadataModal(chapters, defaultMeta) {
  const modal = document.getElementById('metadata-modal');
  const formContent = document.getElementById('metadata-form-content');

  // 尝试从第一章标题推断书名
  let guessedTitle = defaultMeta.title;
  if (!guessedTitle && chapters.length > 0) {
    guessedTitle = chapters[0].title.replace(/第[零一二三四五六七八九十百千万\d]+[章节卷]/, '').trim();
    if (!guessedTitle || guessedTitle.length < 1) guessedTitle = '';
  }

  formContent.innerHTML = renderMetadataForm('modal-');

  // 填充默认值
  document.getElementById('modal-novel-title').value = guessedTitle;
  document.getElementById('modal-novel-author').value = defaultMeta.author;

  // 存储章节数据
  formContent.dataset.chapters = JSON.stringify(chapters);

  modal.style.display = 'block';

  // 保存按钮
  const saveBtn = document.getElementById('metadata-save');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.addEventListener('click', () => {
    const title = document.getElementById('modal-novel-title').value.trim();
    if (!title) {
      showToast('请输入书名');
      return;
    }
    const author = document.getElementById('modal-novel-author').value.trim();
    const category = document.querySelector('input[name="modal-novel-category"]:checked')?.value || 'fantasy';
    const intro = document.getElementById('modal-novel-intro').value.trim();

    const parsedChapters = JSON.parse(formContent.dataset.chapters || '[]');

    // 保存（异步 IndexedDB）
    saveImportedNovelData(title, author, category, intro, parsedChapters, null);
    closeMetadataModal();
    renderImport();
    showToast(`✅ 《${title}》导入成功！`);
  });
}

function closeMetadataModal() {
  document.getElementById('metadata-modal').style.display = 'none';
}

// ===== 保存导入的小说 =====
async function saveImportedNovelData(title, author, category, intro, rawChapters, existingId) {
  const novelId = existingId || ('import_' + Date.now());

  // 将纯文本章节转为HTML格式
  const chapters = rawChapters.map((ch, i) => ({
    chapterNum: ch.chapterNum || i + 1,
    title: ch.title || `第${i + 1}章`,
    content: ch.content.includes('<p>')
      ? ch.content
      : ch.content.split('\n').filter(l => l.trim()).map(l => `<p>${l.trim()}</p>`).join('\n'),
  }));

  const novel = {
    id: novelId,
    title,
    author: author || '佚名',
    cover: '',
    category,
    intro: intro || '用户导入的小说',
    totalChapters: chapters.length,
    status: 'ongoing',
    wordCount: chapters.reduce((sum, c) => sum + c.content.replace(/<[^>]+>/g, '').length, 0),
    updateTime: new Date().toISOString().split('T')[0],
    tags: ['导入'],
    importedAt: existingId
      ? (getImportedNovels().find(n => n.id === novelId)?.importedAt || Date.now())
      : Date.now(),
  };

  addImportedNovel(novel);
  // IndexedDB 写入（异步）
  await saveImportedChapters(novelId, chapters);
}

// ===== 手动录入 =====
function addManualChapter() {
  const container = document.getElementById('manual-chapters');
  const idx = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'manual-chapter-item';
  div.style.cssText = 'background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid var(--border);';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">#${idx}</span>
      <input type="text" class="manual-chapter-title" placeholder="章节标题，如：第一章 开端"
        style="flex:1;padding:8px 10px;border-radius:6px;background:var(--input-bg);
          color:var(--text-primary);border:1px solid var(--border);font-size:13px;"
        value="第${idx}章">
      <button class="remove-chapter-btn" style="background:none;color:var(--accent);
        font-size:18px;cursor:pointer;padding:0 4px;" title="删除此章">✕</button>
    </div>
    <textarea class="manual-chapter-content" rows="6" placeholder="章节正文内容..."
      style="width:100%;padding:10px;border-radius:6px;background:var(--input-bg);
        color:var(--text-primary);border:1px solid var(--border);font-size:14px;
        resize:vertical;font-family:inherit;line-height:1.8;"></textarea>
  `;
  container.appendChild(div);

  // 绑定删除按钮
  div.querySelector('.remove-chapter-btn').addEventListener('click', () => {
    div.remove();
    updateManualChapterNumbers();
  });

  updateManualChapterNumbers();
}

function updateManualChapterNumbers() {
  const items = document.querySelectorAll('.manual-chapter-item');
  document.getElementById('manual-chapter-count').textContent = `(${items.length}章)`;
  items.forEach((item, i) => {
    item.querySelector('span').textContent = `#${i + 1}`;
  });
}

function saveManualNovel() {
  const title = document.getElementById('novel-title').value.trim();
  if (!title) {
    showToast('请输入书名');
    return;
  }
  const author = document.getElementById('novel-author').value.trim();
  const category = document.querySelector('input[name="novel-category"]:checked')?.value || 'fantasy';
  const intro = document.getElementById('novel-intro').value.trim();

  const chapters = [];
  document.querySelectorAll('.manual-chapter-item').forEach(item => {
    const titleEl = item.querySelector('.manual-chapter-title');
    const contentEl = item.querySelector('.manual-chapter-content');
    const t = titleEl?.value?.trim();
    const c = contentEl?.value?.trim();
    if (c) {
      chapters.push({ title: t || `第${chapters.length + 1}章`, content: c });
    }
  });

  if (chapters.length === 0) {
    showToast('请至少添加一个章节');
    return;
  }

  saveImportedNovelData(title, author, category, intro, chapters, null);
  renderImport();
  showToast(`✅ 《${title}》导入成功！`);
}

// ===== 追加章节 =====
function showAppendChapterUI(novelId) {
  const imported = getImportedNovels().find(n => n.id === novelId);
  if (!imported) return;

  const existingChapters = getImportedChapters(novelId);
  const startNum = existingChapters.length + 1;

  renderImport();
  // 切换到手动录入标签
  setTimeout(() => {
    document.querySelectorAll('.category-tab').forEach(t => {
      t.classList.remove('active');
      if (t.dataset.tab === 'manual') t.classList.add('active');
    });
    document.querySelectorAll('.import-tab').forEach(t => t.style.display = 'none');
    const manualTab = document.getElementById('tab-manual');
    if (manualTab) manualTab.style.display = 'block';

    // 填充已有信息
    document.getElementById('novel-title').value = imported.title;
    document.getElementById('novel-author').value = imported.author || '';
    document.getElementById('novel-intro').value = imported.intro || '';
    const catRadio = document.querySelector(`input[name="novel-category"][value="${imported.category}"]`);
    if (catRadio) catRadio.checked = true;
    document.getElementById('novel-title').disabled = true;

    // 清理章节并添加新章节
    document.getElementById('manual-chapters').innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const container = document.getElementById('manual-chapters');
      const div = document.createElement('div');
      div.className = 'manual-chapter-item';
      div.style.cssText = 'background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid var(--border);';
      div.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">#${startNum + i}</span>
          <input type="text" class="manual-chapter-title" placeholder="章节标题"
            style="flex:1;padding:8px 10px;border-radius:6px;background:var(--input-bg);
              color:var(--text-primary);border:1px solid var(--border);font-size:13px;"
            value="第${startNum + i}章">
          <button class="remove-chapter-btn" style="background:none;color:var(--accent);
            font-size:18px;cursor:pointer;padding:0 4px;">✕</button>
        </div>
        <textarea class="manual-chapter-content" rows="6" placeholder="章节正文内容..."
          style="width:100%;padding:10px;border-radius:6px;background:var(--input-bg);
            color:var(--text-primary);border:1px solid var(--border);font-size:14px;
            resize:vertical;font-family:inherit;line-height:1.8;"></textarea>
      `;
      container.appendChild(div);
      div.querySelector('.remove-chapter-btn').addEventListener('click', () => {
        div.remove();
        updateManualChapterNumbers();
      });
    }
    updateManualChapterNumbers();

    // 修改保存按钮行为
    const saveBtn = document.getElementById('save-manual-btn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => {
      const chapters = [];
      document.querySelectorAll('.manual-chapter-item').forEach((item, i) => {
        const contentEl = item.querySelector('.manual-chapter-content');
        const titleEl = item.querySelector('.manual-chapter-title');
        const c = contentEl?.value?.trim();
        const t = titleEl?.value?.trim();
        if (c) {
          chapters.push({ chapterNum: startNum + i, title: t || `第${startNum + i}章`, content: c });
        }
      });
      if (chapters.length > 0) {
        const allChapters = [...existingChapters, ...chapters];
        appendImportedChapters(novelId, chapters);

        // 更新元数据
        const updated = {
          ...imported,
          totalChapters: allChapters.length,
          wordCount: allChapters.reduce((s, c) => s + (c.content ? c.content.replace(/<[^>]+>/g, '').length : 0), 0),
          updateTime: new Date().toISOString().split('T')[0],
        };
        addImportedNovel(updated);
        showToast(`✅ 已追加 ${chapters.length} 章到《${imported.title}》`);
        renderImport();
      }
    });
  }, 100);
}

// ===== 备份还原 =====
async function exportBackup() {
  const data = await exportImportedAll();
  if (data.length === 0) {
    showToast('没有可备份的内容');
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novel-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  document.getElementById('backup-status').innerHTML =
    `<span style="color:#27ae60;">✅ 已导出 ${data.length} 本小说</span>`;
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('格式错误');
      importFromBackup(data);
      document.getElementById('backup-status').innerHTML =
        `<span style="color:#27ae60;">✅ 已还原 ${data.length} 本小说</span>`;
      showToast(`✅ 已还原 ${data.length} 本小说`);
      renderImport();
    } catch {
      document.getElementById('backup-status').innerHTML =
        '<span style="color:var(--accent);">❌ 备份文件格式错误</span>';
    }
  };
  reader.readAsText(file);
}
