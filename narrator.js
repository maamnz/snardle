// Snarky Savage Narrator Commentary Engine

const SAVAGE_COMMENTS = {
  // Guess 1 reactions
  OPENER: [
    "'{WORD}'? Wow. That's really what we're opening with? Groundbreaking.",
    "Interesting choice. By interesting, I mean statistically terrible.",
    "'{WORD}'... Did a cat walk across your keyboard, or was that deliberate?",
    "Starting with '{WORD}'? I admire your confidence. Not your intellect, just confidence.",
    "Bold opener. Completely wrong direction, but bold nonetheless.",
    "I've seen kindergartners make more strategic openers than '{WORD}'."
  ],

  // 0 letters matched (all gray)
  ALL_GRAY: [
    "Not a single letter. Impressive. It actually takes effort to be this completely wrong.",
    "Zero matches. Literally none. Have you considered buying a dictionary?",
    "A full row of gray. Beautiful symmetry of utter failure.",
    "0 out of 5. You're giving the alphabet an existential crisis.",
    "Well, at least you eliminated 5 letters. Only 21 more to butcher.",
    "Gray across the board. My expectations were low, yet you brought a shovel."
  ],

  // 1-2 yellow letters only (weak progress)
  ONLY_YELLOWS: [
    "A couple yellows. You found the right neighborhood, but you're knocking on dumpsters.",
    "Right letters, completely wrong slots. Spatial awareness isn't your strong suit, is it?",
    "Scattered yellow tiles. Like tossing alphabet soup against a wall and hoping for art.",
    "You have letters, just nowhere near where they belong. Typical."
  ],

  // 1 Green tile
  ONE_GREEN: [
    "One green tile! Want a participation trophy, or should we keep crawling?",
    "One correct letter. At this blistering pace, you'll finish by next Tuesday.",
    "A lone green square in a sea of disappointment. Poetic."
  ],

  // 2-3 Green tiles
  DECENT_GREENS: [
    "Some greens. Don't let it go to your head, you're still mostly guessing in the dark.",
    "Progress! Slow, painful, agonizing progress, but progress.",
    "You stumbled into a few correct spots. Broken clocks, twice a day, etc."
  ],

  // 4 Green tiles (The choke point)
  FOUR_GREENS: [
    "4 greens! One letter away. This is where most people choke. Let's see you sweat.",
    "One single letter left. Don't blow it now... actually, please do, it's hilarious.",
    "So close yet so vulnerable. There are like six words this could be. Choose poorly.",
    "4 green tiles. The suspense is killing nobody, but do try not to ruin it."
  ],

  // Repeated an eliminated gray letter
  REUSED_GRAY: [
    "Did you forget '{LETTER}' was already gray? Memory of a goldfish, truly.",
    "Re-using '{LETTER}'? It was gray before, it's still gray now. Magic isn't real.",
    "You played '{LETTER}' again after getting rejected. Take a hint."
  ],

  // Repeated letters in the same guess (e.g. SPEED, PUPPY)
  DOUBLE_LETTERS: [
    "Double letters? Running out of vocabulary already?",
    "Doubling up on letters like you can afford to waste precious slots."
  ],

  // Down to guess 5 or 6 (danger zone)
  DANGER_ZONE: [
    "Guess {ROW} of 6. The walls are closing in and your panic is palpable.",
    "Down to the wire. You feel that? That's the cold reality of failure creeping in.",
    "If you lose this now, I'm screenshotting this board for posterity.",
    "One or two guesses left. Time to channel whatever minimal brainpower remains."
  ],

  // Won on Guess 1 (Impossible/Cheat)
  WIN_GUESS_1: [
    "Guess 1? You looked at the source code. Don't lie to me.",
    "First try. Pure RNG luck or outright fraud. We both know which one."
  ],

  // Won on Guess 2 (Very lucky / Smug)
  WIN_GUESS_2: [
    "Two guesses. Disgusting. Leave some unearned luck for the rest of humanity.",
    "Two tries? Enjoy the fluke while it lasts, it won't happen again."
  ],

  // Won on Guess 3-4 (Normal win)
  WIN_NORMAL: [
    "You actually got it in {ROW}. Fine. I'll admit you have at least two working brain cells.",
    "Solved in {ROW}. Adequate. Not genius, but you survived.",
    "Congratulations on performing the bare minimum expected of a literate adult."
  ],

  // Won on Guess 5-6 (Clutch/Barely made it)
  WIN_CLUTCH: [
    "Took you {ROW} tries. You were practically hanging off a cliff by your fingernails.",
    "You solved it on attempt {ROW}. That wasn't skill, that was pure undiluted desperation.",
    "Barely scraped by. My disappointment is immeasurable that you didn't fail."
  ],

  // Complete Loss (Used all 6 attempts)
  LOSS: [
    "Game over. The word was '{ANSWER}'. You had 6 tries and failed every single one. Astonishing.",
    "Defeat. The word was '{ANSWER}'. Maybe word games just aren't your calling. Try coloring books?",
    "Zero guesses left. The word was '{ANSWER}'. I'd say 'good effort', but we both know that's a lie.",
    "You lost. It was '{ANSWER}'. Somewhere, your English teacher just shuddered in disappointment."
  ],

  // Generic fallback snark
  GENERIC: [
    "Another guess, another disappointment.",
    "Fascinating tactic. Not an effective one, but fascinating.",
    "Every guess you make lowers the room's average IQ.",
    "Keep clicking keys, surely a coherent word will emerge eventually."
  ]
};

class SnarkyNarrator {
  constructor(elementId) {
    this.container = document.getElementById(elementId);
    this.typewriterTimeout = null;
    this.usedHistory = new Set();
  }

  say(text, isInstant = false) {
    if (!this.container) return;
    
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
    }

    if (isInstant) {
      this.container.textContent = text;
      return;
    }

    this.container.textContent = "";
    let i = 0;
    const speed = 20;

    const typeNextChar = () => {
      if (i < text.length) {
        this.container.textContent += text.charAt(i);
        i++;
        this.typewriterTimeout = setTimeout(typeNextChar, speed);
      }
    };

    typeNextChar();
  }

  pickRandom(array) {
    const available = array.filter(c => !this.usedHistory.has(c));
    const pool = available.length > 0 ? available : array;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.usedHistory.add(selected);
    return selected;
  }

  reactToGuess(guess, evalResults, rowIndex, targetWord, grayLettersSet) {
    // evalResults is array of { letter, state: 'correct' | 'present' | 'absent' }
    const greens = evalResults.filter(r => r.state === 'correct').length;
    const yellows = evalResults.filter(r => r.state === 'present').length;
    const grays = evalResults.filter(r => r.state === 'absent').length;

    // Check if player reused an established gray letter from prior turns
    const reusedGray = evalResults.find(r => grayLettersSet.has(r.letter) && r.state === 'absent');

    let template = "";

    // Win condition check handled separately, but if called:
    if (greens === 5) {
      if (rowIndex === 0) template = this.pickRandom(SAVAGE_COMMENTS.WIN_GUESS_1);
      else if (rowIndex === 1) template = this.pickRandom(SAVAGE_COMMENTS.WIN_GUESS_2);
      else if (rowIndex <= 3) template = this.pickRandom(SAVAGE_COMMENTS.WIN_NORMAL);
      else template = this.pickRandom(SAVAGE_COMMENTS.WIN_CLUTCH);
    }
    // Loss condition
    else if (rowIndex === 5) {
      template = this.pickRandom(SAVAGE_COMMENTS.LOSS);
    }
    // Reused gray letter mistake
    else if (reusedGray && Math.random() < 0.7) {
      template = this.pickRandom(SAVAGE_COMMENTS.REUSED_GRAY).replace('{LETTER}', reusedGray.letter);
    }
    // Guess 1 opener
    else if (rowIndex === 0) {
      if (grays === 5) template = this.pickRandom(SAVAGE_COMMENTS.ALL_GRAY);
      else template = this.pickRandom(SAVAGE_COMMENTS.OPENER);
    }
    // 4 Greens (so close)
    else if (greens === 4) {
      template = this.pickRandom(SAVAGE_COMMENTS.FOUR_GREENS);
    }
    // Total failure row (all gray)
    else if (grays === 5) {
      template = this.pickRandom(SAVAGE_COMMENTS.ALL_GRAY);
    }
    // Danger zone (guess 5)
    else if (rowIndex === 4 && Math.random() < 0.6) {
      template = this.pickRandom(SAVAGE_COMMENTS.DANGER_ZONE);
    }
    // Decent greens
    else if (greens >= 2) {
      template = this.pickRandom(SAVAGE_COMMENTS.DECENT_GREENS);
    }
    // Only yellows
    else if (greens === 0 && yellows > 0) {
      template = this.pickRandom(SAVAGE_COMMENTS.ONLY_YELLOWS);
    }
    // 1 Green
    else if (greens === 1) {
      template = this.pickRandom(SAVAGE_COMMENTS.ONE_GREEN);
    }
    // Fallback generic snark
    else {
      template = this.pickRandom(SAVAGE_COMMENTS.GENERIC);
    }

    const formatted = template
      .replace(/{WORD}/g, guess)
      .replace(/{ANSWER}/g, targetWord)
      .replace(/{ROW}/g, rowIndex + 1);

    this.say(formatted);
  }

  reactLoss(targetWord) {
    const template = this.pickRandom(SAVAGE_COMMENTS.LOSS).replace(/{ANSWER}/g, targetWord);
    this.say(template);
  }

  reactInvalid(word) {
    const invalidRoasts = [
      `'${word}' isn't even in the dictionary. Did your cat step on the keyboard?`,
      `Nice try, but '${word}' is not a real English word.`,
      `Making up words now? '${word}' won't save you.`,
      `'${word}'? Real words only, please.`
    ];
    this.say(this.pickRandom(invalidRoasts));
  }
}
