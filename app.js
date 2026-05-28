// === 狀態管理 ===
const state = {
  todayWords: [],
  currentCard: 0,
  flipped: false,
  quiz: { mode: null, range: null, questions: [], idx: 0, correct: 0 },
  viewDate: null
};

// === 使用者管理 ===
const USERS_KEY = "english3000_users";
const CURRENT_USER_KEY = "english3000_current_user";
let currentUser = null;
let STORAGE_KEY = "";

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function addNewUser(name) {
  name = name.trim();
  if (!name) return;
  const users = getUsers();
  if (!users.includes(name)) {
    users.push(name);
    saveUsers(users);
  }
  selectUser(name);
  document.getElementById("new-user-input").value = "";
}

function deleteUser(name) {
  if (!confirm(`確定要刪除「${name}」的所有紀錄？此動作無法復原。`)) return;
  const users = getUsers().filter(u => u !== name);
  saveUsers(users);
  localStorage.removeItem(`english3000_progress_${name}`);
  if (currentUser === name) {
    currentUser = null;
    STORAGE_KEY = "";
    localStorage.removeItem(CURRENT_USER_KEY);
    showUserPicker();
  } else {
    renderUserPicker();
  }
}

function selectUser(name) {
  currentUser = name;
  STORAGE_KEY = `english3000_progress_${name}`;
  localStorage.setItem(CURRENT_USER_KEY, name);
  progress = loadProgress();
  document.getElementById("user-picker-overlay").classList.add("hidden");
  document.getElementById("current-user-name").textContent = name;
  checkDailyLogin();
  updateCoinsDisplay();
  loadTodayWords();
  renderCard();
  const activeView = document.querySelector(".view.active");
  if (activeView) {
    const viewName = activeView.id.replace("view-", "");
    if (viewName === "progress") renderProgress();
    if (viewName === "char") renderCharPanel();
  }
}

function showUserPicker() {
  renderUserPicker();
  document.getElementById("user-picker-overlay").classList.remove("hidden");
}

function renderUserPicker() {
  const users = getUsers();
  const list = document.getElementById("user-list");
  list.innerHTML = "";
  if (users.length === 0) {
    list.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:12px 0">尚無學習者，請輸入名稱新增</p>';
  }
  users.forEach(name => {
    const row = document.createElement("div");
    row.className = "user-row";
    const btn = document.createElement("button");
    btn.className = "user-card";
    btn.textContent = name;
    btn.addEventListener("click", () => selectUser(name));
    const delBtn = document.createElement("button");
    delBtn.className = "user-delete-btn";
    delBtn.title = "刪除此學習者";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", e => { e.stopPropagation(); deleteUser(name); });
    row.appendChild(btn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

// === LocalStorage ===
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!p) return newProgress();
    if (!p.char) p.char = { level: 1, exp: 0, maxHp: 3, equippedWeapon: null, weaponInventory: [], potions: 0, chests: 0, avatar: "🧙" };
    if (!p.char.avatar) p.char.avatar = "🧙";
    // 舊資料遷移：weapon → weaponInventory
    if (!p.char.weaponInventory) {
      p.char.weaponInventory = [];
      if (p.char.weapon) {
        const a = p.char.weapon.attack || 1;
        const t = p.char.weapon.type || (a <= 2 ? "dagger" : a <= 4 ? "staff" : a <= 6 ? "fire" : a <= 8 ? "thunder" : "holy");
        p.char.weaponInventory.push({ type: t, attack: a, level: p.char.weapon.level || 0, count: p.char.weapon.fragments || 0 });
        p.char.equippedWeapon = t;
      } else {
        p.char.equippedWeapon = null;
      }
    }
    if (p.char.equippedWeapon === undefined) p.char.equippedWeapon = null;
    if (p.char.coins === undefined) p.char.coins = 0;
    if (p.char.rainbowTickets === undefined) p.char.rainbowTickets = 0;
    if (!p.dailyTasks) p.dailyTasks = { date: "", enToZhDone: false, zhToEnDone: false };
    if (!p.lastLoginDate) p.lastLoginDate = "";
    return p;
  } catch (e) {
    return newProgress();
  }
}
function newProgress() {
  return {
    learnedIds: [],
    completedDates: [],
    lastStudyDate: null,
    streak: 0,
    quizCorrect: 0,
    quizWrong: 0,
    shuffleOffset: 0,
    char: { level: 1, exp: 0, maxHp: 3, equippedWeapon: null, weaponInventory: [], potions: 0, chests: 0, coins: 0, rainbowTickets: 0, avatar: "🧙" },
    dailyTasks: { date: "", enToZhDone: false, zhToEnDone: false },
    lastLoginDate: ""
  };
}
function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
let progress = newProgress();

// === 工具 ===
function userNameSeed(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDateChinese(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
}

function speak(text, rate = 0.7) {
  if (!("speechSynthesis" in window)) {
    alert("此瀏覽器不支援語音朗讀，請改用 Chrome 或 Safari");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

// === 視圖切換 ===
function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  const titles = { cards: "今日單字", quiz: "隨堂測驗", progress: "學習進度", char: "角色道具", weapon: "武器庫", shop: "商店" };
  document.getElementById("page-title").textContent = titles[view] || view;
  if (view === "progress") renderProgress();
  if (view === "quiz") resetQuizSetup();
  if (view === "char") renderCharPanel();
  if (view === "weapon") renderWeaponInventory();
  if (view === "shop") renderShop();
}

// === 今日 10 字 ===
function loadTodayWords() {
  state.viewDate = todayDateString();
  const seed = dateSeed(state.viewDate) + progress.shuffleOffset + userNameSeed(currentUser);
  const unlearned = wordsPool.filter(w => !progress.learnedIds.includes(w.id));
  const pool = unlearned.length >= 10 ? unlearned : wordsPool;
  state.todayWords = seededShuffle(pool, seed).slice(0, 10);
  state.currentCard = 0;
  state.flipped = false;
}

function reshuffleToday() {
  progress.shuffleOffset = (progress.shuffleOffset + 1) % 100000;
  saveProgress(progress);
  loadTodayWords();
  renderCard();
}

// === 卡片瀏覽 ===
function renderCard() {
  if (state.todayWords.length === 0) {
    document.getElementById("card-container").innerHTML = `<div class="card"><div class="card-face"><p style="text-align:center;padding:40px 0;color:var(--text-light)">資料載入中...</p></div></div>`;
    return;
  }
  const word = state.todayWords[state.currentCard];
  document.getElementById("date-label").textContent = formatDateChinese(state.viewDate);
  document.getElementById("card-index").textContent = state.currentCard + 1;
  document.getElementById("card-total").textContent = state.todayWords.length;

  const flippedClass = state.flipped ? "flipped" : "";
  const learned = progress.learnedIds.includes(word.id);
  document.getElementById("card-container").innerHTML = `
    <div class="card ${flippedClass}" id="the-card">
      <div class="card-face card-front">
        <div class="level-badge">${word.level}${learned ? " ✓" : ""}</div>
        <div class="word-en">${word.word}</div>
        <div class="word-pos">${word.pos}</div>
        <div class="phonetic">KK ${word.kk}</div>
        <div class="phonetic">IPA ${word.ipa}</div>
        <div class="hint">「${word.hint}」</div>
        <button class="speak-btn" data-speak="${word.word}">🔊 點我朗讀（慢速）</button>
        <div class="tap-hint">點卡片任意處翻面看中文與例句</div>
      </div>
      <div class="card-face card-back">
        <div class="level-badge">${word.level}</div>
        <div class="word-zh">${word.meaning}</div>
        <div style="text-align:center;color:var(--text-light);font-size:0.9rem;margin-bottom:12px">${word.word} (${word.pos})</div>
        ${word.examples.map(ex => `
          <div class="example">
            <div class="example-en">${ex.en}<button class="speak-mini" data-speak="${ex.en.replace(/"/g, "&quot;")}">🔊</button></div>
            <div class="example-zh">${ex.zh}</div>
          </div>
        `).join("")}
        <button class="learn-btn ${learned ? 'learned' : ''}" id="toggle-learned">${learned ? '✓ 已熟記' : '標記為已熟記'}</button>
      </div>
    </div>
  `;

  document.querySelectorAll("[data-speak]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      speak(btn.dataset.speak);
    });
  });
  const card = document.getElementById("the-card");
  card.addEventListener("click", e => {
    if (e.target.closest("button")) return;
    state.flipped = !state.flipped;
    card.classList.toggle("flipped");
  });
  const learnBtn = document.getElementById("toggle-learned");
  if (learnBtn) {
    learnBtn.addEventListener("click", e => {
      e.stopPropagation();
      toggleLearned(word.id);
    });
  }

  updateMarkDoneBtn();
}

function toggleLearned(id) {
  if (progress.learnedIds.includes(id)) {
    progress.learnedIds = progress.learnedIds.filter(x => x !== id);
  } else {
    progress.learnedIds.push(id);
  }
  saveProgress(progress);
  renderCard();
}

function updateMarkDoneBtn() {
  const btn = document.getElementById("mark-done");
  if (progress.completedDates.includes(state.viewDate)) {
    btn.textContent = "✓ 今日已完成";
    btn.classList.add("done");
  } else {
    btn.textContent = "標記今日已完成";
    btn.classList.remove("done");
  }
}

function markTodayDone() {
  const today = state.viewDate;
  if (progress.completedDates.includes(today)) {
    if (!confirm("今日已標記完成，要取消嗎?")) return;
    progress.completedDates = progress.completedDates.filter(d => d !== today);
    progress.learnedIds = progress.learnedIds.filter(id => !state.todayWords.some(w => w.id === id) || progress.learnedIds.filter(x => x === id).length > 1);
  } else {
    progress.completedDates.push(today);
    state.todayWords.forEach(w => {
      if (!progress.learnedIds.includes(w.id)) progress.learnedIds.push(w.id);
    });
    updateStreak();
  }
  saveProgress(progress);
  updateMarkDoneBtn();
}

function updateStreak() {
  const today = todayDateString();
  if (progress.lastStudyDate === today) return;
  if (!progress.lastStudyDate) {
    progress.streak = 1;
  } else {
    const last = new Date(progress.lastStudyDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);
    if (diffDays === 1) progress.streak++;
    else if (diffDays > 1) progress.streak = 1;
  }
  progress.lastStudyDate = today;
}

// === 測驗 ===
function resetQuizSetup() {
  stopQuestionTimer();
  document.getElementById("quiz-setup").classList.remove("hidden");
  document.getElementById("quiz-game").classList.add("hidden");
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("quiz-defeat").classList.add("hidden");
  document.querySelectorAll(".quiz-mode-group button, .quiz-range-group button").forEach(b => b.classList.remove("active"));
  state.quiz = { mode: null, range: null, questions: [], idx: 0, correct: 0 };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryStartQuiz() {
  if (!state.quiz.mode || !state.quiz.range) return;
  let pool = [];
  if (state.quiz.range === "today") pool = state.todayWords;
  else if (state.quiz.range === "learned") pool = wordsPool.filter(w => progress.learnedIds.includes(w.id));
  else pool = wordsPool;

  if (pool.length < 4) {
    alert("題庫不足 4 字，無法產生選項。請先學完一些字或選擇較大範圍。");
    resetQuizSetup();
    return;
  }
  const numQuestions = state.quiz.range === "all" ? Math.min(25, pool.length) : Math.min(10, pool.length);
  state.quiz.questions = shuffle(pool).slice(0, numQuestions);
  state.quiz.pool = pool;
  state.quiz.idx = 0;
  state.quiz.correct = 0;
  document.getElementById("quiz-setup").classList.add("hidden");
  document.getElementById("quiz-game").classList.remove("hidden");
  initBattle();
  renderQuestion();
}

function renderQuestion() {
  // 三叉戟：中毒扣血
  if (battleState.poisoned && battleState.hp > 0) {
    battleState.poisoned = false;
    const pdmg = battleState.poisonDmg || 1;
    battleState.poisonDmg = 1;
    battleState.hp = Math.max(0, battleState.hp - pdmg);
    updateMonsterHP();
    showDamageNumber(pdmg, false, "#0984e3");
    if (battleState.hp <= 0) {
      const monsterEl = document.getElementById("monster-char");
      if (monsterEl) handleMonsterDeath(monsterEl);
    }
  }
  const q = state.quiz.questions[state.quiz.idx];
  const distractorPool = state.quiz.pool.length >= 4 ? state.quiz.pool : wordsPool;
  const wrongs = shuffle(distractorPool.filter(w => w.word !== q.word)).slice(0, 3);
  const options = shuffle([q, ...wrongs]);

  document.getElementById("q-current").textContent = state.quiz.idx + 1;
  document.getElementById("q-total").textContent = state.quiz.questions.length;
  document.getElementById("q-correct").textContent = state.quiz.correct;

  const isEnToZh = state.quiz.mode === "en-to-zh";
  const qEl = document.getElementById("quiz-question");
  if (isEnToZh) {
    qEl.innerHTML = "";
    const wordDiv = document.createElement("div");
    wordDiv.textContent = q.word;
    const speakBtn = document.createElement("button");
    speakBtn.className = "quiz-speak-btn";
    speakBtn.textContent = "🔊 發音";
    speakBtn.addEventListener("click", e => { e.stopPropagation(); speak(q.word); });
    qEl.appendChild(wordDiv);
    qEl.appendChild(speakBtn);
  } else {
    qEl.textContent = q.meaning;
  }

  const opts = document.getElementById("quiz-options");
  opts.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = isEnToZh ? opt.meaning : opt.word;
    btn.addEventListener("click", () => answerQuestion(btn, opt.word === q.word, q));
    opts.appendChild(btn);
  });

  document.getElementById("quiz-feedback").classList.add("hidden");
  document.getElementById("next-question").classList.add("hidden");
  startQuestionTimer();
}

function answerQuestion(btn, isCorrect, q) {
  const elapsed = questionStartTime ? Date.now() - questionStartTime : 99999;
  const weaponItem = getEquippedWeaponItem();
  const weaponType = weaponItem?.type;
  const wBonus = getWeaponBonus(weaponItem);
  // 火焰劍：爆擊機率隨等級提升
  const fireCrit = weaponType === "fire" && isCorrect && Math.random() < (0.15 + wBonus * 0.05);
  const isCritical = isCorrect && (elapsed <= getCriticalMs() || fireCrit);
  stopQuestionTimer();

  document.querySelectorAll("#quiz-options button").forEach(b => {
    b.disabled = true;
    if (b.textContent === (state.quiz.mode === "en-to-zh" ? q.meaning : q.word)) b.classList.add("correct");
  });
  if (!isCorrect) btn.classList.add("wrong");
  const fb = document.getElementById("quiz-feedback");
  if (isCorrect) {
    state.quiz.correct++;
    progress.quizCorrect++;
    battleState.consecutiveCorrect = (battleState.consecutiveCorrect || 0) + 1;
    if (isCritical) {
      // 龍魂聖劍：每 5 次爆擊治癒（隨等級增加回復量）
      if (weaponType === "holy" && battleState.consecutiveCorrect % 5 === 0) {
        const heal = 1 + wBonus;
        healPlayer(heal);
        showBattleEffect(`💎+${heal}HP`, "#f4a261");
      }
      // 三叉戟：爆擊後中毒（隨等級增加毒傷）
      if (weaponType === "trident") {
        const pdmg = 1 + wBonus;
        battleState.poisoned = true;
        battleState.poisonDmg = pdmg;
        showBattleEffect(`💧中毒-${pdmg}HP`, "#0984e3");
      }
      // 冰霜杖：爆擊凍結（隨等級延長秒數）
      if (weaponType === "ice") {
        const secs = 5 + wBonus;
        extendTimer(secs * 1000);
        showBattleEffect(`❄️凍結+${secs}s`, "#74b9ff");
      }
      // 戰錘：爆擊震盪（隨等級延長秒數）
      if (weaponType === "hammer") {
        const secs = 3 + wBonus;
        extendTimer(secs * 1000);
        showBattleEffect(`⚒️震盪+${secs}s`, "#636e72");
      }
    }
    fb.textContent = isCritical ? (fireCrit ? "🔥 燃燒爆擊！答對了！" : "⚡ 爆擊！答對了！") : "✓ 答對了!";
    fb.className = "quiz-feedback ok";
    triggerAttack(isCritical);
  } else {
    battleState.consecutiveCorrect = 0;
    progress.quizWrong++;
    fb.textContent = `✗ 答錯了。正解：${state.quiz.mode === "en-to-zh" ? q.meaning : q.word}`;
    fb.className = "quiz-feedback no";
    triggerMonsterAttack();
    // 迴旋鏢：答錯返回打擊（隨等級增加傷害）
    if (weaponType === "boomerang") {
      const bdmg = 1 + wBonus;
      setTimeout(() => {
        if (battleState.hp <= 0) return;
        battleState.hp = Math.max(0, battleState.hp - bdmg);
        updateMonsterHP();
        showDamageNumber(bdmg, false, "#e17055");
        showBattleEffect(`🪃返回-${bdmg}`, "#e17055");
        if (battleState.hp <= 0) {
          const monsterEl = document.getElementById("monster-char");
          if (monsterEl) handleMonsterDeath(monsterEl);
        }
      }, 700);
    }
  }
  saveProgress(progress);
  fb.classList.remove("hidden");
  document.getElementById("next-question").classList.remove("hidden");
  document.getElementById("q-correct").textContent = state.quiz.correct;

  // 熟記模式：每 5 題怪物自動出手一次
  if (state.quiz.range === "learned" && (state.quiz.idx + 1) % 5 === 0) {
    const isLastQuestion = (state.quiz.idx + 1) >= state.quiz.questions.length;
    // 最後一題先鎖住「下一題」，攻擊後存活才解鎖
    if (isLastQuestion) document.getElementById("next-question").classList.add("hidden");
    const gameEl = document.getElementById("quiz-game");
    setTimeout(() => {
      if (battleState.playerHp <= 0) {
        if (isLastQuestion) document.getElementById("next-question").classList.remove("hidden");
        return;
      }
      if (!gameEl || gameEl.classList.contains("hidden")) return;
      showBattleEffect("⚔️怪物出手！", "#e74c3c");
      setTimeout(() => {
        if (battleState.playerHp <= 0) return;
        if (!gameEl || gameEl.classList.contains("hidden")) return;
        triggerMonsterAttack();
        if (isLastQuestion) {
          // 等攻擊動畫結束（約 1.8 秒），存活則解鎖「下一題」
          setTimeout(() => {
            if (battleState.playerHp > 0) {
              document.getElementById("next-question").classList.remove("hidden");
            }
          }, 1900);
        }
      }, 600);
    }, 1000);
  }
}

function nextQuestion() {
  if (battleState.playerHp <= 0) return;
  state.quiz.idx++;
  if (state.quiz.idx >= state.quiz.questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function finishQuiz() {
  stopQuestionTimer();
  playVictorySfx();
  const chestEarned = checkSessionChallenge(state.quiz.mode);
  document.getElementById("quiz-game").classList.add("hidden");
  document.getElementById("quiz-result").classList.remove("hidden");
  const total = state.quiz.questions.length;
  const pct = Math.round((state.quiz.correct / total) * 100);
  let comment = "";
  if (pct === 100) comment = "🎉 全對! 完美!";
  else if (pct >= 80) comment = "👍 很棒，再接再厲!";
  else if (pct >= 60) comment = "💪 還可以，多複習幾次!";
  else comment = "📚 需要再多複習這些字。";
  const killed = (battleState.sessionMonstersKilled || 0) + (battleState.hp <= 0 ? 1 : 0);
  let chestLine = "";
  if (state.quiz.range === "learned") {
    const killCoins = killed * 2;
    let perfectBonus = "";
    if (state.quiz.correct === total) {
      addCoins(10);
      perfectBonus = `<br><span style="color:#f4a261;font-size:0.95rem">🌟 全對獎勵！💰+10 金幣</span>`;
    }
    chestLine = `<br><span style="color:#f4a261;font-size:0.95rem">💰 擊殺獎勵：+${killCoins} 金幣（${killed} 隻）</span>${perfectBonus}`;
  } else if (state.quiz.range === "all") {
    if (state.quiz.correct === total) {
      ensureChar();
      progress.char.rainbowTickets = (progress.char.rainbowTickets || 0) + 1;
      saveProgress(progress);
      chestLine = `<br><span style="color:#a29bfe;font-size:0.95rem">🌈 25 題全對！獲得彩虹券 ×1（目前 ${progress.char.rainbowTickets} 張）</span>`;
    } else {
      chestLine = `<br><span style="color:var(--text-light);font-size:0.9rem">答對 ${state.quiz.correct}/${total} 題，25 題全對可獲得 🌈 彩虹券</span>`;
    }
  } else if (chestEarned) {
    chestLine = `<br><span style="color:#f4a261;font-size:0.95rem">📦 任務達成！獲得寶箱 ×1（本場全對！）</span>`;
  } else if (state.quiz.correct < total) {
    chestLine = `<br><span style="color:var(--text-light);font-size:0.9rem">答對 ${state.quiz.correct}/${total} 題，需全對才達成每日任務</span>`;
  }
  document.getElementById("quiz-score").innerHTML = `
    答對 <strong>${state.quiz.correct}</strong> / ${total} 題 (${pct}%)<br>
    <span style="font-size:0.95rem;color:var(--text-light)">${comment}</span>
    ${chestLine}
  `;
}

// === 進度 ===
function renderProgress() {
  const learned = progress.learnedIds.length;
  const completedDays = progress.completedDates.length;
  const totalAvailable = wordsPool.length;
  const pctOfAvailable = ((learned / totalAvailable) * 100).toFixed(1);
  const pctOfTarget = ((learned / TOTAL_TARGET) * 100).toFixed(1);

  document.getElementById("stat-streak").textContent = progress.streak;
  document.getElementById("stat-days").textContent = completedDays;
  document.getElementById("stat-words").textContent = learned;
  document.getElementById("stat-percent").textContent = pctOfTarget + "%";
  document.getElementById("progress-current").textContent = learned;
  document.getElementById("progress-total").textContent = TOTAL_TARGET;
  document.getElementById("progress-fill").style.width = pctOfTarget + "%";
  document.getElementById("available-info").textContent = `目前單字池：${totalAvailable} 字（已熟記 ${learned}，${pctOfAvailable}%）`;

  document.getElementById("total-correct").textContent = progress.quizCorrect;
  document.getElementById("total-wrong").textContent = progress.quizWrong;
  const total = progress.quizCorrect + progress.quizWrong;
  const acc = total > 0 ? Math.round((progress.quizCorrect / total) * 100) : 0;
  document.getElementById("accuracy").textContent = acc + "%";
}

function searchWords(q) {
  const results = document.getElementById("search-results");
  results.innerHTML = "";
  if (!q.trim()) return;
  const lower = q.trim().toLowerCase();
  const matches = wordsPool.filter(w =>
    w.word.toLowerCase().includes(lower) || w.meaning.includes(q.trim())
  );
  if (matches.length === 0) {
    results.innerHTML = '<div style="color:var(--text-light);padding:8px 0">無相符結果</div>';
    return;
  }
  matches.slice(0, 20).forEach(m => {
    const learned = progress.learnedIds.includes(m.id);
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <span class="result-en">${m.word}</span>
      <span class="result-zh"> — ${m.meaning}</span>
      <span class="result-day"> [${m.level}${learned ? " ✓" : ""}]</span>
    `;
    div.addEventListener("click", () => {
      state.todayWords = [m];
      state.currentCard = 0;
      state.flipped = false;
      switchView("cards");
      document.getElementById("date-label").textContent = "搜尋：" + m.word;
      renderCard();
    });
    results.appendChild(div);
  });
}

function resetAllProgress() {
  if (!confirm("確定要重設所有學習進度與測驗統計嗎? 此動作無法復原。")) return;
  progress = newProgress();
  saveProgress(progress);
  loadTodayWords();
  renderCard();
  renderProgress();
}

// === 戰鬥系統 ===
const MONSTERS = ["👹", "🐉", "💀", "🧟", "👾", "🦇", "🐺", "🧌", "🦂", "👻"];
const AVATARS = ["🧙","🧝","🦸","🧜","🧚","🧞","🦊","🐱","🐶","🐼","🦁","🐯","🐸","🐧","🐺","🦅"];

const WEAPON_TYPES = [
  { key: "dagger",    name: "匕首",     emoji: "🗡️",  hit: ["⚔️"],        color: "#b2bec3", special: "⚡速攻：25% 機率追加 -1 攻擊" },
  { key: "bow",       name: "弓箭",     emoji: "🏹",  hit: ["🏹"],        color: "#00b894", projectile: true,  projEmoji: "➤",  special: "🏹穿透：答對額外 +1 傷害" },
  { key: "staff",     name: "魔法杖",   emoji: "🪄",  hit: ["✨", "💫"],  color: "#a29bfe", special: "✨魔力回復：擊殺怪物後計時 +4 秒" },
  { key: "boomerang", name: "迴旋鏢",   emoji: "🪃",  hit: ["🪃", "💥"],  color: "#e17055", projectile: true,  projEmoji: "🪃",  special: "🪃返回打擊：答錯仍造成 1 傷害" },
  { key: "hammer",    name: "戰錘",     emoji: "⚒️",  hit: ["💢", "💥"],  color: "#636e72", special: "⚒️震盪：爆擊時計時 +3 秒" },
  { key: "trident",   name: "三叉戟",   emoji: "🔱",  hit: ["🔱", "💧"],  color: "#0984e3", special: "💧海神之毒：答對使怪物中毒，下題 -1HP" },
  { key: "fire",      name: "火焰劍",   emoji: "🔥",  hit: ["🔥", "💥"],  color: "#d63031", special: "🔥燃燒：爆擊機率額外 +15%" },
  { key: "ice",       name: "冰霜杖",   emoji: "❄️",  hit: ["❄️", "💫"],  color: "#74b9ff", special: "❄️凍結：答對後計時停止 5 秒" },
  { key: "thunder",   name: "雷霆錘",   emoji: "⚡",  hit: ["⚡", "💥"],  color: "#fdcb6e", special: "⚡連鎖閃電：爆擊追加 +2 傷害" },
  { key: "dark",      name: "暗黑之刃", emoji: "🌙",  hit: ["🌑", "💀"],  color: "#6c5ce7", special: "🌙吸血：擊殺怪物後回復 1HP" },
  { key: "holy",      name: "龍魂聖劍", emoji: "💎",  hit: ["✨", "💎"],  color: "#f4a261", special: "💎神聖庇護：每 5 題答對自動治癒 1HP" },
  { key: "dragon_sword", name: "巨龍神劍", emoji: "🐉", hit: ["🔥", "❄️", "⚡"], color: "#ffd700", special: "🐉龍息：爆擊造成 3 倍傷害・每次攻擊累積護盾（最高 10HP）" },
];

const STAGE_WEAPON_POOLS = [
  ["dagger", "bow", "staff"],   // 0: 10HP 三種基礎武器
  ["boomerang"],                 // 1: 15HP
  ["hammer"],                    // 2: 20HP
  ["trident"],                   // 3: 25HP
  ["fire", "ice"],               // 4: 30HP
  ["ice", "thunder"],            // 5: 35HP
  ["thunder", "dark"],           // 6: 40HP
  ["dark", "thunder"],           // 7: 45HP
  ["dark", "holy"],              // 8: 50HP
];

function getWeaponTypeData(key) {
  return WEAPON_TYPES.find(w => w.key === key) || WEAPON_TYPES[0];
}
const CRITICAL_MS = 10000;
function getCriticalMs() {
  return (state.quiz && state.quiz.range === "learned") ? 5000 : CRITICAL_MS;
}

// 動態數值（依進度/角色等級）
function getMonsterStage() {
  const days = progress.completedDates ? progress.completedDates.length : 0;
  return Math.min(8, Math.floor(days / 31.25));
}
function getLearnedMonsterTier() {
  const learned = Math.min((progress.learnedIds || []).length, 3000);
  return Math.floor(learned / 30);
}
function getMonsterMaxHp() {
  if (state.quiz && state.quiz.range === "all") return 1500;
  if (state.quiz && state.quiz.range === "learned") return 30 + getLearnedMonsterTier() * 2;
  const HP_STAGES = [10, 15, 20, 25, 30, 35, 40, 45, 50];
  return HP_STAGES[getMonsterStage()];
}
function getMonsterAttack() {
  if (state.quiz && state.quiz.range === "learned") {
    return 1 + Math.floor(getLearnedMonsterTier() / 25);
  }
  return getMonsterStage() + 1;
}
function getPlayerMaxHp() {
  return (progress.char && progress.char.maxHp) ? progress.char.maxHp : 3;
}
function getPlayerAttack() {
  if (!progress.char || !progress.char.equippedWeapon) return 1;
  const w = (progress.char.weaponInventory || []).find(x => x.type === progress.char.equippedWeapon);
  if (!w) return 1;
  return 1 + (w.attack || 0) + (w.level || 0);
}

function getEquippedWeaponItem() {
  if (!progress.char || !progress.char.equippedWeapon) return null;
  return (progress.char.weaponInventory || []).find(x => x.type === progress.char.equippedWeapon) || null;
}

function getWeaponBonus(item) {
  return Math.floor((item?.level || 0) / 2);
}

function getWeaponSpecialDesc(wt, item) {
  const b = getWeaponBonus(item);
  switch (wt.key) {
    case "dagger":    return `⚡速攻：爆擊 ${25 + b * 5}% 機率追加 -1`;
    case "bow":       return `🏹穿透：爆擊額外 +${1 + b} 傷害`;
    case "staff":     return `✨魔力回復：擊殺後計時 +${4 + b}s`;
    case "boomerang": return `🪃返回打擊：答錯造成 ${1 + b} 傷害`;
    case "hammer":    return `⚒️震盪：爆擊計時 +${3 + b}s`;
    case "trident":   return `💧海神之毒：爆擊中毒 -${1 + b}HP`;
    case "fire":      return `🔥燃燒：爆擊機率 +${15 + b * 5}%`;
    case "ice":       return `❄️凍結：爆擊計時 +${5 + b}s`;
    case "thunder":   return `⚡連鎖閃電：爆擊追加 +${2 + b} 傷害`;
    case "dark":      return `🌙吸血：擊殺回復 ${1 + b}HP`;
    case "holy":         return `💎神聖庇護：每 5 爆擊治癒 ${1 + b}HP`;
    case "dragon_sword": return `🐉龍息：爆擊 3 倍傷害・每次攻擊累積 +2🛡️（上限 10）`;
    default:             return wt.special || "";
  }
}

let battleState = { hp: 10, monsterMaxHp: 10, monsterIdx: 0, playerHp: 3, sessionMonstersKilled: 0, poisoned: false, poisonDmg: 1, consecutiveCorrect: 0, pendingTimerExtend: 0, dragonShield: 0 };
let questionStartTime = null;
let timerInterval = null;

function initBattle() {
  const mHp = getMonsterMaxHp();
  battleState = { hp: mHp, monsterMaxHp: mHp, monsterIdx: 0, playerHp: getPlayerMaxHp(), sessionMonstersKilled: 0, poisoned: false, poisonDmg: 1, consecutiveCorrect: 0, pendingTimerExtend: 0, dragonShield: 0 };
  const mChar = document.getElementById("monster-char");
  if (mChar) { mChar.textContent = state.quiz?.range === "all" ? "🐉" : MONSTERS[0]; mChar.className = "battle-char"; }
  const pChar = document.getElementById("player-char");
  if (pChar) { pChar.textContent = progress.char?.avatar || "🧙"; pChar.className = "battle-char"; }
  updateMonsterHP();
  updatePlayerHP();
}

function updateMonsterHP() {
  const hp = Math.max(0, battleState.hp);
  const max = battleState.monsterMaxHp || 10;
  const pct = (hp / max) * 100;
  const fill = document.getElementById("monster-hp-fill");
  const val = document.getElementById("monster-hp-val");
  const maxEl = document.getElementById("monster-hp-max-val");
  if (!fill || !val) return;
  fill.style.width = pct + "%";
  fill.style.background = pct > 60 ? "#27ae60" : pct > 30 ? "#f39c12" : "#e74c3c";
  val.textContent = hp;
  if (maxEl) maxEl.textContent = max;
}

function updatePlayerHP() {
  const el = document.getElementById("player-hp-num");
  if (!el) return;
  const hp = Math.max(0, battleState.playerHp);
  const maxHp = getPlayerMaxHp();
  el.textContent = `${hp}/${maxHp}`;
  el.style.color = hp <= 1 ? "#e74c3c" : hp <= Math.ceil(maxHp / 2) ? "#f39c12" : "#27ae60";
  updateQuizPotionBtn();
}

function updateShieldDisplay() {
  const el = document.getElementById("dragon-shield-bar");
  if (!el) return;
  const shield = battleState.dragonShield || 0;
  if (shield > 0) {
    el.classList.remove("hidden");
    el.textContent = `🛡️ ${shield}/10`;
  } else {
    el.classList.add("hidden");
  }
}

function updateQuizPotionBtn() {
  const btn = document.getElementById("quiz-use-potion-btn");
  const countEl = document.getElementById("quiz-potion-count");
  if (!btn) return;
  const count = (progress.char && progress.char.potions) ? progress.char.potions : 0;
  if (countEl) countEl.textContent = count;
  const maxHp = getPlayerMaxHp();
  btn.disabled = count <= 0 || battleState.playerHp >= maxHp;
}

function startQuestionTimer() {
  const extend = battleState.pendingTimerExtend || 0;
  battleState.pendingTimerExtend = 0;
  questionStartTime = Date.now() + extend;
  clearInterval(timerInterval);
  const bar = document.getElementById("timer-bar");
  if (!bar) return;
  bar.style.width = "100%";
  bar.style.background = "#27ae60";
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - questionStartTime;
    const critMs = getCriticalMs();
    const pct = Math.max(0, 100 - (elapsed / critMs) * 100);
    if (bar) {
      bar.style.width = pct + "%";
      bar.style.background = pct > 60 ? "#27ae60" : pct > 30 ? "#f39c12" : "#e74c3c";
    }
    if (elapsed >= critMs) clearInterval(timerInterval);
  }, 80);
}

function stopQuestionTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// === 音效系統 ===
let _sfxCtx = null;
let _sfxMuted = false;

function getSfxCtx() {
  if (!_sfxCtx) {
    try { _sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
  }
  if (_sfxCtx.state === 'suspended') _sfxCtx.resume();
  return _sfxCtx;
}

function unlockSfx() {
  const ctx = getSfxCtx();
  if (!ctx) return;
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  ctx.resume();
}

function initSfxUnlock() {
  const handler = () => {
    unlockSfx();
    document.removeEventListener('touchstart', handler, true);
    document.removeEventListener('click', handler, true);
  };
  document.addEventListener('touchstart', handler, { capture: true, passive: true });
  document.addEventListener('click', handler, { capture: true });
}

function sfxOsc(ctx, type, freqStart, freqEnd, dur, vol, startAt) {
  const t = startAt !== undefined ? startAt : ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t);
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function sfxNoise(ctx, filterFreq, filterType, dur, vol, startAt) {
  const t = startAt !== undefined ? startAt : ctx.currentTime;
  const bufSize = Math.ceil(ctx.sampleRate * Math.max(dur, 0.05));
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = filterType || 'lowpass';
  filt.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

function playWeaponSfx(weaponKey) {
  if (_sfxMuted) return;
  const ctx = getSfxCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  switch (weaponKey) {
    case 'dagger':
      sfxOsc(ctx, 'sine', 800, 250, 0.13, 0.3);
      sfxNoise(ctx, 3000, 'highpass', 0.06, 0.15);
      break;
    case 'bow':
      sfxNoise(ctx, 800, 'bandpass', 0.08, 0.18);
      sfxOsc(ctx, 'sawtooth', 350, 60, 0.28, 0.15);
      break;
    case 'staff':
      sfxOsc(ctx, 'sine', 880, 1760, 0.35, 0.18);
      sfxOsc(ctx, 'sine', 1320, 2640, 0.2, 0.1);
      break;
    case 'boomerang':
      sfxOsc(ctx, 'sine', 250, 600, 0.22, 0.18, t);
      sfxOsc(ctx, 'sine', 600, 200, 0.22, 0.18, t + 0.22);
      break;
    case 'hammer':
      sfxOsc(ctx, 'sine', 120, 30, 0.18, 0.45);
      sfxNoise(ctx, 300, 'lowpass', 0.12, 0.3);
      break;
    case 'trident':
      sfxOsc(ctx, 'sine', 660, 330, 0.2, 0.2);
      sfxNoise(ctx, 1000, 'bandpass', 0.15, 0.15);
      break;
    case 'fire':
      sfxNoise(ctx, 2000, 'bandpass', 0.32, 0.28);
      sfxNoise(ctx, 4000, 'highpass', 0.1, 0.18);
      break;
    case 'ice':
      sfxOsc(ctx, 'sine', 2093, 1047, 0.3, 0.2);
      sfxOsc(ctx, 'sine', 4186, 2093, 0.18, 0.1);
      break;
    case 'thunder':
      sfxOsc(ctx, 'square', 600, 50, 0.1, 0.35);
      sfxNoise(ctx, 8000, 'highpass', 0.15, 0.28);
      break;
    case 'dark':
      sfxOsc(ctx, 'sawtooth', 200, 55, 0.38, 0.25);
      sfxOsc(ctx, 'sawtooth', 100, 40, 0.38, 0.18);
      break;
    case 'holy':
      sfxOsc(ctx, 'sine', 1047, 1047, 0.5, 0.2);
      sfxOsc(ctx, 'sine', 1568, 1568, 0.4, 0.12);
      sfxOsc(ctx, 'sine', 2093, 2093, 0.3, 0.08);
      break;
    default:
      sfxOsc(ctx, 'sine', 600, 200, 0.15, 0.25);
  }
}

function playMonsterAttackSfx() {
  if (_sfxMuted) return;
  const ctx = getSfxCtx(); if (!ctx) return;
  sfxOsc(ctx, 'sawtooth', 130, 65, 0.22, 0.3);
  sfxNoise(ctx, 400, 'lowpass', 0.18, 0.22);
}

function playMonsterDeathSfx() {
  if (_sfxMuted) return;
  const ctx = getSfxCtx(); if (!ctx) return;
  sfxOsc(ctx, 'sine', 500, 80, 0.45, 0.3);
  sfxNoise(ctx, 1500, 'bandpass', 0.2, 0.22);
}

function playVictorySfx() {
  if (_sfxMuted) return;
  const ctx = getSfxCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => sfxOsc(ctx, 'sine', freq, freq, 0.18, 0.25, t + i * 0.2));
}

function playDefeatSfx() {
  if (_sfxMuted) return;
  const ctx = getSfxCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [523, 494, 466, 440].forEach((freq, i) => sfxOsc(ctx, 'sine', freq, freq * 0.92, 0.28, 0.22, t + i * 0.3));
}

function showDamageNumber(dmg, isCritical, color) {
  const arena = document.getElementById("battle-arena");
  if (!arena) return;
  const el = document.createElement("div");
  el.className = "damage-number" + (isCritical ? " crit-dmg" : "");
  el.textContent = `-${dmg}`;
  el.style.color = color || "#fff";
  el.style.left = (52 + Math.random() * 18) + "%";
  el.style.top = (22 + Math.random() * 22) + "%";
  arena.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function createParticles(wt, isCritical) {
  const arena = document.getElementById("battle-arena");
  if (!arena) return;
  const count = isCritical ? 10 : 5;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "battle-particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 55;
    el.style.cssText = `left:${58+(Math.random()-0.5)*18}%;top:${42+(Math.random()-0.5)*18}%;color:${wt.color};font-size:${0.6+Math.random()*0.9}rem;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist-22}px;animation-duration:${0.45+Math.random()*0.4}s;`;
    el.textContent = wt.hit[Math.floor(Math.random() * wt.hit.length)];
    arena.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

function shakeArena(isCritical) {
  const arena = document.getElementById("battle-arena");
  if (!arena) return;
  arena.classList.remove("shaking", "shaking-big");
  void arena.offsetWidth;
  arena.classList.add(isCritical ? "shaking-big" : "shaking");
  setTimeout(() => arena.classList.remove("shaking", "shaking-big"), 520);
}

function extendTimer(ms) {
  battleState.pendingTimerExtend = (battleState.pendingTimerExtend || 0) + ms;
}

function healPlayer(amount) {
  const maxHp = getPlayerMaxHp();
  if (battleState.playerHp >= maxHp) return;
  battleState.playerHp = Math.min(battleState.playerHp + amount, maxHp);
  updatePlayerHP();
}

function showBattleEffect(text, color) {
  const arena = document.getElementById("battle-arena");
  if (!arena) return;
  const el = document.createElement("div");
  el.className = "battle-effect-text";
  el.textContent = text;
  el.style.color = color || "#fff";
  el.style.left = (18 + Math.random() * 40) + "%";
  el.style.top  = (12 + Math.random() * 40) + "%";
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

function handleMonsterDeath(monsterEl) {
  monsterEl.classList.add("dying");
  playMonsterDeathSfx();
  setTimeout(() => {
    onMonsterKilled();
    battleState.monsterIdx = (battleState.monsterIdx + 1) % MONSTERS.length;
    const newMHp = getMonsterMaxHp();
    battleState.monsterMaxHp = newMHp;
    battleState.hp = newMHp;
    monsterEl.textContent = state.quiz?.range === "all" ? "🐉" : MONSTERS[battleState.monsterIdx];
    monsterEl.className = "battle-char appearing";
    updateMonsterHP();
    setTimeout(() => monsterEl.classList.remove("appearing"), 500);
  }, 650);
}

function triggerAttack(isCritical) {
  const playerEl = document.getElementById("player-char");
  const monsterEl = document.getElementById("monster-char");
  const hitEl = document.getElementById("hit-effect");
  const critEl = document.getElementById("critical-text");
  if (!playerEl || !monsterEl) return;

  playerEl.classList.remove("attacking");
  void playerEl.offsetWidth;
  playerEl.classList.add("attacking");

  setTimeout(() => {
    const equippedItem = getEquippedWeaponItem();
    const wt = getWeaponTypeData(equippedItem?.type);
    const wBonus = getWeaponBonus(equippedItem);
    const arenaEl = document.getElementById("battle-arena");
    // 武器特效：箭矢投射
    if (wt.projectile && arenaEl) {
      const proj = document.createElement("div");
      proj.className = "weapon-projectile";
      proj.textContent = wt.projEmoji || "➤";
      proj.style.color = wt.color;
      arenaEl.appendChild(proj);
      setTimeout(() => proj.remove(), 280);
    }
    if (hitEl) {
      const h = wt.hit;
      hitEl.textContent = isCritical ? (h.length > 1 ? h[0] + h[1] : h[0] + h[0]) : h[0];
      hitEl.style.color = wt.color;
      hitEl.classList.remove("burst");
      void hitEl.offsetWidth;
      hitEl.classList.add("burst");
    }
    // 武器特效：閃光
    if (arenaEl) {
      const flash = document.createElement("div");
      flash.className = "weapon-flash";
      flash.style.background = wt.color;
      arenaEl.appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    }
    // 武器特效：攻擊斬線
    if (arenaEl) {
      const slash = document.createElement("div");
      slash.className = "weapon-slash-streak" + (isCritical ? " slash-crit" : "");
      slash.style.background = `linear-gradient(90deg,transparent,${wt.color},#fff,${wt.color},transparent)`;
      arenaEl.appendChild(slash);
      setTimeout(() => slash.remove(), 380);
    }
    const atk = getPlayerAttack();
    let dmg = isCritical ? (wt.key === "dragon_sword" ? atk * 3 : atk * 2) : atk;
    if (isCritical) {
      // 弓箭：爆擊穿透（隨等級增加傷害）
      if (wt.key === "bow") dmg += 1 + wBonus;
      // 雷霆錘：爆擊連鎖閃電（隨等級增加傷害）
      if (wt.key === "thunder") {
        const bonus = 2 + wBonus;
        dmg += bonus;
        showBattleEffect(`⚡連鎖+${bonus}`, wt.color);
      }
    }
    if (isCritical && critEl) {
      critEl.textContent = `CRITICAL!! -${dmg}HP`;
      critEl.classList.remove("crit-anim");
      void critEl.offsetWidth;
      critEl.classList.add("crit-anim");
    }
    monsterEl.classList.remove("hit");
    void monsterEl.offsetWidth;
    monsterEl.classList.add("hit");
    battleState.hp -= dmg;
    updateMonsterHP();
    showDamageNumber(dmg, isCritical, wt.color);
    createParticles(wt, isCritical);
    shakeArena(isCritical);
    playWeaponSfx(equippedItem?.type || 'dagger');
    // 巨龍神劍：每次攻擊累積護盾 +2（上限 10）
    if (wt.key === "dragon_sword") {
      battleState.dragonShield = Math.min(10, (battleState.dragonShield || 0) + 2);
      showBattleEffect(`🛡️${battleState.dragonShield}/10`, "#ffd700");
      updateShieldDisplay();
    }

    setTimeout(() => {
      monsterEl.classList.remove("hit");
      playerEl.classList.remove("attacking");
      if (battleState.hp <= 0) {
        handleMonsterDeath(monsterEl);
        return;
      }
      // 匕首：爆擊速攻（隨等級提升觸發機率）
      if (isCritical && wt.key === "dagger" && Math.random() < (0.25 + wBonus * 0.05)) {
        setTimeout(() => {
          if (battleState.hp <= 0) return;
          battleState.hp = Math.max(0, battleState.hp - 1);
          updateMonsterHP();
          showDamageNumber(1, false, wt.color);
          showBattleEffect("🗡️速攻", wt.color);
          if (battleState.hp <= 0) handleMonsterDeath(monsterEl);
        }, 220);
      }
    }, 550);
  }, 280);
}

function triggerMonsterAttack() {
  const monsterEl = document.getElementById("monster-char");
  const playerEl = document.getElementById("player-char");
  if (!monsterEl || !playerEl) return;

  monsterEl.classList.remove("monster-attacking");
  void monsterEl.offsetWidth;
  monsterEl.classList.add("monster-attacking");

  setTimeout(() => {
    playerEl.classList.remove("player-hit");
    void playerEl.offsetWidth;
    playerEl.classList.add("player-hit");
    let monsterDmg = getMonsterAttack();
    if (battleState.dragonShield > 0) {
      const absorbed = Math.min(battleState.dragonShield, monsterDmg);
      battleState.dragonShield -= absorbed;
      monsterDmg -= absorbed;
      showBattleEffect(`🛡️-${absorbed}`, "#ffd700");
      updateShieldDisplay();
    }
    battleState.playerHp = Math.max(0, battleState.playerHp - monsterDmg);
    updatePlayerHP();
    shakeArena(false);
    playMonsterAttackSfx();

    setTimeout(() => {
      monsterEl.classList.remove("monster-attacking");
      playerEl.classList.remove("player-hit");
      if (battleState.playerHp <= 0) {
        playerEl.classList.add("player-dying");
        setTimeout(showDefeat, 700);
      }
    }, 550);
  }, 280);
}

function showDefeat() {
  stopQuestionTimer();
  playDefeatSfx();
  checkSessionChallenge(state.quiz.mode);
  document.getElementById("quiz-game").classList.add("hidden");
  document.getElementById("quiz-defeat").classList.remove("hidden");
  const total = state.quiz.questions.length;
  const pct = total > 0 ? Math.round((state.quiz.correct / total) * 100) : 0;
  document.getElementById("defeat-score").innerHTML =
    `答對 <strong>${state.quiz.correct}</strong> / ${total} 題（${pct}%）<br>
     <span style="color:var(--text-light);font-size:0.9rem">學習者 HP 歸零，下次加油！</span>`;
}

// === 角色系統 ===
const EXP_PER_LEVEL = 10;
const LEVELS_PER_HP_UP = 5;

function ensureChar() {
  if (!progress.char) progress.char = { level: 1, exp: 0, maxHp: 3, weapon: null, potions: 0, chests: 0, coins: 0 };
  if (progress.char.coins === undefined) progress.char.coins = 0;
}

function addCoins(amount) {
  ensureChar();
  progress.char.coins = (progress.char.coins || 0) + amount;
  saveProgress(progress);
  updateCoinsDisplay();
}

function updateCoinsDisplay() {
  const val = (progress.char && progress.char.coins) || 0;
  document.querySelectorAll(".coins-display").forEach(el => el.textContent = val);
}

function checkDailyLogin() {
  const today = todayDateString();
  if (progress.lastLoginDate === today) return;
  progress.lastLoginDate = today;
  ensureChar();
  progress.char.chests++;
  saveProgress(progress);
  const toast = document.getElementById("challenge-toast");
  if (toast) {
    toast.textContent = "🎁 每日登入獎勵！獲得寶箱 ×1";
    toast.classList.remove("hidden", "show");
    void toast.offsetWidth;
    toast.classList.add("show");
    setTimeout(() => toast.classList.add("hidden"), 2800);
  }
}

function giveLevelUpWeapons() {
  ensureChar();
  const stage = getMonsterStage();
  const pool = STAGE_WEAPON_POOLS[stage] || ["dagger"];
  const typeKey = pool[Math.floor(Math.random() * pool.length)];
  const wt = getWeaponTypeData(typeKey);
  const atk = Math.max(1, stage);
  const inv = progress.char.weaponInventory || [];
  let upgradeText = "";
  for (let i = 0; i < 2; i++) {
    const existing = inv.find(x => x.type === typeKey);
    if (existing) {
      existing.attack = Math.max(existing.attack, atk);
      existing.count = (existing.count || 0) + 1;
      if (existing.count >= 5) {
        existing.count -= 5;
        existing.level = (existing.level || 0) + 1;
        upgradeText = `<br>🎉 ${wt.name} 升級！Lv.${existing.level}`;
      }
    } else {
      inv.push({ type: typeKey, attack: atk, level: 0, count: 1 });
      if (!progress.char.equippedWeapon) progress.char.equippedWeapon = typeKey;
    }
  }
  progress.char.weaponInventory = inv;
  saveProgress(progress);
  showChestModal("🆙", `升級獎勵！獲得 ${wt.emoji}${wt.name} 碎片 ×2${upgradeText}`);
}

function renderShop() {
  const coins = (progress.char && progress.char.coins) || 0;
  const tickets = (progress.char && progress.char.rainbowTickets) || 0;
  document.querySelectorAll(".coins-display").forEach(el => el.textContent = coins);
  const shopCoins = document.getElementById("shop-coins-val");
  if (shopCoins) shopCoins.textContent = coins;
  const shopRainbow = document.getElementById("shop-rainbow-val");
  if (shopRainbow) shopRainbow.textContent = tickets;
}

function buyItem(item, cost) {
  ensureChar();
  // 彩虹券商品
  if (item === "dragon_sword") {
    const tickets = progress.char.rainbowTickets || 0;
    const inv = progress.char.weaponInventory || [];
    const existing = inv.find(x => x.type === "dragon_sword");
    if (existing) { alert("已擁有巨龍神劍！彩虹券未消耗。"); return; }
    if (tickets < cost) { alert(`彩虹券不足！需要 🌈${cost}，目前 🌈${tickets}`); return; }
    progress.char.rainbowTickets -= cost;
    inv.push({ type: "dragon_sword", attack: 20, level: 0, count: 0 });
    if (!progress.char.equippedWeapon) progress.char.equippedWeapon = "dragon_sword";
    progress.char.weaponInventory = inv;
    saveProgress(progress);
    renderShop();
    showChestModal("🐉", `獲得 巨龍神劍！<br><span style="font-size:0.85rem;color:#ffd700">傳說武器・基礎攻擊 20・不可升階</span>`);
    return;
  }
  const coins = progress.char.coins || 0;
  if (coins < cost) { alert(`金幣不足！需要 💰${cost}，目前 💰${coins}`); return; }
  progress.char.coins -= cost;
  if (item === "potion") {
    progress.char.potions++;
    saveProgress(progress);
    updateCoinsDisplay();
    renderShop();
    alert(`購買成功！🧪 HP 藥水 ×1（目前 ${progress.char.potions} 瓶）`);
  } else if (item === "weapon") {
    const stage = getMonsterStage();
    const pool = STAGE_WEAPON_POOLS[stage] || ["dagger"];
    const typeKey = pool[Math.floor(Math.random() * pool.length)];
    const wt = getWeaponTypeData(typeKey);
    const atk = Math.max(1, stage);
    const inv = progress.char.weaponInventory || [];
    const existing = inv.find(x => x.type === typeKey);
    let upgradeText = "";
    if (existing) {
      existing.attack = Math.max(existing.attack, atk);
      existing.count = (existing.count || 0) + 1;
      if (existing.count >= 5) {
        existing.count -= 5;
        existing.level = (existing.level || 0) + 1;
        upgradeText = `<br>🎉 ${wt.name} 升級！Lv.${existing.level}`;
      }
    } else {
      inv.push({ type: typeKey, attack: atk, level: 0, count: 1 });
      if (!progress.char.equippedWeapon) progress.char.equippedWeapon = typeKey;
    }
    progress.char.weaponInventory = inv;
    saveProgress(progress);
    updateCoinsDisplay();
    renderShop();
    showChestModal(wt.emoji, `${wt.name} 碎片 ×1${upgradeText}`);
  } else if (item === "exp") {
    saveProgress(progress);
    const leveled = addExp(1);
    updateCoinsDisplay();
    renderShop();
    if (leveled) renderCharPanel();
    alert(`購買成功！✨ EXP +1${leveled ? `\n🎉 升級！Lv.${progress.char.level}` : ""}`);
  }
}
function ensureDailyTasks() {
  const today = todayDateString();
  if (!progress.dailyTasks || progress.dailyTasks.date !== today) {
    progress.dailyTasks = { date: today, enToZhDone: false, zhToEnDone: false, monstersKilled: 0, challengeDone: false, bonusKillsEnToZh: 0, bonusKillsZhToEn: 0 };
    saveProgress(progress);
  } else {
    if (progress.dailyTasks.monstersKilled === undefined) progress.dailyTasks.monstersKilled = 0;
    if (progress.dailyTasks.challengeDone === undefined) progress.dailyTasks.challengeDone = false;
    if (progress.dailyTasks.bonusKillsEnToZh === undefined) progress.dailyTasks.bonusKillsEnToZh = 0;
    if (progress.dailyTasks.bonusKillsZhToEn === undefined) progress.dailyTasks.bonusKillsZhToEn = 0;
  }
}

function addExp(amount) {
  ensureChar();
  progress.char.exp += amount;
  let leveled = false;
  while (progress.char.exp >= EXP_PER_LEVEL) {
    progress.char.exp -= EXP_PER_LEVEL;
    progress.char.level++;
    leveled = true;
    if (progress.char.level % LEVELS_PER_HP_UP === 0) progress.char.maxHp++;
  }
  saveProgress(progress);
  if (leveled) setTimeout(() => giveLevelUpWeapons(), 400);
  return leveled;
}

function completeDailyTask(mode) {
  ensureChar();
  ensureDailyTasks();
  const key = mode === "en-to-zh" ? "enToZhDone" : "zhToEnDone";
  if (!progress.dailyTasks[key]) {
    progress.dailyTasks[key] = true;
    progress.char.chests++;
    saveProgress(progress);
    return true;
  }
  return false;
}

function awardDailyChallenge() {
  if (progress.dailyTasks.challengeDone) return;
  if (!progress.dailyTasks.enToZhDone || !progress.dailyTasks.zhToEnDone) return;
  progress.dailyTasks.challengeDone = true;
  const expGain = Math.floor(Math.random() * 3) + 1;
  addExp(expGain);
  saveProgress(progress);
  showDailyChallengeReward(expGain);
}

function openChest() {
  ensureChar();
  if (progress.char.chests <= 0) { alert("目前沒有寶箱！完成每日任務來獲得寶箱。"); return; }
  progress.char.chests--;
  saveProgress(progress);

  const roll = Math.random();
  let emoji, text;
  if (roll < 0.35) {
    const leveled = addExp(1);
    emoji = "✨";
    text = leveled
      ? `獲得 EXP +1！<br>🎉 升級！現在 Lv.${progress.char.level}${progress.char.level % LEVELS_PER_HP_UP === 0 ? "<br>💪 最大 HP +1！" : ""}`
      : `獲得 EXP +1<br>（${progress.char.exp} / ${EXP_PER_LEVEL}）`;
  } else if (roll < 0.65) {
    progress.char.potions++;
    saveProgress(progress);
    emoji = "🧪";
    text = `獲得 HP 藥水 ×1！<br>（目前：${progress.char.potions} 瓶）`;
  } else if (roll < 0.90) {
    const stage = getMonsterStage();
    const weaponMin = Math.max(1, stage);
    const weaponMax = stage + 1;
    const atk = Math.floor(Math.random() * (weaponMax - weaponMin + 1)) + weaponMin;
    const pool = STAGE_WEAPON_POOLS[stage] || ["dagger"];
    const typeKey = pool[Math.floor(Math.random() * pool.length)];
    const wt = getWeaponTypeData(typeKey);
    emoji = wt.emoji;
    const inv = progress.char.weaponInventory || [];
    const existing = inv.find(x => x.type === typeKey);
    if (existing) {
      existing.attack = Math.max(existing.attack, atk);
      existing.count = (existing.count || 0) + 1;
      let upgradeText = "";
      if (existing.count >= 5) {
        existing.count -= 5;
        existing.level = (existing.level || 0) + 1;
        upgradeText = `<br>🎉 ${wt.name} 升級！Lv.${existing.level}（傷害 +${existing.attack + existing.level}）`;
        emoji = "🆙";
      }
      text = `${wt.name} ×${existing.count}/5${upgradeText}`;
    } else {
      inv.push({ type: typeKey, attack: atk, level: 0, count: 1 });
      if (!progress.char.equippedWeapon) progress.char.equippedWeapon = typeKey;
      text = `獲得 ${wt.name}！攻擊力 +${atk}<br><span style="font-size:0.85rem;color:var(--text-light)">新武器已加入武器庫</span>`;
    }
    progress.char.weaponInventory = inv;
    saveProgress(progress);
  } else {
    emoji = "💨";
    text = "空箱子……什麼都沒有";
  }
  showChestModal(emoji, text);
  renderCharPanel();
}

function showChestModal(emoji, text) {
  const modal = document.getElementById("chest-modal");
  const animEl = document.getElementById("chest-anim");
  const textEl = document.getElementById("chest-reward-text");
  animEl.textContent = "📦";
  animEl.classList.remove("chest-open");
  textEl.innerHTML = "";
  modal.classList.remove("hidden");
  setTimeout(() => {
    animEl.textContent = emoji;
    animEl.classList.add("chest-open");
    textEl.innerHTML = text;
  }, 380);
}

function usePotion() {
  ensureChar();
  if (progress.char.potions <= 0) { alert("沒有藥水！"); return; }
  const maxHp = getPlayerMaxHp();
  if (battleState.playerHp >= maxHp) { alert("HP 已滿！"); return; }
  progress.char.potions--;
  battleState.playerHp = Math.min(battleState.playerHp + 1, maxHp);
  saveProgress(progress);
  updatePlayerHP();
  updateQuizPotionBtn();
  renderCharPanel();
}

function onMonsterKilled() {
  battleState.sessionMonstersKilled = (battleState.sessionMonstersKilled || 0) + 1;
  const killedWeaponItem = getEquippedWeaponItem();
  const weaponType = killedWeaponItem?.type;
  const wBonus = getWeaponBonus(killedWeaponItem);
  // 暗黑之刃：吸血（隨等級增加回復量）
  if (weaponType === "dark") {
    const heal = 1 + wBonus;
    healPlayer(heal);
    showBattleEffect(`🌙吸血+${heal}HP`, "#6c5ce7");
  }
  // 魔法杖：擊殺後計時（隨等級延長秒數）
  if (weaponType === "staff") {
    const secs = 4 + wBonus;
    extendTimer(secs * 1000);
    showBattleEffect(`✨魔力+${secs}s`, "#a29bfe");
  }
  // 熟記模式：每殺一隻怪物給 2 金幣
  if (state.quiz && state.quiz.range === "learned") {
    addCoins(2);
    showBattleEffect("💰+2", "#f4a261");
    return;
  }
  // 一般模式：3 隻後額外給寶箱
  if (battleState.sessionMonstersKilled >= 3) {
    ensureDailyTasks(); ensureChar();
    const bonusKey = state.quiz.mode === "en-to-zh" ? "bonusKillsEnToZh" : "bonusKillsZhToEn";
    const expected = battleState.sessionMonstersKilled - 2;
    const alreadyGiven = progress.dailyTasks[bonusKey] || 0;
    if (expected > alreadyGiven) {
      const toGive = expected - alreadyGiven;
      progress.dailyTasks[bonusKey] = expected;
      progress.char.chests += toGive;
      saveProgress(progress);
      showBattleChestBonus();
    }
  }
}

function showBattleChestBonus() {
  const arena = document.getElementById("battle-arena");
  if (!arena) return;
  const el = document.createElement("div");
  el.className = "battle-chest-bonus";
  el.textContent = "+📦";
  arena.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function checkSessionChallenge(mode) {
  if (state.quiz && (state.quiz.range === "learned" || state.quiz.range === "all")) return false;
  const total = state.quiz.questions.length;
  if (state.quiz.correct < total) return false;
  ensureChar();
  ensureDailyTasks();
  const key = mode === "en-to-zh" ? "enToZhDone" : "zhToEnDone";
  if (progress.dailyTasks[key]) return false;
  progress.dailyTasks[key] = true;
  progress.char.chests++;
  saveProgress(progress);
  awardDailyChallenge();
  return true;
}

function showDailyChallengeReward(expGain) {
  const toast = document.getElementById("challenge-toast");
  if (!toast) return;
  toast.textContent = `🎉 每日挑戰完成！獲得 EXP +${expGain}`;
  toast.classList.remove("hidden", "show");
  void toast.offsetWidth;
  toast.classList.add("show");
  setTimeout(() => toast.classList.add("hidden"), 2800);
}

function renderWeaponInventory() {
  const container = document.getElementById("weapon-inventory");
  if (!container) return;
  const inv = (progress.char && progress.char.weaponInventory) ? progress.char.weaponInventory : [];
  const equipped = (progress.char && progress.char.equippedWeapon) || null;

  // 更新頁首已裝備顯示
  const equippedDisplay = document.getElementById("weapon-equipped-display");
  if (equippedDisplay) {
    const eq = inv.find(x => x.type === equipped);
    if (eq) {
      const eWt = getWeaponTypeData(eq.type);
      const eLv = eq.level > 0 ? ` Lv.${eq.level}` : "";
      equippedDisplay.textContent = `${eWt.emoji} ${eWt.name}${eLv} (攻擊 +${eq.attack + (eq.level || 0)})`;
    } else {
      equippedDisplay.textContent = "無";
    }
  }

  if (inv.length === 0) {
    container.innerHTML = '<div class="weapon-empty">尚無武器，開寶箱獲得</div>';
    return;
  }
  container.innerHTML = "";
  inv.forEach(w => {
    const wt = getWeaponTypeData(w.type);
    const isEquipped = w.type === equipped;
    const lvTag = w.level > 0 ? ` <span class="weapon-lv-tag">Lv.${w.level}</span>` : "";
    const div = document.createElement("div");
    div.className = "weapon-item" + (isEquipped ? " equipped" : "");
    div.innerHTML = `
      <div class="weapon-item-icon">${wt.emoji}</div>
      <div class="weapon-item-info">
        <div class="weapon-item-name">${wt.name} +${w.attack}${lvTag}</div>
        <div class="weapon-item-sub">${wt.key === "dragon_sword" ? `傳說武器・不可升階・基礎攻擊 ${w.attack}` : `升級進度 ${w.count}/5・實際傷害 +${w.attack + (w.level || 0)}`}</div>
        <div class="weapon-item-special">${getWeaponSpecialDesc(wt, w)}</div>
      </div>
      <div class="weapon-item-action">
        ${isEquipped
          ? '<span class="weapon-badge">裝備中</span>'
          : `<button class="weapon-equip-btn" data-type="${w.type}">裝備</button>`}
      </div>`;
    if (!isEquipped) {
      div.querySelector(".weapon-equip-btn").addEventListener("click", () => {
        progress.char.equippedWeapon = w.type;
        saveProgress(progress);
        renderWeaponInventory();
        // 同步更新角色頁武器顯示（若已開啟）
        const charWeapon = document.getElementById("char-weapon");
        if (charWeapon) {
          const item = getEquippedWeaponItem();
          if (item) {
            const wd = getWeaponTypeData(item.type);
            charWeapon.textContent = `${wd.emoji} ${wd.name}${item.level > 0 ? ` Lv.${item.level}` : ""} (+${getPlayerAttack() - 1})`;
          }
        }
      });
    }
    container.appendChild(div);
  });
}

function renderCharPanel() {
  ensureChar();
  ensureDailyTasks();
  const c = progress.char;
  const dt = progress.dailyTasks;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  set("char-user-name", currentUser || "學習者");
  const avatarEl = document.getElementById("char-avatar-big");
  if (avatarEl) avatarEl.textContent = c.avatar || "🧙";
  const picker = document.getElementById("avatar-picker");
  if (picker) {
    picker.innerHTML = AVATARS.map(a =>
      `<button class="avatar-option${a === (c.avatar || "🧙") ? " selected" : ""}" data-avatar="${a}">${a}</button>`
    ).join("");
    picker.querySelectorAll(".avatar-option").forEach(btn => {
      btn.addEventListener("click", () => {
        progress.char.avatar = btn.dataset.avatar;
        saveProgress(progress);
        renderCharPanel();
      });
    });
  }
  if (avatarEl && !avatarEl._avatarClick) {
    avatarEl._avatarClick = true;
    avatarEl.addEventListener("click", () => picker && picker.classList.toggle("hidden"));
  }
  set("char-level", c.level);
  set("char-exp-text", `${c.exp} / ${EXP_PER_LEVEL}`);
  set("char-max-hp", c.maxHp);
  set("char-attack", getPlayerAttack());
  const equippedItem = getEquippedWeaponItem();
  if (equippedItem) {
    const wd = getWeaponTypeData(equippedItem.type);
    const lvTag = equippedItem.level > 0 ? ` Lv.${equippedItem.level}` : "";
    set("char-weapon", `${wd.emoji} ${wd.name}${lvTag} (+${getPlayerAttack() - 1})`);
  } else {
    set("char-weapon", "無");
  }
  set("inv-potions", c.potions);
  set("inv-chests", c.chests);
  set("inv-rainbow", c.rainbowTickets || 0);
  set("task-en-zh-status", dt.enToZhDone ? "✅" : "⬜");
  set("task-zh-en-status", dt.zhToEnDone ? "✅" : "⬜");
  set("task-challenge-status", dt.challengeDone ? "✅" : "⬜");
  const fill = document.getElementById("char-exp-fill");
  if (fill) fill.style.width = (c.exp / EXP_PER_LEVEL * 100) + "%";
  const mhpInfo = document.getElementById("monster-hp-info");
  const days = progress.completedDates ? progress.completedDates.length : 0;
  const learnedTier = getLearnedMonsterTier();
  const learnedHp = 10 + learnedTier * 2;
  const learnedAtk = 1 + Math.floor(learnedTier / 25);
  const learnedCount = Math.min((progress.learnedIds || []).length, 3000);
  if (mhpInfo) mhpInfo.innerHTML =
    `一般模式怪物：${getMonsterMaxHp()} HP（完成 ${days} 天，每 31 天升一階，上限 50HP）<br>` +
    `熟記模式怪物：${learnedHp} HP／攻擊 ${learnedAtk}（熟記 ${learnedCount} 字，每 30 字升一級距，上限 3000 字 210HP）`;
}

// === 事件綁定 ===
document.addEventListener("DOMContentLoaded", () => {
  // 使用者初始化
  const savedUser = localStorage.getItem(CURRENT_USER_KEY);
  if (savedUser && getUsers().includes(savedUser)) {
    selectUser(savedUser);
  } else {
    renderCard(); // 顯示佔位卡片
    showUserPicker();
  }

  initSfxUnlock();
  document.getElementById("switch-user-btn").addEventListener("click", showUserPicker);
  document.getElementById("sfx-toggle-btn").addEventListener("click", () => {
    _sfxMuted = !_sfxMuted;
    document.getElementById("sfx-toggle-btn").textContent = _sfxMuted ? "🔇" : "🔊";
  });
  document.getElementById("add-user-btn").addEventListener("click", () =>
    addNewUser(document.getElementById("new-user-input").value)
  );
  document.getElementById("new-user-input").addEventListener("keydown", e => {
    if (e.key === "Enter") addNewUser(document.getElementById("new-user-input").value);
  });

document.getElementById("back-to-today").addEventListener("click", () => {
    loadTodayWords();
    renderCard();
  });

  document.getElementById("prev-card").addEventListener("click", () => {
    if (state.currentCard > 0) { state.currentCard--; state.flipped = false; renderCard(); }
  });
  document.getElementById("next-card").addEventListener("click", () => {
    if (state.currentCard < state.todayWords.length - 1) { state.currentCard++; state.flipped = false; renderCard(); }
  });
  document.getElementById("flip-card").addEventListener("click", () => {
    state.flipped = !state.flipped;
    document.getElementById("the-card")?.classList.toggle("flipped");
  });
  document.getElementById("mark-done").addEventListener("click", markTodayDone);

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.querySelectorAll(".quiz-mode-group button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".quiz-mode-group button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.quiz.mode = b.dataset.mode;
      tryStartQuiz();
    });
  });
  document.querySelectorAll(".quiz-range-group button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".quiz-range-group button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.quiz.range = b.dataset.range;
      tryStartQuiz();
    });
  });
  document.getElementById("next-question").addEventListener("click", nextQuestion);
  document.getElementById("quit-quiz").addEventListener("click", resetQuizSetup);
  document.getElementById("quiz-restart").addEventListener("click", resetQuizSetup);
  document.getElementById("defeat-restart").addEventListener("click", resetQuizSetup);

  document.getElementById("word-search").addEventListener("input", e => searchWords(e.target.value));
  document.getElementById("reset-progress").addEventListener("click", resetAllProgress);

  document.getElementById("open-chest-btn").addEventListener("click", openChest);
  document.getElementById("quiz-use-potion-btn").addEventListener("click", usePotion);
  document.getElementById("chest-close-btn").addEventListener("click", () => {
    document.getElementById("chest-modal").classList.add("hidden");
  });

  // 商店按鈕
  document.querySelectorAll(".shop-buy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.dataset.item;
      const cost = parseInt(btn.dataset.cost, 10);
      buyItem(item, cost);
    });
  });
});
