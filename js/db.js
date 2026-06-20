// ===== IndexedDB 存储层 =====
// 替代 localStorage 存储章节内容，突破 5MB 限制
// IndexedDB 通常有 50MB~硬盘剩余空间的配额

const DB_NAME = 'NovelReaderDB';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 章节内容表：novelId + chapterNum 作为复合主键
      if (!db.objectStoreNames.contains('chapters')) {
        const store = db.createObjectStore('chapters', { keyPath: ['novelId', 'chapterNum'] });
        store.createIndex('novelId', 'novelId', { unique: false });
      }

      // 小说元数据表（导入的小说）
      if (!db.objectStoreNames.contains('novels')) {
        db.createObjectStore('novels', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });

  return dbPromise;
}

// ===== 章节操作 =====

/**
 * 批量保存章节（使用事务，速度远快于逐条写入）
 */
export async function saveChapters(novelId, chapters) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');

    // 先删除旧章节
    const index = store.index('novelId');
    const cursorReq = index.openCursor(IDBKeyRange.only(novelId));

    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    cursorReq.onerror = () => {
      // 继续，添加新章节
    };

    tx.oncomplete = () => {
      // 旧数据删除完毕，开始写入新章节
      const tx2 = db.transaction('chapters', 'readwrite');
      const store2 = tx2.objectStore('chapters');

      for (const ch of chapters) {
        store2.put({
          novelId,
          chapterNum: ch.chapterNum,
          title: ch.title,
          content: ch.content,
        });
      }

      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    };

    tx.onerror = () => {
      // 删除阶段出错，直接尝试写入
      const tx2 = db.transaction('chapters', 'readwrite');
      const store2 = tx2.objectStore('chapters');

      for (const ch of chapters) {
        store2.put({
          novelId,
          chapterNum: ch.chapterNum,
          title: ch.title,
          content: ch.content,
        });
      }

      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    };
  });
}

/**
 * 追加章节
 */
export async function appendChapters(novelId, chapters) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');

    for (const ch of chapters) {
      store.put({
        novelId,
        chapterNum: ch.chapterNum,
        title: ch.title,
        content: ch.content,
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取小说的所有章节
 */
export async function getChapters(novelId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const index = store.index('novelId');
    const request = index.getAll(novelId);

    request.onsuccess = () => {
      // 按章节号排序
      const chapters = (request.result || []).sort((a, b) => a.chapterNum - b.chapterNum);
      resolve(chapters);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取单个章节
 */
export async function getChapter(novelId, chapterNum) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const request = store.get([novelId, chapterNum]);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除小说的所有章节
 */
export async function deleteChapters(novelId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');
    const index = store.index('novelId');
    const request = index.openCursor(IDBKeyRange.only(novelId));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取小说章节总数
 */
export async function getChapterCount(novelId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const index = store.index('novelId');
    const request = index.count(novelId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ===== 小说元数据操作 =====

/**
 * 保存/更新小说元数据
 */
export async function saveNovelMeta(novel) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('novels', 'readwrite');
    const store = tx.objectStore('novels');
    store.put(novel);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取所有导入的小说元数据
 */
export async function getAllNovelMetas() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('novels', 'readonly');
    const store = tx.objectStore('novels');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 获取单个小说元数据
 */
export async function getNovelMeta(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('novels', 'readonly');
    const store = tx.objectStore('novels');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 删除小说元数据
 */
export async function deleteNovelMeta(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('novels', 'readwrite');
    const store = tx.objectStore('novels');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取全部数据导出（含章节）
 */
export async function exportAllData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['novels', 'chapters'], 'readonly');
    const novelStore = tx.objectStore('novels');
    const chapterStore = tx.objectStore('chapters');

    const novelsReq = novelStore.getAll();
    const chaptersReq = chapterStore.getAll();

    let novels = [];
    let chapters = [];

    novelsReq.onsuccess = () => { novels = novelsReq.result || []; };
    chaptersReq.onsuccess = () => { chapters = chaptersReq.result || []; };

    tx.oncomplete = () => {
      const result = novels.map(n => ({
        ...n,
        chapters: chapters
          .filter(c => c.novelId === n.id)
          .sort((a, b) => a.chapterNum - b.chapterNum)
          .map(c => ({ chapterNum: c.chapterNum, title: c.title, content: c.content })),
      }));
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 从备份导入全部数据
 */
export async function importAllData(data) {
  if (!Array.isArray(data)) return;

  const db = await openDB();

  for (const novel of data) {
    const { chapters, ...meta } = novel;

    // 写入元数据
    await new Promise((resolve, reject) => {
      const tx = db.transaction('novels', 'readwrite');
      tx.objectStore('novels').put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 写入章节
    if (chapters && chapters.length > 0) {
      await saveChapters(meta.id, chapters);
    }
  }
}

/**
 * 获取数据库存储使用量估算（MB）
 */
export async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: (estimate.usage / 1024 / 1024).toFixed(1),
      quota: (estimate.quota / 1024 / 1024).toFixed(1),
    };
  }
  return null;
}
