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

const STORAGE_MAP = {
    n1: { mastery: 'n1_mastery_grammar', scores: 'n1_mastery_vocabulary_scores' },
    n2: { mastery: 'n2_mastery_grammar', scores: 'n2_mastery_vocabulary_scores' },
    n3: { mastery: 'n3_mastery_grammar', scores: 'n3_mastery_vocabulary_scores' },
    n4: { mastery: 'n4_mastery_grammar', scores: 'n4_mastery_vocabulary_scores' },
    n5: { mastery: 'n5_mastery_grammar', scores: 'n5_mastery_vocabulary_scores' },
    verbs: { mastery: 'verbs_mastery', scores: 'verbs_scores' },
    kanji: { mastery: 'kanji_mastery', scores: 'kanji_scores' }
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
                updateSyncUI(true);
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

        const savedToken = localStorage.getItem('gdrive_sync_token');
        if (savedToken) {
            accessToken = savedToken;
            gapi.client.setToken({ access_token: accessToken });
            updateSyncUI(true);
            // 只有在子頁面（非首頁）才載入時自動同步
            const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
            if (!isIndex) {
                startSyncProcess(true);
            }
        } else {
            updateSyncUI(false);
        }
    }
}

/**
 * 更新同步按鈕 UI 狀態
 */
function updateSyncUI(loggedIn) {
    const label = document.getElementById('sync-label');
    const logoutBtn = document.getElementById('logout-btn');
    if (!label) return;

    if (loggedIn) {
        label.innerText = '雲端同步 (已啟用)';
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        label.innerText = '啟用雲端同步';
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

function handleLogout() {
    accessToken = null;
    localStorage.removeItem('gdrive_sync_token');
    // 可選擇是否要清除本地進度，這裡僅移除認證狀態
    updateSyncUI(false);
    showSyncStatus('已登出', 'success');
}

/**
 * 觸發自動同步（帶有 3 秒 Debounce）
 */
function triggerAutoSync() {
    if (!accessToken || !gapiInited) return;

    // 不在首頁自動同步
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    if (isIndex) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        startSyncProcess(true);
    }, 3000);
}

async function startSyncProcess(isAuto = false) {
    if (!accessToken) return;
    if (!isAuto) showSyncStatus('⏳ 同步中...', 'loading');
    else showSyncStatus('⏳ 自動同步中...', 'loading');

    try {
        let fileId = await findSyncFile();
        let cloudData = null;

        if (fileId) {
            const resp = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            cloudData = resp.result;
        }

        const localData = packLocalData();
        const mergedData = mergeSyncData(localData, cloudData);

        unpackLocalData(mergedData);

        if (fileId) {
            await updateSyncFile(fileId, mergedData);
        } else {
            await createSyncFile(mergedData);
        }

        showSyncStatus(isAuto ? '✅ 自動同步成功' : '✅ 同步成功', 'success');

        if (cloudData && cloudData.last_updated > localData.last_updated && window.init) {
            window.init();
        } else if (!isAuto && window.init) {
            window.init();
        }
    } catch (err) {
        console.error('Sync Error:', err);
        if (err.status === 401) {
            if (!isAuto) tokenClient.requestAccessToken({ prompt: '' });
        } else {
            showSyncStatus('❌ 同步失敗', 'error');
        }
    }
}

function mergeSyncData(local, cloud) {
    if (!cloud) return local;
    if (!cloud.last_updated) return local;

    if (local.last_updated >= cloud.last_updated) {
        return local;
    } else {
        return cloud;
    }
}

function packLocalData() {
    const data = {
        last_updated: parseInt(localStorage.getItem('learning_jp_last_modified') || '0'),
        hide_mastered: localStorage.getItem('learning_jp_hide_mastered') === 'true',
        levels: {}
    };
    for (const level in STORAGE_MAP) {
        data.levels[level] = {
            mastery: JSON.parse(localStorage.getItem(STORAGE_MAP[level].mastery) || '[]'),
            scores: JSON.parse(localStorage.getItem(STORAGE_MAP[level].scores) || '{}')
        };
    }
    return data;
}

function unpackLocalData(data) {
    if (!data) return;

    if (data.last_updated) localStorage.setItem('learning_jp_last_modified', data.last_updated.toString());
    if (data.hide_mastered !== undefined) localStorage.setItem('learning_jp_hide_mastered', data.hide_mastered);

    if (data.levels) {
        for (const level in STORAGE_MAP) {
            if (data.levels[level]) {
                localStorage.setItem(STORAGE_MAP[level].mastery, JSON.stringify(data.levels[level].mastery));
                localStorage.setItem(STORAGE_MAP[level].scores, JSON.stringify(data.levels[level].scores));
            }
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
    const label = document.getElementById('sync-label');
    if (!btn || !label) return;

    const oldText = label.innerText;
    label.innerText = msg;

    if (type === 'success') {
        const isIndex = btn.classList.contains('bg-white/20');
        const successBg = isIndex ? 'bg-green-500/50' : 'bg-green-600';

        btn.classList.add(successBg);
        setTimeout(() => {
            label.innerText = accessToken ? '雲端同步 (已啟用)' : '啟用雲端同步';
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
        const logout = document.getElementById('logout-btn');
        if (logout) logout.addEventListener('click', (e) => {
            e.stopPropagation();
            handleLogout();
        });
    }
});
