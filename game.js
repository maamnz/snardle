// Snardle Main Game Engine

class SnardleGame {
  constructor() {
    this.boardEl = document.getElementById("board");
    this.keyboardEl = document.getElementById("keyboard");
    this.modeToggleBtn = document.getElementById("mode-toggle-btn");
    this.newGameBtn = document.getElementById("new-game-btn");
    this.statsBtn = document.getElementById("stats-btn");
    this.modeLabelEl = document.getElementById("mode-label");
    this.toastContainerEl = document.getElementById("toast-container");
    this.statsModalEl = document.getElementById("stats-modal");
    this.closeModalBtn = document.getElementById("close-modal-btn");
    this.shareBtn = document.getElementById("share-btn");

    this.narrator = new SnarkyNarrator("narrator-text");

    this.mode = localStorage.getItem("snardle_mode") || "endless"; // "daily" or "endless"
    this.targetWord = "";
    this.currentRow = 0;
    this.currentTile = 0;
    this.currentGuess = [];
    this.isGameOver = false;
    this.isRevealing = false;
    this.grayLetters = new Set();
    this.guessHistory = [];

    this.stats = JSON.parse(localStorage.getItem("snardle_stats")) || {
      played: 0,
      won: 0,
      currentStreak: 0,
      maxStreak: 0
    };

    this.init();
  }

  init() {
    this.setupBoard();
    this.setupKeyboard();
    this.setupEvents();
    this.updateModeUI();
    this.startNewGame();
  }

  getDailyWord() {
    const epoch = new Date(2024, 0, 1).getTime();
    const now = new Date().getTime();
    const dayIndex = Math.floor((now - epoch) / (1000 * 60 * 60 * 24));
    return ANSWER_WORDS[dayIndex % ANSWER_WORDS.length];
  }

  getRandomWord() {
    return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
  }

  setupBoard() {
    this.boardEl.innerHTML = "";
    for (let r = 0; r < 6; r++) {
      const row = document.createElement("div");
      row.className = "row";
      row.id = `row-${r}`;
      for (let c = 0; c < 5; c++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.id = `tile-${r}-${c}`;
        row.appendChild(tile);
      }
      this.boardEl.appendChild(row);
    }
  }

  setupKeyboard() {
    const layout = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
    ];

    this.keyboardEl.innerHTML = "";
    layout.forEach(rowKeys => {
      const row = document.createElement("div");
      row.className = "keyboard-row";
      rowKeys.forEach(k => {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.textContent = k;
        btn.dataset.key = k;
        if (k === "ENTER" || k === "⌫") {
          btn.classList.add("large");
        }
        btn.addEventListener("click", () => this.handleKeyPress(k));
        row.appendChild(btn);
      });
      this.keyboardEl.appendChild(row);
    });
  }

  setupEvents() {
    window.addEventListener("keydown", e => {
      if (this.isGameOver || this.isRevealing) return;
      if (e.key === "Enter") {
        this.handleKeyPress("ENTER");
      } else if (e.key === "Backspace") {
        this.handleKeyPress("⌫");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.handleKeyPress(e.key.toUpperCase());
      }
    });

    this.modeToggleBtn.addEventListener("click", () => {
      this.mode = this.mode === "daily" ? "endless" : "daily";
      localStorage.setItem("snardle_mode", this.mode);
      this.updateModeUI();
      this.startNewGame();
    });

    this.newGameBtn.addEventListener("click", () => {
      if (this.mode === "daily" && !this.isGameOver) {
        this.showToast("Daily word is locked for today!");
        return;
      }
      this.startNewGame();
    });

    this.statsBtn.addEventListener("click", () => this.openStatsModal());
    this.closeModalBtn.addEventListener("click", () => this.closeStatsModal());
    this.statsModalEl.addEventListener("click", e => {
      if (e.target === this.statsModalEl) this.closeStatsModal();
    });

    this.shareBtn.addEventListener("click", () => this.shareResult());
  }

  updateModeUI() {
    this.modeLabelEl.textContent = this.mode.toUpperCase();
    this.modeToggleBtn.textContent = this.mode === "daily" ? "Switch to Endless" : "Switch to Daily";
    this.newGameBtn.style.display = this.mode === "daily" ? "none" : "inline-block";
  }

  startNewGame() {
    this.currentRow = 0;
    this.currentTile = 0;
    this.currentGuess = [];
    this.isGameOver = false;
    this.isRevealing = false;
    this.grayLetters.clear();
    this.guessHistory = [];

    // Reset board UI
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const tile = document.getElementById(`tile-${r}-${c}`);
        tile.textContent = "";
        tile.className = "tile";
        tile.removeAttribute("data-state");
      }
    }

    // Reset keyboard UI
    document.querySelectorAll(".key").forEach(k => {
      k.removeAttribute("data-state");
    });

    // Select target word
    if (this.mode === "daily") {
      this.targetWord = this.getDailyWord();
      // Check if daily was already completed today
      const dailySaved = JSON.parse(localStorage.getItem(`snardle_daily_${new Date().toDateString()}`));
      if (dailySaved && dailySaved.completed) {
        this.narrator.say("You already played today's Daily Snardle. Come back tomorrow or play Endless mode.");
        this.isGameOver = true;
        return;
      }
    } else {
      this.targetWord = this.getRandomWord();
    }

    const openers = [
      "Let's see what linguistic atrocity you commit first.",
      "6 tries to guess a 5-letter word. Try not to embarrass yourself.",
      "Awaiting your first guess. Set your expectations appropriately low.",
      "Don't worry, I won't judge you. (I will, harshly)."
    ];
    this.narrator.say(openers[Math.floor(Math.random() * openers.length)]);
  }

  handleKeyPress(key) {
    if (this.isGameOver || this.isRevealing) return;

    if (key === "⌫") {
      if (this.currentTile > 0) {
        this.currentTile--;
        this.currentGuess.pop();
        const tile = document.getElementById(`tile-${this.currentRow}-${this.currentTile}`);
        tile.textContent = "";
        tile.removeAttribute("data-state");
      }
    } else if (key === "ENTER") {
      if (this.currentGuess.length < 5) {
        this.showToast("Not enough letters");
        this.shakeRow(this.currentRow);
        return;
      }
      this.submitGuess();
    } else if (this.currentGuess.length < 5) {
      this.currentGuess.push(key);
      const tile = document.getElementById(`tile-${this.currentRow}-${this.currentTile}`);
      tile.textContent = key;
      tile.setAttribute("data-state", "active");
      this.currentTile++;
    }
  }

  submitGuess() {
    const guessStr = this.currentGuess.join("");

    if (!VALID_GUESS_SET.has(guessStr)) {
      this.showToast("Not in word list");
      this.shakeRow(this.currentRow);
      this.narrator.reactInvalid(guessStr);
      return;
    }

    this.isRevealing = true;
    const evalResults = this.evaluateGuess(guessStr, this.targetWord);
    this.guessHistory.push(evalResults);

    // Flip tiles sequentially
    evalResults.forEach((res, i) => {
      setTimeout(() => {
        const tile = document.getElementById(`tile-${this.currentRow}-${i}`);
        tile.classList.add("flip");

        setTimeout(() => {
          tile.setAttribute("data-state", res.state);
          tile.classList.remove("flip");
          tile.classList.add("flip-back");
          this.updateKeyboardKey(res.letter, res.state);

          if (res.state === "absent") {
            this.grayLetters.add(res.letter);
          }

          // Last tile flipped
          if (i === 4) {
            this.isRevealing = false;
            this.handleTurnEnd(guessStr, evalResults);
          }
        }, 250);
      }, i * 300);
    });
  }

  evaluateGuess(guess, target) {
    const results = Array(5).fill(null);
    const targetArr = target.split("");
    const guessArr = guess.split("");

    // Step 1: Green exact matches
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        results[i] = { letter: guessArr[i], state: "correct" };
        targetArr[i] = null;
        guessArr[i] = null;
      }
    }

    // Step 2: Yellow present matches
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] !== null) {
        const matchIdx = targetArr.indexOf(guessArr[i]);
        if (matchIdx !== -1) {
          results[i] = { letter: guessArr[i], state: "present" };
          targetArr[matchIdx] = null;
        } else {
          results[i] = { letter: guessArr[i], state: "absent" };
        }
      }
    }

    return results;
  }

  updateKeyboardKey(letter, state) {
    const keyBtn = document.querySelector(`.key[data-key="${letter}"]`);
    if (!keyBtn) return;
    const currentState = keyBtn.getAttribute("data-state");

    if (currentState === "correct") return;
    if (currentState === "present" && state === "absent") return;

    keyBtn.setAttribute("data-state", state);
  }

  handleTurnEnd(guessStr, evalResults) {
    const isWin = guessStr === this.targetWord;

    this.narrator.reactToGuess(
      guessStr,
      evalResults,
      this.currentRow,
      this.targetWord,
      this.grayLetters
    );

    if (isWin) {
      this.isGameOver = true;
      this.recordGame(true);
      setTimeout(() => this.openStatsModal(true), 1500);
      return;
    }

    if (this.currentRow === 5) {
      this.isGameOver = true;
      this.recordGame(false);
      setTimeout(() => this.openStatsModal(false), 1500);
      return;
    }

    this.currentRow++;
    this.currentTile = 0;
    this.currentGuess = [];
  }

  recordGame(isWin) {
    this.stats.played++;
    if (isWin) {
      this.stats.won++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.maxStreak) {
        this.stats.maxStreak = this.stats.currentStreak;
      }
    } else {
      this.stats.currentStreak = 0;
    }

    localStorage.setItem("snardle_stats", JSON.stringify(this.stats));

    if (this.mode === "daily") {
      localStorage.setItem(`snardle_daily_${new Date().toDateString()}`, JSON.stringify({
        completed: true,
        won: isWin,
        guesses: this.currentRow + 1
      }));
    }
  }

  shakeRow(rowIdx) {
    const row = document.getElementById(`row-${rowIdx}`);
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 500);
  }

  showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    this.toastContainerEl.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  openStatsModal(won) {
    document.getElementById("stat-played").textContent = this.stats.played;
    const winPct = this.stats.played > 0 ? Math.round((this.stats.won / this.stats.played) * 100) : 0;
    document.getElementById("stat-win-pct").textContent = `${winPct}%`;
    document.getElementById("stat-current-streak").textContent = this.stats.currentStreak;
    document.getElementById("stat-max-streak").textContent = this.stats.maxStreak;

    const modalTitle = document.getElementById("modal-title");
    if (won === true) {
      modalTitle.textContent = "You Won (Miraculously)";
    } else if (won === false) {
      modalTitle.textContent = `The word was ${this.targetWord}`;
    } else {
      modalTitle.textContent = "Statistics";
    }

    this.statsModalEl.classList.add("open");
  }

  closeStatsModal() {
    this.statsModalEl.classList.remove("open");
  }

  shareResult() {
    const emojiMap = {
      correct: "🟩",
      present: "🟨",
      absent: "⬜"
    };

    let text = `Snardle (${this.mode.toUpperCase()}) ${this.isGameOver && this.guessHistory[this.guessHistory.length - 1].every(t => t.state === 'correct') ? this.currentRow + 1 : 'X'}/6\n\n`;

    this.guessHistory.forEach(row => {
      text += row.map(t => emojiMap[t.state]).join("") + "\n";
    });

    text += "\nPlay Snardle: Wordle with savage commentary!";

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast("Copied results to clipboard!");
      });
    } else {
      this.showToast("Clipboard unavailable");
    }
  }
}

// Start on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  new SnardleGame();
});
