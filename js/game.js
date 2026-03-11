/**
 * 🎮 Word Safari: Enhanced Game Logic with Achievements & Progression
 */

import { vocabularyClues, getAnimalsByAttribute, getRandomAnimals, spellingWords, getRandomDailyQuestions, ANIMALS } from './data.js';
import { playSound, speak } from './audio.js';
import { achievementManager } from './achievements.js';
import { progressionManager } from './progression.js';
import { renderAnimalSvg } from './svgFactory.js';

/* ========================================
   GAME MANAGER CLASS
   ======================================== */
class GameManager {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.timeRemaining = 60;
        this.currentClue = null;
        this.correctAnimals = [];
        this.spawnedAnimals = [];
        this.timerInterval = null;
        this.isPlaying = false;
        this.biome = 'savanna';
        this.mistakes = 0;
        this.correctStreak = 0;
        this.startTime = null;
        this.levelStartTime = null;
    }

    startGame() {
        this.resetGame();
        progressionManager.resetSessionStats();

        // Apply difficulty settings
        const difficulty = progressionManager.getDifficultySettings();
        this.timeRemaining = Math.floor(60 * difficulty.timeMultiplier);

        this.generateClue();
        this.spawnAnimals();
        this.startTimer();
        this.updateDifficultyBadge();
        playSound('ambient', true);

        this.startTime = Date.now();
        this.levelStartTime = Date.now();
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.timeRemaining = 60;
        this.isPlaying = true;
        this.biome = 'savanna';
        this.correctAnimals = [];
        this.spawnedAnimals = [];
        this.currentClue = null;
        this.mistakes = 0;
        this.correctStreak = 0;
        clearInterval(this.timerInterval);
        this.updateHUD();
        this.hideComboCounter();
    }

    pauseGame() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);
    }

    resumeGame() {
        this.isPlaying = true;
        this.startTimer();
    }

    updateDifficultyBadge() {
        const badge = document.getElementById('difficulty-badge');
        const difficulty = progressionManager.getDifficulty();
        const badges = {
            adaptive: '🎯 Adaptive',
            easy: '😊 Easy',
            medium: '🤔 Medium',
            hard: '🔥 Hard'
        };
        if (badge) badge.textContent = badges[difficulty];
    }

    formatClueForPrompt(clueText) {
        if (!clueText) return 'has this trait';

        const cleaned = String(clueText)
            .replace(/\([^)]*\)/g, '') // remove parenthetical helpers for cleaner TTS
            .replace(/\s+/g, ' ')
            .trim();

        const lower = cleaned.toLowerCase();
        const directPrefixes = ['has ', 'can ', 'lives ', 'spends ', 'grows ', 'eats ', 'blends '];

        if (directPrefixes.some(prefix => lower.startsWith(prefix))) {
            return cleaned;
        }

        if (lower.startsWith('is ')) {
            return cleaned;
        }

        return `is ${cleaned}`;
    }

    generateClue() {
        const settings = progressionManager.getDifficultySettings();
        let availableClues = vocabularyClues;

        // Filter by vocabulary level and ensure we have clues
        if (settings.vocabularyLevel === 'simple') {
            const filtered = vocabularyClues.filter(c => c.difficulty === 'easy');
            availableClues = filtered.length > 0 ? filtered : vocabularyClues;
        } else if (settings.vocabularyLevel === 'advanced') {
            const filtered = vocabularyClues.filter(c => c.difficulty === 'hard');
            availableClues = filtered.length > 0 ? filtered : vocabularyClues;
        }

        // Safety check: ensure we have clues
        if (!availableClues || availableClues.length === 0) {
            console.error('No vocabulary clues available!');
            return;
        }

        const randomClue = availableClues[Math.floor(Math.random() * availableClues.length)];
        this.currentClue = randomClue;
        this.correctAnimals = getAnimalsByAttribute(randomClue.attribute);

        // Safety check: ensure we have correct animals
        if (!this.correctAnimals || this.correctAnimals.length === 0) {
            console.error('No animals found for attribute:', randomClue.attribute);
            // Fallback to regenerate clue
            this.generateClue();
            return;
        }

        const clueWordEl = document.getElementById('clue-word');
        const cluePrompt = this.formatClueForPrompt(randomClue.clue);
        if (clueWordEl) {
            clueWordEl.textContent = `that ${cluePrompt}`;
        }
        speak(`Find the animal that ${cluePrompt}`);
    }

    spawnAnimals() {
        const gameArea = document.getElementById('game-area');
        if (!gameArea) return;

        gameArea.innerHTML = '';
        this.spawnedAnimals = [];

        // Record biome visit
        progressionManager.recordBiomeVisit(this.biome);

        // Safety check for correct animals
        if (!this.correctAnimals || this.correctAnimals.length === 0) {
            console.error('Cannot spawn animals: no correct animals available');
            return;
        }

        const numCorrect = Math.min(2, this.correctAnimals.length);
        const correctToSpawn = this.correctAnimals.slice(0, numCorrect);

        const wrongAnimals = getRandomAnimals(4, this.biome).filter(a =>
            !this.correctAnimals.some(ca => ca.id === a.id)
        );

        const allAnimals = [...correctToSpawn, ...wrongAnimals].sort(() => Math.random() - 0.5);

        allAnimals.forEach((animal, index) => {
            const animalElement = this.createAnimalElement(animal);
            animalElement.style.animationDelay = `${index * 0.15}s`;

            // Add size class
            animalElement.classList.add(animal.size || 'medium');

            // Add random idle animation
            const idleAnimations = ['idle-blink', 'idle-breathe', 'idle-wiggle'];
            const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
            animalElement.classList.add(randomIdle);

            gameArea.appendChild(animalElement);
            this.spawnedAnimals.push({ element: animalElement, animal });
        });
    }

    createAnimalElement(animal) {
        const container = document.createElement('div');
        container.className = 'animal-card';
        container.dataset.animalId = animal.id;
        container.innerHTML = renderAnimalSvg(animal.id);

        const label = document.createElement('div');
        label.className = 'animal-label';
        label.textContent = animal.name;
        container.appendChild(label);

        container.addEventListener('click', () => this.handleAnimalClick(animal, container));

        return container;
    }

    handleAnimalClick(animal, element) {
        if (!this.isPlaying) return;

        const isCorrect = this.correctAnimals.some(ca => ca.id === animal.id);
        const clickTime = (Date.now() - this.levelStartTime) / 1000;

        if (isCorrect) {
            this.correctStreak++;
            this.score += 10 * this.level * (this.correctStreak > 1 ? this.correctStreak : 1);

            playSound('correct');
            this.showFeedback(true, element);
            this.showComboCounter(this.correctStreak);
            this.createConfetti(element);

            // Record animal discovery
            const isNew = progressionManager.recordAnimalDiscovered(animal.id);
            progressionManager.recordVocabularyLearned(this.currentClue?.attribute);
            if (isNew && animal.facts) {
                this.showAnimalFactCard(animal);
            }

            // Record performance for adaptive difficulty
            progressionManager.recordPerformance(true, clickTime);

            setTimeout(() => {
                element.remove();
                this.spawnedAnimals = this.spawnedAnimals.filter(sa => sa.element !== element);

                const remainingCorrect = this.spawnedAnimals.filter(sa =>
                    this.correctAnimals.some(ca => ca.id === sa.animal.id)
                );

                if (remainingCorrect.length === 0) {
                    this.nextRound();
                }
            }, 800);
        } else {
            this.mistakes++;
            this.correctStreak = 0;
            playSound('wrong');
            this.showFeedback(false, element);
            this.hideComboCounter();
            element.classList.add('shake');

            // Record performance
            progressionManager.recordPerformance(false, clickTime);

            setTimeout(() => element.classList.remove('shake'), 500);
        }

        // Record combo
        progressionManager.recordCombo(this.correctStreak);

        this.updateHUD();
    }

    showComboCounter(combo) {
        if (combo < 2) return;

        const counter = document.getElementById('combo-counter');
        if (counter) {
            counter.classList.remove('hidden');
            const valueEl = counter.querySelector('.combo-value');
            if (valueEl) {
                valueEl.textContent = `x${combo}`;
            }
        }
    }

    hideComboCounter() {
        const counter = document.getElementById('combo-counter');
        if (counter) counter.classList.add('hidden');
    }

    createConfetti(element) {
        const rect = element.getBoundingClientRect();
        const colors = ['#FF8C42', '#FFD93D', '#6BCF7F', '#87CEEB'];

        for (let i = 0; i < 10; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-particle';
            confetti.style.left = `${rect.left + rect.width / 2}px`;
            confetti.style.top = `${rect.top + rect.height / 2}px`;
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${i * 0.05}s`;
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 2000);
        }
    }

    showAnimalFactCard(animal) {
        const modal = document.getElementById('fact-modal');
        if (!modal || !animal.facts) return;

        const nameEl = document.getElementById('fact-animal-name');
        const svgEl = document.getElementById('fact-animal-svg');
        const descEl = document.getElementById('fact-description');
        const habitatEl = document.getElementById('fact-habitat');
        const dietEl = document.getElementById('fact-diet');
        const statusEl = document.getElementById('fact-status');

        if (nameEl) nameEl.textContent = animal.name;
        if (svgEl) svgEl.innerHTML = renderAnimalSvg(animal.id);
        if (descEl) descEl.textContent = animal.facts.description || '';
        if (habitatEl) habitatEl.textContent = animal.facts.habitat || '';
        if (dietEl) dietEl.textContent = animal.facts.diet || '';
        if (statusEl) statusEl.textContent = animal.facts.status || '';

        modal.classList.add('active');

        progressionManager.recordFactRead();
    }

    showFeedback(isCorrect, element) {
        const rect = element.getBoundingClientRect();
        const feedback = document.createElement('div');
        feedback.className = `feedback-popup ${isCorrect ? 'correct' : 'wrong'}`;
        feedback.textContent = isCorrect ? '🎉 Correct!' : '❌ Try Again';
        feedback.style.left = `${rect.left + rect.width / 2}px`;
        feedback.style.top = `${rect.top}px`;
        document.body.appendChild(feedback);

        setTimeout(() => feedback.remove(), 1500);
    }

    updateHUD() {
        const scoreEl = document.getElementById('score');
        const levelEl = document.getElementById('level');
        const timerEl = document.getElementById('timer');
        const xpEl = document.getElementById('xp-display');
        const progressBar = document.getElementById('progress-bar');

        if (scoreEl) scoreEl.textContent = this.score;
        if (levelEl) levelEl.textContent = this.level;
        if (timerEl) timerEl.textContent = this.timeRemaining;

        const xpProgress = progressionManager.getXPProgress();
        if (xpEl) xpEl.textContent = `${xpProgress.current}/${xpProgress.needed}`;

        const progress = ((this.level - 1) * 100 + (this.score % 100)) / (this.level * 100) * 100;
        if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
    }

    startTimer() {
        clearInterval(this.timerInterval); // Clear any existing timer

        this.timerInterval = setInterval(() => {
            if (!this.isPlaying) return;

            this.timeRemaining--;
            this.updateHUD();

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    nextRound() {
        this.score += 20;
        progressionManager.stats.levelsInSession++;

        if (this.score >= this.level * 100) {
            this.levelUp();
        }

        this.generateClue();
        this.spawnAnimals();
        this.updateHUD();
        this.levelStartTime = Date.now();
    }

    levelUp() {
        this.level++;
        const settings = progressionManager.getDifficultySettings();
        this.timeRemaining += Math.floor(15 * settings.timeMultiplier);

        // Biome progression
        if (this.level === 3) this.biome = 'forest';
        if (this.level === 5) this.biome = 'river';
        if (this.level === 7) this.biome = 'arctic';
        if (this.level === 9) this.biome = 'desert';
        if (this.level === 11) this.biome = 'ocean';

        speak(`Level ${this.level}!`);
        playSound('correct');
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.timerInterval);

        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        const stars = this.calculateStars();

        // Record game completion
        const { xpEarned } = progressionManager.recordGameComplete(
            this.score,
            this.level,
            totalTime,
            this.mistakes
        );

        // Check achievements
        const stats = progressionManager.getStats();
        const newAchievements = achievementManager.checkAchievements(stats);

        // Show end screen
        if (window.uiManager) {
            window.uiManager.showEndScreen(this.score, this.level, stars, xpEarned, newAchievements);
        }
    }

    calculateStars() {
        if (this.score >= 500) return 3;
        if (this.score >= 250) return 2;
        return 1;
    }
}

/* ========================================
   SPELLING BEE MANAGER
   ======================================== */
class SpellingBeeManager {
    constructor() {
        this.currentWord = null;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.wordQueue = [];
    }

    startSpellingBee() {
        this.correctCount = 0;
        this.wrongCount = 0;
        this.buildWordQueue();
        this.nextWord();
        this.updateStats();
    }

    buildWordQueue() {
        // Safely build word queue
        const easy = spellingWords.easy || [];
        const medium = spellingWords.medium || [];
        const hard = spellingWords.hard || [];

        this.wordQueue = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);

        // Fallback if no words available
        if (this.wordQueue.length === 0) {
            console.error('No spelling words available!');
            this.wordQueue = [
                { word: 'lion', hint: 'King of the jungle' },
                { word: 'elephant', hint: 'Large animal with a trunk' }
            ];
        }
    }

    nextWord() {
        if (this.wordQueue.length === 0) {
            this.buildWordQueue();
        }

        this.currentWord = this.wordQueue.pop();

        const hintEl = document.getElementById('spelling-hint');
        const inputEl = document.getElementById('spelling-input');
        const feedbackEl = document.getElementById('spelling-feedback');

        if (hintEl) hintEl.textContent = this.currentWord.hint;
        if (inputEl) inputEl.value = '';
        if (feedbackEl) {
            feedbackEl.textContent = '';
            feedbackEl.className = 'spelling-feedback';
        }
    }

    checkSpelling() {
        const inputEl = document.getElementById('spelling-input');
        const feedbackEl = document.getElementById('spelling-feedback');

        if (!inputEl || !feedbackEl) return;

        const input = inputEl.value.trim().toLowerCase();

        if (input === this.currentWord.word.toLowerCase()) {
            this.correctCount++;
            feedbackEl.textContent = `🎉 Correct! "${this.currentWord.word}" is spelled right!`;
            feedbackEl.className = 'spelling-feedback correct';
            playSound('correct');

            // Record spelling progress
            progressionManager.recordSpellingWord(true);

            // Check achievements
            const stats = progressionManager.getStats();
            const newAchievements = achievementManager.checkAchievements(stats);
            newAchievements.forEach(ach => achievementManager.showNotification(ach));

            setTimeout(() => this.nextWord(), 2000);
        } else {
            this.wrongCount++;
            feedbackEl.textContent = `❌ Oops! Try again or skip to see the answer.`;
            feedbackEl.className = 'spelling-feedback wrong';
            playSound('wrong');

            progressionManager.recordSpellingWord(false);
        }

        this.updateStats();
    }

    skipWord() {
        const feedbackEl = document.getElementById('spelling-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = `The correct spelling is: ${this.currentWord.word}`;
            feedbackEl.className = 'spelling-feedback';
        }

        setTimeout(() => this.nextWord(), 2000);
    }

    playWordAudio() {
        if (this.currentWord && this.currentWord.word) {
            speak(this.currentWord.word, 0.8);
        }
    }

    updateStats() {
        const correctEl = document.getElementById('spelling-correct');
        const wrongEl = document.getElementById('spelling-wrong');

        if (correctEl) correctEl.textContent = this.correctCount;
        if (wrongEl) wrongEl.textContent = this.wrongCount;
    }
}

/* ========================================
   DAILY QUEST MANAGER
   ======================================== */
class DailyQuestManager {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.timeRemaining = 30;
        this.timerInterval = null;
    }

    startDailyQuest() {
        this.resetQuest();
        this.questions = getRandomDailyQuestions(5);
        this.showQuestion();
        this.startTimer();
    }

    resetQuest() {
        this.currentQuestionIndex = 0;
        this.correctAnswers = 0;
        this.timeRemaining = 30;
        clearInterval(this.timerInterval);

        const timerEl = document.getElementById('daily-timer');
        if (timerEl) timerEl.textContent = this.timeRemaining;

        this.updateProgress();
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endQuest();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        const questionEl = document.querySelector('.question-text');
        if (questionEl) {
            questionEl.textContent = question.question;
        }

        const optionsContainer = document.getElementById('answer-options');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => this.checkAnswer(index));
            optionsContainer.appendChild(btn);
        });

        this.updateProgress();
    }

    checkAnswer(selectedIndex) {
        const question = this.questions[this.currentQuestionIndex];
        const buttons = document.querySelectorAll('.answer-btn');

        buttons.forEach(btn => btn.style.pointerEvents = 'none');

        if (selectedIndex === question.correct) {
            buttons[selectedIndex].classList.add('correct');
            this.correctAnswers++;
            playSound('correct');
        } else {
            buttons[selectedIndex].classList.add('wrong');
            buttons[question.correct].classList.add('correct');
            playSound('wrong');
        }

        setTimeout(() => {
            this.currentQuestionIndex++;
            this.showQuestion();
        }, 1500);
    }

    startTimer() {
        clearInterval(this.timerInterval); // Clear any existing timer

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;

            const timerEl = document.getElementById('daily-timer');
            if (timerEl) timerEl.textContent = this.timeRemaining;

            if (this.timeRemaining <= 0) {
                this.endQuest();
            }
        }, 1000);
    }

    updateProgress() {
        const currentEl = document.getElementById('daily-current');
        const totalEl = document.getElementById('daily-total');

        if (currentEl) currentEl.textContent = this.currentQuestionIndex + 1;
        if (totalEl) totalEl.textContent = this.questions.length;
    }

    endQuest() {
        clearInterval(this.timerInterval);

        progressionManager.recordDailyQuestComplete();

        const stats = progressionManager.getStats();
        const newAchievements = achievementManager.checkAchievements(stats);
        newAchievements.forEach(ach => achievementManager.showNotification(ach));

        const score = this.correctAnswers * 20;
        setTimeout(() => {
            if (window.uiManager) {
                window.uiManager.showDailyQuestResult(this.correctAnswers, this.questions.length, score);
            }
        }, 500);
    }
}

/* ========================================
   SENTENCE BUILDER MANAGER
   ======================================== */
class SentenceBuilderManager {
    constructor() {
        this.currentAnimal = null;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.slots = { name: null, adjective: null, category: null };
    }

    start() {
        this.correctCount = 0;
        this.wrongCount = 0;
        this.nextSentence();
        this.updateStats();
    }

    nextSentence() {
        const pool = ANIMALS;
        this.currentAnimal = pool[Math.floor(Math.random() * pool.length)];

        // Reset slots
        this.slots = { name: null, adjective: null, category: null };
        document.querySelectorAll('.drop-slot').forEach(slot => {
            slot.textContent = '?';
            slot.style.color = 'var(--color-primary)';
        });

        // Find animal traits
        const adjectives = this.currentAnimal.attributes.filter(a =>
            !['herbivore', 'carnivore', 'omnivore', 'predator', 'mammal', 'reptile', 'amphibian', 'bird', 'fish', 'arachnid'].includes(a)
        );
        const categories = this.currentAnimal.attributes.filter(a =>
            ['herbivore', 'carnivore', 'omnivore', 'predator', 'mammal', 'reptile', 'amphibian', 'bird', 'fish', 'arachnid'].includes(a)
        );

        const myAdj = adjectives.length > 0 ? adjectives[0] : 'amazing';
        const myCat = categories.length > 0 ? categories[0] : 'animal';
        const myName = this.currentAnimal.name;

        // Store expected values on UI
        document.getElementById('slot-name').dataset.expected = myName;
        document.getElementById('slot-adjective').dataset.expected = myAdj;
        document.getElementById('slot-category').dataset.expected = myCat;
        document.getElementById('sentence-animal-svg').innerHTML = renderAnimalSvg(this.currentAnimal.id);

        // Generate word bank (mix correct with random)
        const bank = [myName, myAdj, myCat];
        const randomAnimals = getRandomAnimals(3).map(a => a.name).filter(n => n !== myName);
        const distractors = ['blue', 'slow', 'tiny', 'giant', 'fluffy', 'scary', 'plant', 'bug'];
        bank.push(...randomAnimals.slice(0, 2));
        bank.push(distractors[Math.floor(Math.random() * distractors.length)]);
        bank.push(distractors[Math.floor(Math.random() * distractors.length)]);

        const wordBankEl = document.getElementById('word-bank');
        wordBankEl.innerHTML = '';

        bank.sort(() => Math.random() - 0.5).forEach(word => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-small';
            btn.textContent = word;
            btn.onclick = () => this.selectWord(word, btn);
            wordBankEl.appendChild(btn);
        });

        const feedbackEl = document.getElementById('sentence-feedback');
        feedbackEl.textContent = '';
        feedbackEl.className = 'spelling-feedback';
    }

    selectWord(word, btn) {
        // Find first empty slot
        let filled = false;
        ['name', 'adjective', 'category'].forEach(key => {
            if (!filled && !this.slots[key]) {
                this.slots[key] = word;
                document.getElementById(`slot-${key}`).textContent = word;
                document.getElementById(`slot-${key}`).style.color = '#333';
                btn.style.display = 'none'; // hide from bank
                filled = true;
            }
        });
        if (filled) playSound('click');
        else playSound('wrong'); // User clicking when slots full
    }

    checkSentence() {
        const expectedName = document.getElementById('slot-name').dataset.expected;
        const expectedAdj = document.getElementById('slot-adjective').dataset.expected;
        const expectedCat = document.getElementById('slot-category').dataset.expected;
        const feedbackEl = document.getElementById('sentence-feedback');

        const isCorrect =
            this.slots.name === expectedName &&
            this.slots.adjective === expectedAdj &&
            this.slots.category === expectedCat;

        if (isCorrect) {
            this.correctCount++;
            feedbackEl.textContent = '🎉 Perfect Sentence!';
            feedbackEl.className = 'spelling-feedback correct';
            playSound('correct');
            // Add some XP
            progressionManager.addXP(15);
            setTimeout(() => this.nextSentence(), 1500);
        } else {
            this.wrongCount++;
            feedbackEl.textContent = '❌ Not quite right. Try again!';
            feedbackEl.className = 'spelling-feedback wrong';
            playSound('wrong');
            // reset slots
            this.slots = { name: null, adjective: null, category: null };
            document.querySelectorAll('.drop-slot').forEach(slot => {
                slot.textContent = '?';
                slot.style.color = 'var(--color-primary)';
            });
            // Show all buttons again
            document.querySelectorAll('#word-bank .btn').forEach(b => b.style.display = 'inline-block');
        }
        this.updateStats();
    }

    skipSentence() {
        const expectedName = document.getElementById('slot-name').dataset.expected;
        const expectedAdj = document.getElementById('slot-adjective').dataset.expected;
        const expectedCat = document.getElementById('slot-category').dataset.expected;
        const feedbackEl = document.getElementById('sentence-feedback');

        feedbackEl.textContent = `Answer: The ${expectedName} is a ${expectedAdj} ${expectedCat}.`;
        feedbackEl.className = 'spelling-feedback';

        setTimeout(() => this.nextSentence(), 3000);
    }

    updateStats() {
        const curEl = document.getElementById('sentence-correct');
        const wrEl = document.getElementById('sentence-wrong');
        if (curEl) curEl.textContent = this.correctCount;
        if (wrEl) wrEl.textContent = this.wrongCount;
    }
}

/* ========================================
   EXPORT & INITIALIZE
   ======================================== */
export const gameManager = new GameManager();
export const spellingBeeManager = new SpellingBeeManager();
export const dailyQuestManager = new DailyQuestManager();
export const sentenceBuilderManager = new SentenceBuilderManager();
