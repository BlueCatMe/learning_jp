/**
 * Meow! 日本語達陣 - Kanji Logic
 * Handles rendering, mastery tracking, and flashcard logic for Kanji.
 */

class KanjiApp {
    constructor(data) {
        this.data = data;
        this.masteredIds = [];
        this.kanjiScores = {};
        this.currentTab = 'n5';
        this.hideMastered = false;
        this.currentFCKanji = null;

        // UI elements
        this.body = document.getElementById('kanji-body');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.toggleLabel = document.getElementById('toggle-label');
        this.toggleIcon = document.getElementById('toggle-icon');
        this.fcScore = document.getElementById('fc-score');
        this.fcKanji = document.getElementById('fc-kanji');
        this.fcLevelBadge = document.getElementById('fc-level-badge');
        this.fcMeaning = document.getElementById('fc-meaning');
        this.fcExample = document.getElementById('fc-example');
        this.fcFeedback = document.getElementById('fc-feedback');
        this.fcControls = document.getElementById('fc-controls');
        this.confirmModal = document.getElementById('confirm-modal');
        this.kanjiListSection = document.getElementById('kanji-list-section');
        this.sectionFlashcard = document.getElementById('section-flashcard');

        this.init();
    }

    init() {
        this.masteredIds = JSON.parse(localStorage.getItem('kanji_mastery') || '[]');
        this.kanjiScores = JSON.parse(localStorage.getItem('kanji_scores') || '{}');
        this.hideMastered = localStorage.getItem('learning_jp_hide_mastered') === 'true';

        this.updateHideUI();
        this.renderKanji();
        this.updateProgress();

        const toggleBtn = document.getElementById('toggle-hide');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.hideMastered = !this.hideMastered;
                localStorage.setItem('learning_jp_hide_mastered', this.hideMastered);
                this.updateHideUI();
            };
        }

        const resetBtn = document.getElementById('reset-progress');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.confirmModal.style.display = 'flex';
            };
        }
    }

    updateHideUI() {
        document.body.classList.toggle('hide-mastered', this.hideMastered);
        if (this.toggleLabel) this.toggleLabel.innerText = this.hideMastered ? '顯示已掌握' : '隱藏已掌握';
        if (this.toggleIcon) this.toggleIcon.innerText = this.hideMastered ? '👁️‍🗨️' : '👁️';
    }

    renderKanji() {
        if (!this.body) return;
        const data = this.data[this.currentTab];
        if (!data) return;

        this.body.innerHTML = data.map(k => {
            const isM = this.masteredIds.includes(k.id);
            const score = this.kanjiScores[k.id] || 0;
            return `
                <tr class="grammar-card ${isM ? 'mastered is-mastered' : ''}" data-id="${k.id}">
                    <td class="p-4 text-center">
                        <input type="checkbox" class="custom-checkbox" ${isM ? 'checked' : ''} onclick="kanjiApp.toggleMastered('${k.id}')">
                    </td>
                    <td class="p-4 text-center japanese-text font-black text-3xl text-emerald-700">${k.kanji}</td>
                    <td class="p-4 text-center">
                        <p class="font-bold text-slate-700">${k.meaning}</p>
                        <div class="flex justify-center gap-1 mt-1">
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded font-black">${k.level}</span>
                            <span class="px-2 py-0.5 ${score > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'} text-[10px] rounded font-black">⚡ ${score}/10</span>
                        </div>
                    </td>
                    <td class="p-4 text-slate-600 japanese-text">${k.example}</td>
                </tr>
            `;
        }).join('');
    }

    toggleMastered(id) {
        const index = this.masteredIds.indexOf(id);
        if (index > -1) {
            this.masteredIds.splice(index, 1);
        } else {
            this.masteredIds.push(id);
        }
        this.saveAndRefresh(id);
    }

    saveAndRefresh(id) {
        localStorage.setItem('kanji_mastery', JSON.stringify(this.masteredIds));
        localStorage.setItem('kanji_scores', JSON.stringify(this.kanjiScores));
        localStorage.setItem('learning_jp_last_modified', Date.now());

        if (id) {
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) {
                const isM = this.masteredIds.includes(id);
                el.classList.toggle('is-mastered', isM);
                el.classList.toggle('mastered', isM);
                const cb = el.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = isM;
            }
        } else if (this.currentTab !== 'fc') {
            this.renderKanji();
        }

        this.updateProgress();
        if (window.triggerAutoSync) window.triggerAutoSync();
    }

    updateProgress() {
        const allKanji = Object.values(this.data).flat();
        const total = allKanji.length;
        const current = this.masteredIds.length;
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        if (this.progressBar) this.progressBar.style.width = percent + '%';
        if (this.progressText) this.progressText.innerText = percent + '%';
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('text-slate-400');
        });
        const activeTabBtn = document.getElementById(`tab-btn-${tab}`);
        if (activeTabBtn) activeTabBtn.classList.add('tab-active');

        if (tab === 'fc') {
            if (this.kanjiListSection) this.kanjiListSection.classList.add('hidden');
            if (this.sectionFlashcard) this.sectionFlashcard.classList.remove('hidden');
            this.loadNextKanjiFC();
        } else {
            if (this.kanjiListSection) this.kanjiListSection.classList.remove('hidden');
            if (this.sectionFlashcard) this.sectionFlashcard.classList.add('hidden');
            this.renderKanji();
        }
    }

    stripRuby(html) {
        if (!html) return '';
        // 1. 移除 <rt>...</rt> 及其內容
        // 2. 移除 <ruby> 與 </ruby> 標籤
        // 3. 移除末尾的中文翻譯（通常在全形或半形括號內）
        return html.replace(/<rt>.*?<\/rt>/g, '')
                   .replace(/<\/?ruby>/g, '')
                   .replace(/[\(（].*?[\)）]/g, '')
                   .trim();
    }

    loadNextKanjiFC() {
        const levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
        let pool = [];

        for (const level of levels) {
            const unmasteredInLevel = this.data[level].filter(k => !this.masteredIds.includes(k.id));
            pool = pool.concat(unmasteredInLevel);
            if (pool.length >= 10) break;
        }

        if (pool.length === 0) {
            if (this.fcKanji) this.fcKanji.innerText = '🎉';
            if (this.fcMeaning) this.fcMeaning.innerText = '恭喜！所有漢字已掌握！';
            if (this.fcExample) this.fcExample.innerText = '';
            const fcHint = document.getElementById('fc-front-example');
            if (fcHint) fcHint.innerText = '';
            if (this.fcFeedback) this.fcFeedback.classList.remove('hidden');
            if (this.fcControls) this.fcControls.classList.add('hidden');
            if (this.fcScore) this.fcScore.innerText = '-';
            return;
        }

        this.currentFCKanji = pool[Math.floor(Math.random() * pool.length)];
        const score = this.kanjiScores[this.currentFCKanji.id] || 0;
        if (this.fcScore) this.fcScore.innerText = score;

        if (this.fcKanji) this.fcKanji.innerText = this.currentFCKanji.kanji;
        if (this.fcLevelBadge) this.fcLevelBadge.innerText = this.currentFCKanji.level;
        if (this.fcMeaning) this.fcMeaning.innerText = this.currentFCKanji.meaning;
        if (this.fcExample) this.fcExample.innerHTML = this.currentFCKanji.example;

        // 在正面顯示例句，但移除拼音 (Ruby/RT)
        const fcHint = document.getElementById('fc-front-example');
        if (fcHint) {
            fcHint.innerHTML = this.stripRuby(this.currentFCKanji.example);
        }

        if (this.fcFeedback) this.fcFeedback.classList.add('hidden');
        if (this.fcControls) this.fcControls.classList.remove('hidden');
    }

    showFCAnswer() {
        if (this.fcFeedback) this.fcFeedback.classList.remove('hidden');
    }

    submitKanjiFC(action) {
        if (!this.currentFCKanji) return;
        const id = this.currentFCKanji.id;
        let score = this.kanjiScores[id] || 0;

        if (action === 'mastered') {
            score += 5;
        } else if (action === 'retry') {
            score = Math.floor(score / 2);
        }

        this.kanjiScores[id] = score;
        if (score >= 10 && !this.masteredIds.includes(id)) {
            this.masteredIds.push(id);
        }
        this.saveAndRefresh();
        this.loadNextKanjiFC();
    }

    closeModal() {
        if (this.confirmModal) this.confirmModal.style.display = 'none';
    }

    confirmReset() {
        this.masteredIds = [];
        this.kanjiScores = {};
        this.saveAndRefresh();
        this.closeModal();
    }
}

// Global initialization
let kanjiApp;
window.addEventListener('DOMContentLoaded', () => {
    if (typeof kanjiData !== 'undefined') {
        kanjiApp = new KanjiApp(kanjiData);
        // Expose functions for global onclick handlers if necessary
        window.switchTab = (tab) => kanjiApp.switchTab(tab);
        window.showFCAnswer = () => kanjiApp.showFCAnswer();
        window.submitKanjiFC = (action) => kanjiApp.submitKanjiFC(action);
        window.confirmReset = () => kanjiApp.confirmReset();
        window.closeModal = () => kanjiApp.closeModal();
        window.init = () => kanjiApp.init(); // For SyncService callback
    }
});
