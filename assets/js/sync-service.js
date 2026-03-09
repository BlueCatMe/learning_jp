/**
 * Meow! 日本語達陣 - Google Drive Sync Service
 * 負責跨裝置同步 LocalStorage 進度。
 */

const SYNC_CONFIG = {
    CLIENT_ID: '501015149422-vkm4b8badtsc1rbf5ikh7r98ogeoar0g.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    FILE_NAME: 'learning_jp_sync_v2026.json'
};

let gapiInited = false;
let gisInited = false;
let tokenClient;
let accessToken = null;
let debounceTimer;

// 定義所有級別的 LocalStorage 鍵值對應
const STORAGE_MAP = {
    n1: { mastery: 'n1_mastery_grammar', scores: 'n1_mastery_vocabulary_scores' },
    n2: { mastery: 'n2_mastery_grammar', scores: 'n2_mastery_vocabulary_scores' },
    n3: { mastery: 'n3_mastery_grammar', scores: 'n3_mastery_vocabulary_scores' },
    n4: { mastery: 'n4_mastery_grammar', scores: 'n4_mastery_vocabulary_scores' },
    n5: { mastery: 'n5_mastery_grammar', scores: 'n5_mastery_vocabulary_scores' }
};

/**
 * 載入並初始化 Google API
 */
function initSyncService() {
    loadScript('https://apis.google.com/js/api.js', () => {
        gapi.load('client', async () => {
            await gapi.client.init({
                discoveryDocs: [SYNC_CONFIG.DISCOVERY_DOC],
            });
            gapiInited = true;
            checkInited();
        });
    });

    loadScript('https://accounts.google.com/gsi/client', () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: SYNC_CONFIG.CLIENT_ID,
            scope: SYNC_CONFIG.SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    showSyncStatus('❌ 認證失敗', 'error');
                    return;
                }
                accessToken = resp.access_token;
                localStorage.setItem('gdrive_sync_token', accessToken);
                startSyncProcess();
            },
        });
        gisInited = true;
        checkInited();
    });
}

function checkInited() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('sync-progress');
        if (btn) btn.disabled = false;
        // 如果已有 token，嘗試背景同步
        const savedToken = localStorage.getItem('gdrive_sync_token');
        if (savedToken) {
            accessToken = savedToken;
            gapi.client.setToken({ access_token: accessToken });
            // 載入頁面時自動同步一次
            startSyncProcess(true);
        }
    }
}

/**
 * 觸發自動同步（帶有 3 秒 Debounce）
 */
function triggerAutoSync() {
    if (!accessToken || !gapiInited) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        startSyncProcess(true);
    }, 3000);
}

async function startSyncProcess(isAuto = false) {
    if (!isAuto) showSyncStatus('⏳ 同步中...', 'loading');
    else showSyncStatus('⏳ 自動同步中...', 'loading');

    try {
        // 1. 尋找現有同步檔案
        let fileId = await findSyncFile();
        let cloudData = null;

        if (fileId) {
            const resp = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            cloudData = resp.result;
        }

        // 2. 準備本地數據
        const localData = packLocalData();

        // 3. 合併數據 (Merge Logic)
        const mergedData = mergeSyncData(localData, cloudData);

        // 4. 更新本地
        unpackLocalData(mergedData);

        // 5. 上傳至雲端
        if (fileId) {
            await updateSyncFile(fileId, mergedData);
        } else {
            await createSyncFile(mergedData);
        }

        showSyncStatus(isAuto ? '✅ 自動同步成功' : '✅ 同步成功', 'success');

        // 只有在非自動同步或是數據有實質變動時才呼叫 init (避免無限循環)
        // 這裡簡單化處理，如果是手動點擊才重新 init UI
        if (!isAuto && window.init) window.init();
    } catch (err) {
        console.error('Sync Error:', err);
        if (err.status === 401) {
            // Token 過期
            if (!isAuto) tokenClient.requestAccessToken({ prompt: '' });
        } else {
            showSyncStatus('❌ 同步失敗', 'error');
        }
    }
}

/**
 * 合併邏輯：
 * - Mastery List: 聯集 (Union)
 * - Scores: 取最大值 (Max)
 */
function mergeSyncData(local, cloud) {
    if (!cloud) return local;
    const merged = { ...local };

    for (const level in STORAGE_MAP) {
        const cLevel = cloud[level] || { mastery: [], scores: {} };
        const lLevel = local[level];

        // Merge Mastery
        merged[level].mastery = [...new Set([...lLevel.mastery, ...cLevel.mastery])];

        // Merge Scores
        for (const id in cLevel.scores) {
            const cScore = cLevel.scores[id];
            const lScore = lLevel.scores[id] || { jpToZh: 0, zhToJp: 0 };
            merged[level].scores[id] = {
                jpToZh: Math.max(lScore.jpToZh, cScore.jpToZh),
                zhToJp: Math.max(lScore.zhToJp, cScore.zhToJp)
            };
        }
    }
    return merged;
}

function packLocalData() {
    const data = {};
    for (const level in STORAGE_MAP) {
        data[level] = {
            mastery: JSON.parse(localStorage.getItem(STORAGE_MAP[level].mastery) || '[]'),
            scores: JSON.parse(localStorage.getItem(STORAGE_MAP[level].scores) || '{}')
        };
    }
    return data;
}

function unpackLocalData(data) {
    for (const level in STORAGE_MAP) {
        if (data[level]) {
            localStorage.setItem(STORAGE_MAP[level].mastery, JSON.stringify(data[level].mastery));
            localStorage.setItem(STORAGE_MAP[level].scores, JSON.stringify(data[level].scores));
        }
    }
}

async function findSyncFile() {
    const resp = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        pageSize: 1
    });
    const files = resp.result.files;
    return files.length > 0 ? files[0].id : null;
}

async function createSyncFile(data) {
    const metadata = {
        name: SYNC_CONFIG.FILE_NAME,
        parents: ['appDataFolder']
    };
    const file = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
    });
}

async function updateSyncFile(fileId, data) {
    await gapi.client.request({
        path: '/upload/drive/v3/files/' + fileId,
        method: 'PATCH',
        params: { uploadType: 'media' },
        body: JSON.stringify(data)
    });
}

function showSyncStatus(msg, type) {
    const btn = document.getElementById('sync-progress');
    if (!btn) return;
    const label = btn.querySelector('#sync-label') || btn;
    label.innerText = msg;

    if (type === 'success') {
        const originalBg = btn.classList.contains('bg-white/20') ? 'bg-white/20' : 'bg-indigo-50';
        const successBg = btn.classList.contains('bg-white/20') ? 'bg-green-500/50' : 'bg-green-600';

        btn.classList.add(successBg);
        setTimeout(() => {
            label.innerText = btn.id === 'sync-progress' && !btn.classList.contains('bg-white/20') ? '雲端同步' : '同步雲端進度';
            btn.classList.remove(successBg);
        }, 3000);
    }
}

function handleSyncClick() {
    if (!accessToken) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        gapi.client.setToken({ access_token: accessToken });
        startSyncProcess();
    }
}

function loadScript(src, callback) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = callback;
    document.body.appendChild(s);
}

// 初始化
window.addEventListener('load', () => {
    if (document.getElementById('sync-progress')) {
        initSyncService();
        document.getElementById('sync-progress').addEventListener('click', handleSyncClick);
    }
});
