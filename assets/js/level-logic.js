/**
 * Meow! 日本語達陣 - 核心級別邏輯模組 (N1-N5 共用)
 */

class LevelApp {
    constructor(config) {
        this.level = config.level; // 'n1', 'n2', etc.
        this.themeColor = config.themeColor; // 'indigo', 'violet', etc.
        this.accentColor = config.accentColor || config.themeColor;
        this.grammarData = config.grammarData;
        this.vocabData = config.vocabData;
        
        // Storage Keys
        this.masteryKey = `${this.level}_mastery_grammar`;
        this.scoresKey = `${this.level}_mastery_vocabulary_scores`;
        
        // State
        this.masteredIds = JSON.parse(localStorage.getItem(this.masteryKey) || '[]');
        this.vocabScores = JSON.parse(localStorage.getItem(this.scoresKey) || '{}');
        this.hideMode = localStorage.getItem('learning_jp_hide_mastered') === 'true';
        this.currentFC = null;
        this.fcMode = 'jpToZh';
        this.listenersAttached = false;
        
        this.init();
    }

    init() {
        this.updateHideUI();
        this.renderGrammar();
        this.renderVocab();
        this.updateProgress();
        this.attachEventListeners();
        
        if (window.triggerAutoSync) window.triggerAutoSync();
    }

    updateHideUI() {
        document.body.classList.toggle('hide-mastered', this.hideMode);
        const label = document.getElementById('toggle-label');
        const icon = document.getElementById('toggle-icon');
        if (label) label.innerText = this.hideMode ? "顯示全部" : "隱藏已掌握";
        if (icon) icon.innerText = this.hideMode ? "👁️‍🗨️" : "👁️";
    }

    attachEventListeners() {
        if (this.listenersAttached) return;

        const toggleBtn = document.getElementById('toggle-hide');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.hideMode = !this.hideMode;
                localStorage.setItem('learning_jp_hide_mastered', this.hideMode);
                localStorage.setItem('learning_jp_last_modified', Date.now());
                this.updateHideUI();
                if (window.triggerAutoSync) window.triggerAutoSync();
            });
        }

        const resetBtn = document.getElementById('reset-progress');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                document.getElementById('confirm-modal').style.display = 'flex';
            });
        }

        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('input', (e) => {
                this.renderVocab(e.target.value);
            });
        }

        this.listenersAttached = true;
    }

    formatRuby(word, kana) {
        if (!kana || word === kana) return word;
        return `<ruby>${word}<rt>${kana}</rt></ruby>`;
    }

    renderGrammar() {
        const container = document.getElementById('section-grammar');
        if (!container) return;
        
        container.innerHTML = this.grammarData.map((g, idx) => {
            const isM = this.masteredIds.includes(g.id);
            return `
                <div class="grammar-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isM ? 'is-mastered mastered' : ''}" data-id="${g.id}">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <span class="bg-${this.themeColor}-600 text-white text-[9px] px-2 py-1 rounded font-black tracking-widest">G${idx+1}</span>
                            <h3 class="text-xl font-bold text-slate-900 japanese-text">${g.title}</h3>
                        </div>
                        <input type="checkbox" class="custom-checkbox" ${isM ? 'checked' : ''} onchange="app.toggleMastered('${g.id}')">
                    </div>
                    <p class="text-sm text-slate-600 mb-4 font-medium">${g.desc}</p>
                    <div class="bg-slate-50 p-4 rounded-xl space-y-3">
                        ${g.ex.map(e => `
                            <div class="border-l-2 border-${this.themeColor}-200 pl-3">
                                <p class="japanese-text text-slate-800 text-base leading-relaxed">${e.j}</p>
                                <p class="text-xs text-slate-500 mt-0.5">${e.c}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderVocab(filter = "") {
        const container = document.getElementById('vocab-body');
        if (!container) return;

        const filteredData = this.vocabData.filter(v =>
            v[0].toLowerCase().includes(filter.toLowerCase()) ||
            v[1].toLowerCase().includes(filter.toLowerCase()) ||
            v[2].toLowerCase().includes(filter.toLowerCase())
        );

        container.innerHTML = filteredData.map((v, i) => {
            const id = `${this.level}fv${i}`;
            const scores = this.vocabScores[id] || { jpToZh: 0, zhToJp: 0 };
            const isM = this.masteredIds.includes(id);
            return `
                <tr class="vocab-row transition-all hover:bg-${this.themeColor}-50 ${isM ? 'is-mastered mastered' : ''}" data-id="${id}">
                    <td class="p-4 text-center">
                        <input type="checkbox" class="custom-checkbox" ${isM ? 'checked' : ''} onchange="app.toggleMastered('${id}')">
                    </td>
                    <td class="p-4 font-mono text-slate-400 text-xs border-r border-slate-50 text-center">V${i+1}</td>
                    <td class="p-4">
                        <div class="japanese-text font-bold text-base text-slate-900">${v[0]}</div>
                        <div class="text-[10px] text-slate-400 japanese-text">${v[1]}</div>
                    </td>
                    <td class="p-4">
                        <span class="font-bold text-${this.themeColor}-700">${v[2]}</span>
                    </td>
                    <td class="p-4">
                        <p class="japanese-text text-slate-700 italic text-sm leading-relaxed mb-1">${v[3]}</p>
                        <p class="text-xs text-slate-500">${v[4]}</p>
                    </td>
                    <td class="p-4">
                        <div class="flex gap-4 items-center justify-center">
                            <div class="flex flex-col text-center">
                                <span class="text-[8px] text-slate-400 uppercase font-black">日</span>
                                <div class="w-10 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                                    <div class="h-full bg-${this.themeColor}-500" style="width: ${scores.jpToZh * 10}%"></div>
                                </div>
                            </div>
                            <div class="flex flex-col text-center">
                                <span class="text-[8px] text-slate-400 uppercase font-black">中</span>
                                <div class="w-10 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                                    <div class="h-full bg-${this.accentColor}-400" style="width: ${scores.zhToJp * 10}%"></div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadNextFC() {
        let pool = [];
        this.vocabData.forEach((v, i) => {
            const id = `${this.level}fv${i}`;
            const score = this.vocabScores[id] || { jpToZh: 0, zhToJp: 0 };
            if (!this.masteredIds.includes(id)) {
                if (score.jpToZh < 10) pool.push({ v, id, mode: 'jpToZh' });
                if (score.zhToJp < 10) pool.push({ v, id, mode: 'zhToJp' });
            }
        });

        const mainDisplay = document.getElementById('fc-main-display');
        const controls = document.getElementById('fc-controls');
        const header = document.getElementById('fc-header');
        const emptyState = document.getElementById('fc-empty-state');

        if (pool.length === 0) {
            if (mainDisplay) mainDisplay.classList.add('hidden');
            if (controls) controls.classList.add('hidden');
            if (header) header.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (mainDisplay) mainDisplay.classList.remove('hidden');
        if (controls) controls.classList.remove('hidden');
        if (header) header.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        const answerBlock = document.getElementById('fc-answer-block');
        if (answerBlock) answerBlock.classList.remove('active');

        const pick = pool[Math.floor(Math.random() * pool.length)];
        this.currentFC = pick;
        this.fcMode = pick.mode;

        if (header) {
            const baseClass = "absolute top-0 left-0 w-full py-3 px-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all";
            if (this.fcMode === 'jpToZh') {
                header.className = `${baseClass} bg-${this.themeColor}-600`;
                document.getElementById('fc-mode-text').innerText = '日譯中挑戰';
                document.getElementById('fc-question').innerHTML = this.formatRuby(pick.v[0], pick.v[1]);
                document.getElementById('fc-hint').innerText = "請回答中文解釋";
                document.getElementById('fc-target').innerText = pick.v[2];
                document.getElementById('fc-kana-display').innerText = "";
            } else {
                header.className = `${baseClass} bg-${this.accentColor}-500`;
                document.getElementById('fc-mode-text').innerText = '中譯日挑戰';
                document.getElementById('fc-question').innerText = pick.v[2];
                document.getElementById('fc-hint').innerText = "請回答日文漢字與讀音";
                document.getElementById('fc-target').innerText = pick.v[0];
                document.getElementById('fc-kana-display').innerText = pick.v[1] || "";
            }
        }
        
        const example = document.getElementById('fc-example');
        if (example) {
            example.innerHTML = `${pick.v[3]}<br><span class="text-sm text-slate-500 mt-2 block">${pick.v[4]}</span>`;
        }
        this.updateScoreUI();
    }

    updateScoreUI() {
        const scores = this.vocabScores[this.currentFC.id] || { jpToZh: 0, zhToJp: 0 };
        const currentVal = scores[this.fcMode];
        const scoreText = document.getElementById('fc-current-score-text');
        if (scoreText) scoreText.innerText = currentVal;
        
        const dots = document.getElementById('fc-score-dots');
        if (dots) {
            dots.innerHTML = "";
            for (let i = 0; i < 10; i++) {
                const dot = document.createElement('div');
                dot.className = `w-1.5 h-1.5 rounded-full ${i < currentVal ? 'bg-white' : 'bg-white/30'}`;
                dots.appendChild(dot);
            }
        }
    }

    processFC(action) {
        if (!this.currentFC) return;
        if (action === 'answer') {
            const block = document.getElementById('fc-answer-block');
            if (block) block.classList.add('active');
            return;
        }

        let scores = this.vocabScores[this.currentFC.id] || { jpToZh: 0, zhToJp: 0 };
        if (action === 'master') scores[this.fcMode] = Math.min(10, scores[this.fcMode] + 5);
        else if (action === 'again') scores[this.fcMode] = Math.floor(scores[this.fcMode] / 2);

        this.vocabScores[this.currentFC.id] = scores;
        if (scores.jpToZh >= 10 && scores.zhToJp >= 10) {
            if (!this.masteredIds.includes(this.currentFC.id)) this.masteredIds.push(this.currentFC.id);
        }
        this.saveAndSync();
        this.loadNextFC();
    }

    toggleMastered(id) {
        const index = this.masteredIds.indexOf(id);
        if (index > -1) {
            this.masteredIds.splice(index, 1);
        } else {
            this.masteredIds.push(id);
            // If it's a vocab ID, max out scores
            if (id.includes('fv')) {
                this.vocabScores[id] = { jpToZh: 10, zhToJp: 10 };
            }
        }
        this.saveAndSync(id);
    }

    saveAndSync(id) {
        localStorage.setItem(this.masteryKey, JSON.stringify(this.masteredIds));
        localStorage.setItem(this.scoresKey, JSON.stringify(this.vocabScores));
        localStorage.setItem('learning_jp_last_modified', Date.now());

        if (id) {
            const elements = document.querySelectorAll(`[data-id="${id}"]`);
            elements.forEach(el => {
                const isM = this.masteredIds.includes(id);
                el.classList.toggle('is-mastered', isM);
                el.classList.toggle('mastered', isM);
                const cb = el.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = isM;
            });
        } else {
            this.renderGrammar();
            this.renderVocab(document.getElementById('search-box')?.value || "");
        }
        this.updateProgress();
        if (window.triggerAutoSync) window.triggerAutoSync();
    }

    updateProgress() {
        const total = this.grammarData.length + this.vocabData.length;
        const current = this.masteredIds.length;
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const bar = document.getElementById('progress-bar');
        const text = document.getElementById('progress-text');
        if (bar) bar.style.width = percent + '%';
        if (text) text.innerText = percent + '%';
    }

    switchTab(type) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`section-${type}`);
        if (target) target.classList.remove('hidden');
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('text-slate-400');
        });
        const btn = document.getElementById(`tab-btn-${type}`);
        if (btn) btn.classList.add('tab-active');
        
        if (type === 'flashcard') this.loadNextFC();
    }

    closeModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.style.display = 'none';
    }

    confirmReset() {
        this.masteredIds = [];
        this.vocabScores = {};
        this.saveAndSync();
        this.closeModal();
        if (!document.getElementById('section-flashcard').classList.contains('hidden')) {
            this.loadNextFC();
        }
    }
}
