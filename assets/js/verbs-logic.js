/**
 * Meow! 日本語達陣 - 動詞變化核心邏輯
 */
class VerbApp {
    constructor(verbsData) {
        this.verbsData = verbsData;
        this.masteredIds = [];
        this.verbScores = {};
        this.currentVerbFC = null;
        this.currentTab = 'g1';
        this.hideMastered = false;
    }

    init() {
        this.masteredIds = JSON.parse(localStorage.getItem('verbs_mastery') || '[]');
        this.verbScores = JSON.parse(localStorage.getItem('verbs_scores') || '{}');
        this.hideMastered = localStorage.getItem('learning_jp_hide_mastered') === 'true';

        this.updateHideUI();
        this.renderVerbs();
        this.updateProgress();

        const toggleHideBtn = document.getElementById('toggle-hide');
        if (toggleHideBtn) {
            toggleHideBtn.onclick = () => {
                this.hideMastered = !this.hideMastered;
                localStorage.setItem('learning_jp_hide_mastered', this.hideMastered);
                this.updateHideUI();
            };
        }

        const resetBtn = document.getElementById('reset-progress');
        if (resetBtn) {
            resetBtn.onclick = () => {
                document.getElementById('confirm-modal').style.display = 'flex';
            };
        }

        // Global access for onclick handlers
        window.switchTab = (tab) => this.switchTab(tab);
        window.toggleMastered = (id) => this.toggleMastered(id);
        window.submitVerbFC = (choice) => this.submitVerbFC(choice);
        window.loadNextVerbFC = () => this.loadNextVerbFC();
        window.confirmReset = () => this.confirmReset();
        window.closeModal = () => this.closeModal();
    }

    updateHideUI() {
        document.body.classList.toggle('hide-mastered', this.hideMastered);
        const label = document.getElementById('toggle-label');
        const icon = document.getElementById('toggle-icon');
        if (label) label.innerText = this.hideMastered ? '顯示已掌握' : '隱藏已掌握';
        if (icon) icon.innerText = this.hideMastered ? '👁️‍🗨️' : '👁️';
    }

    getVerbParts(v) {
        let d = v.dictionary;
        let kanji, reading;
        let m = d.match(/^([^\s\(\)]+)\s*\(([^\s\(\)]+)\)$/);
        if (m) { kanji = m[1].trim(); reading = m[2].trim(); }
        else { kanji = reading = d.trim(); }

        if (v.group === 'g3') {
            if (reading.endsWith('する')) return { kStem: kanji.slice(0, -2), rStem: reading.slice(0, -2), suffix: 'する', kSuffix: 'する' };
            if (reading.endsWith('くる')) return { kStem: kanji.slice(0, -2), rStem: reading.slice(0, -2), suffix: 'くる', kSuffix: 'くる' };
        }
        return { kStem: kanji.slice(0, -1), rStem: reading.slice(0, -1), suffix: reading.slice(-1), kSuffix: kanji.slice(-1) };
    }

    conjugate(v) {
        const { kStem, rStem, suffix, kSuffix } = this.getVerbParts(v);
        const wrap = (k, r) => `${k} (${r})`;
        const g1Base = {
            'う': ['わ', 'い', 'う', 'え', 'お'], 'く': ['か', 'き', 'く', 'け', 'こ'],
            'ぐ': ['が', 'ぎ', 'ぐ', 'げ', 'ご'], 'す': ['さ', 'し', 'す', 'せ', 'そ'],
            'つ': ['た', 'ち', 'つ', 'て', 'と'], 'ぬ': ['な', 'に', 'ぬ', 'ね', 'の'],
            'ぶ': ['ば', 'び', 'ぶ', 'べ', 'ぼ'], 'む': ['ま', 'み', 'む', 'め', 'も'],
            'る': ['ら', 'り', 'る', 'れ', 'ろ']
        };

        let f = {};
        if (v.group === 'g1') {
            let b = g1Base[suffix]; if (!b) return null;
            let kb = g1Base[kSuffix] || b;
            f.dictionary = wrap(kStem + kSuffix, rStem + suffix);
            f.masu = wrap(kStem + kb[1] + 'ます', rStem + b[1] + 'ます');
            f.nai = wrap(kStem + kb[0] + 'ない', rStem + b[0] + 'ない');
            let ts, rs, tas, ras;
            if (rStem + suffix === 'いく' || kStem + kSuffix === '行く') { ts = rs = 'って'; tas = ras = 'った'; }
            else if (['う', 'つ', 'る'].includes(suffix)) { ts = rs = 'って'; tas = ras = 'った'; }
            else if (['む', 'ぶ', 'ぬ'].includes(suffix)) { ts = rs = 'んで'; tas = ras = 'んだ'; }
            else if (suffix === 'く') { ts = rs = 'いて'; tas = ras = 'いた'; }
            else if (suffix === 'ぐ') { ts = rs = 'いで'; tas = ras = 'いだ'; }
            else if (suffix === 'す') { ts = rs = 'して'; tas = ras = 'した'; }
            f.te = wrap(kStem + ts, rStem + rs);
            f.ta = wrap(kStem + tas, rStem + ras);
            f.imperative = wrap(kStem + kb[3], rStem + b[3]);
            f.volitional = wrap(kStem + kb[4] + 'う', rStem + b[4] + 'う');
            f.conditional = wrap(kStem + kb[3] + 'ば', rStem + b[3] + 'ば');
            f.potential = wrap(kStem + kb[3] + 'る', rStem + b[3] + 'る');
            f.passive = wrap(kStem + kb[0] + 'れる', rStem + b[0] + 'れる');
            f.causative = wrap(kStem + kb[0] + 'せる', rStem + b[0] + 'せる');
            f.causativePassive = wrap(kStem + kb[0] + 'せられる', rStem + b[0] + 'せられる');
        } else if (v.group === 'g2') {
            f.dictionary = wrap(kStem + 'る', rStem + 'る'); f.masu = wrap(kStem + 'ます', rStem + 'ます');
            f.te = wrap(kStem + 'て', rStem + 'て'); f.ta = wrap(kStem + 'た', rStem + 'た');
            f.nai = wrap(kStem + 'ない', rStem + 'ない'); f.imperative = wrap(kStem + 'ろ', rStem + 'ろ');
            f.volitional = wrap(kStem + 'よう', rStem + 'よう'); f.conditional = wrap(kStem + 'れば', rStem + 'れば');
            f.potential = wrap(kStem + 'られる', rStem + 'られる'); f.passive = wrap(kStem + 'られる', rStem + 'られる');
            f.causative = wrap(kStem + 'させる', rStem + 'させる'); f.causativePassive = wrap(kStem + 'させられる', rStem + 'させられる');
        } else if (v.group === 'g3') {
            if (suffix === 'する') {
                f.dictionary = wrap(kStem + 'する', rStem + 'する'); f.masu = wrap(kStem + 'します', rStem + 'します');
                f.te = wrap(kStem + 'して', rStem + 'して'); f.ta = wrap(kStem + 'した', rStem + 'した');
                f.nai = wrap(kStem + 'しない', rStem + 'しない'); f.imperative = wrap(kStem + 'しろ', rStem + 'しろ');
                f.volitional = wrap(kStem + 'しよう', rStem + 'しよう'); f.conditional = wrap(kStem + 'すれば', rStem + 'すれば');
                f.potential = wrap(kStem + 'できる', rStem + 'できる'); f.passive = wrap(kStem + 'される', rStem + 'される');
                f.causative = wrap(kStem + 'させる', rStem + 'させる'); f.causativePassive = wrap(kStem + 'させられる', rStem + 'させられる');
            } else {
                f.dictionary = wrap(kStem + '來る', rStem + 'くる'); f.masu = wrap(kStem + '來ます', rStem + 'きます');
                f.te = wrap(kStem + '来て', rStem + 'きて'); f.ta = wrap(kStem + '来た', rStem + 'きた');
                f.nai = wrap(kStem + '來ない', rStem + 'こない'); f.imperative = wrap(kStem + '來い', rStem + 'こい');
                f.volitional = wrap(kStem + '來よう', rStem + 'こよう'); f.conditional = wrap(kStem + '來れば', rStem + 'くれば');
                f.potential = wrap(kStem + '來られる', rStem + 'こられる'); f.passive = wrap(kStem + '來られる', rStem + 'こられる');
                f.causative = wrap(kStem + '來させる', rStem + 'こさせる'); f.causativePassive = wrap(kStem + '來させられる', rStem + 'こさせられる');
            }
        }
        return f;
    }

    renderVerbs() {
        const body = document.getElementById('verb-body');
        if (!body) return;
        const data = this.verbsData[this.currentTab];
        if (!data) return;

        body.innerHTML = data.map(v => {
            const isM = this.masteredIds.includes(v.id);
            const f = this.conjugate(v);
            if (!f) return '';
            return `
                <tr class="grammar-card ${isM ? 'mastered is-mastered' : ''}" data-id="${v.id}">
                    <td class="py-3 px-4 text-center border-r border-slate-100 sticky-col-1 bg-white">
                        <input type="checkbox" class="custom-checkbox" ${isM ? 'checked' : ''} onclick="toggleMastered('${v.id}')">
                    </td>
                    <td class="py-3 px-4 text-center japanese-text font-bold border-r border-slate-100 sticky-col-2 bg-white">${this.formatRuby(f.dictionary)}</td>
                    <td class="p-3 text-center japanese-text text-amber-700 border-r border-slate-100 text-xs">${this.formatRuby(f.masu)}</td>
                    <td class="p-3 text-center japanese-text text-orange-600 border-r border-slate-100 text-xs">${this.formatRuby(f.nai)}</td>
                    <td class="p-3 text-center japanese-text text-indigo-600 border-r border-slate-100 text-xs">${this.formatRuby(f.te)}</td>
                    <td class="p-3 text-center japanese-text text-rose-600 border-r border-slate-100 text-xs">${this.formatRuby(f.ta)}</td>
                    <td class="p-3 text-center japanese-text text-red-600 border-r border-slate-100 text-xs">${this.formatRuby(f.imperative)}</td>
                    <td class="p-3 text-center japanese-text text-yellow-700 border-r border-slate-100 text-xs">${this.formatRuby(f.volitional)}</td>
                    <td class="p-3 text-center japanese-text text-emerald-600 border-r border-slate-100 text-xs">${this.formatRuby(f.conditional)}</td>
                    <td class="p-3 text-center japanese-text text-blue-600 border-r border-slate-100 text-xs">${this.formatRuby(f.potential)}</td>
                    <td class="p-3 text-center japanese-text text-purple-600 border-r border-slate-100 text-xs">${this.formatRuby(f.passive)}</td>
                    <td class="p-3 text-center japanese-text text-pink-600 border-r border-slate-100 text-xs">${this.formatRuby(f.causative)}</td>
                    <td class="p-3 text-center japanese-text text-fuchsia-600 border-r border-slate-100 text-[10px] leading-tight">${this.formatRuby(f.causativePassive)}</td>
                    <td class="p-3 text-center min-w-[150px]">
                        <p class="font-bold text-slate-700 text-xs">${v.meaning}</p>
                        <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] rounded mt-1 font-black">${v.level}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatRuby(text) {
        if (!text || typeof text !== 'string') return text;
        const match = text.match(/^(.+)\s*\((.+)\)$/);
        if (match) {
            let kanji = match[1].trim();
            let reading = match[2].trim();
            let suffixLen = 0;
            while (suffixLen < kanji.length && suffixLen < reading.length &&
                    kanji[kanji.length - 1 - suffixLen] === reading[reading.length - 1 - suffixLen] &&
                    /[\u3040-\u309F\u30A0-\u30FF]/.test(kanji[kanji.length - 1 - suffixLen])) {
                suffixLen++;
            }
            if (suffixLen > 0) {
                return `<ruby>${kanji.slice(0, -suffixLen)}<rt>${reading.slice(0, -suffixLen)}</rt></ruby>${kanji.slice(-suffixLen)}`;
            }
            return `<ruby>${kanji}<rt>${reading}</rt></ruby>`;
        }
        return text.replace(/([^\u3040-\u309F\u30A0-\u30FF\s]+)\s*\(([\u3040-\u309F\u30A0-\u30FF\s]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
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
        localStorage.setItem('verbs_mastery', JSON.stringify(this.masteredIds));
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
        } else {
            this.renderVerbs();
        }

        this.updateProgress();
        if (window.triggerAutoSync) window.triggerAutoSync();
    }

    updateProgress() {
        const total = Object.values(this.verbsData).flat().length;
        const current = this.masteredIds.length;
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.innerText = percent + '%';
    }

    loadNextVerbFC() {
        const allVerbs = [...this.verbsData.g1, ...this.verbsData.g2, ...this.verbsData.g3];
        const pool = allVerbs.filter(v => !this.masteredIds.includes(v.id));

        const questionEl = document.getElementById('fc-question');
        const optionsEl = document.getElementById('fc-options');
        const feedbackEl = document.getElementById('fc-feedback');
        const nextBtn = document.getElementById('fc-next');

        if (pool.length === 0) {
            if (questionEl) questionEl.innerText = "🎉 已全部掌握！";
            if (optionsEl) optionsEl.classList.add('hidden');
            if (feedbackEl) feedbackEl.classList.add('hidden');
            if (nextBtn) nextBtn.classList.add('hidden');
            return;
        }

        this.currentVerbFC = pool[Math.floor(Math.random() * pool.length)];
        if (questionEl) questionEl.innerHTML = this.formatRuby(this.currentVerbFC.dictionary);
        if (optionsEl) optionsEl.classList.remove('hidden');
        if (feedbackEl) feedbackEl.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
    }

    submitVerbFC(choice) {
        if (!this.currentVerbFC) return;
        const isCorrect = choice === this.currentVerbFC.group;
        const id = this.currentVerbFC.id;

        if (!this.verbScores[id]) this.verbScores[id] = 0;

        if (isCorrect) {
            this.verbScores[id] += 5;
        } else {
            this.verbScores[id] = Math.floor(this.verbScores[id] / 2);
        }

        localStorage.setItem('verbs_scores', JSON.stringify(this.verbScores));

        const resultMsg = document.getElementById('fc-result-msg');
        if (resultMsg) {
            if (isCorrect) {
                resultMsg.innerText = "✨ 太棒了！答對了";
                resultMsg.className = "text-center font-bold text-lg mb-4 text-emerald-600";
            } else if (choice === 'unknown') {
                resultMsg.innerText = "📚 沒關係，再接再厲";
                resultMsg.className = "text-center font-bold text-lg mb-4 text-slate-500";
            } else {
                resultMsg.innerText = "❌ 答錯囉，加油！";
                resultMsg.className = "text-center font-bold text-lg mb-4 text-red-500";
            }
        }

        const groupNames = { "g1": "第一類動詞 (五段)", "g2": "第二類動詞 (一段)", "g3": "第三類動詞 (不規則)" };
        const correctGroupEl = document.getElementById('fc-correct-group');
        const meaningEl = document.getElementById('fc-meaning');
        if (correctGroupEl) correctGroupEl.innerText = groupNames[this.currentVerbFC.group];
        if (meaningEl) meaningEl.innerText = this.currentVerbFC.meaning;

        const optionsEl = document.getElementById('fc-options');
        const feedbackEl = document.getElementById('fc-feedback');
        const nextBtn = document.getElementById('fc-next');
        if (optionsEl) optionsEl.classList.add('hidden');
        if (feedbackEl) feedbackEl.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');

        if (this.verbScores[id] >= 10) {
            if (!this.masteredIds.includes(id)) {
                this.masteredIds.push(id);
                this.saveAndRefresh(id);
            }
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('text-slate-400');
        });
        const activeBtn = document.getElementById(`tab-btn-${tab}`);
        if (activeBtn) activeBtn.classList.add('tab-active');

        const verbContent = document.getElementById('verb-content');
        const sectionFlashcard = document.getElementById('section-flashcard');

        if (tab === 'fc') {
            if (verbContent) verbContent.classList.add('hidden');
            if (sectionFlashcard) sectionFlashcard.classList.remove('hidden');
            this.loadNextVerbFC();
        } else {
            if (verbContent) verbContent.classList.remove('hidden');
            if (sectionFlashcard) sectionFlashcard.classList.add('hidden');
            this.renderVerbs();
        }
    }

    closeModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.style.display = 'none';
    }

    confirmReset() {
        this.masteredIds = [];
        this.saveAndRefresh();
        this.closeModal();
    }
}
