document.addEventListener('DOMContentLoaded', () => {
    const pianoContainer = document.getElementById('piano');
    const playMelodyBtn = document.getElementById('playMelodyBtn');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const feedbackDiv = document.getElementById('feedback');
    const currentLevelDisplay = document.getElementById('currentLevelDisplay');
    const progressToNextLevelDisplay = document.getElementById('progressToNextLevelDisplay');
    const levelSelect = document.getElementById('levelSelect'); // New: Level selection dropdown

    let audioContext;
    let currentMelody = [];
    let userMelody = [];
    let canPlayPiano = false; // Controls if user can click piano keys
    let gameInProgress = true; // Overall game state

    // --- Progression State ---
    let currentLevel; // Will be loaded from localStorage or default to 1
    let correctAnswersInARow = 0;
    const CORRECT_ANSWERS_TO_LEVEL_UP = 3;
    const LOCAL_STORAGE_LEVEL_KEY = 'melodyPitchCurrentLevel';


    const noteFrequencies = { // Base frequencies
        'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
        'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
        'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
    };
    const allChromaticC4B4 = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'];
    const pianoKeyRenderOrder = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5']; // Keys to physically draw

    const keyMap = { // Keyboard mapping for common C4-C5 octave
        'KeyA': 'C4', 'KeyW': 'C#4', 'KeyS': 'D4', 'KeyE': 'D#4', 'KeyD': 'E4',
        'KeyF': 'F4', 'KeyT': 'F#4', 'KeyG': 'G4', 'KeyY': 'G#4', 'KeyH': 'A4',
        'KeyU': 'A#4', 'KeyJ': 'B4', 'KeyK': 'C5'
    };

    // --- Level Definitions for Singers ---
    const levelSettings = {
        1: { melodyLength: 1, notePool: ['C4', 'D4'], name: "Pitch: C vs D", interval: 900 },
        2: { melodyLength: 1, notePool: ['C4', 'E4'], name: "Pitch: C vs E (M3)", interval: 900 },
        3: { melodyLength: 1, notePool: ['C4', 'G4'], name: "Pitch: C vs G (P5)", interval: 900 },
        4: { melodyLength: 2, notePool: ['C4', 'D4', 'E4'], name: "Intervals: C,D,E Steps", interval: 800 },
        5: { melodyLength: 2, notePool: ['C4', 'E4', 'G4'], name: "Arpeggio Fragments: C,E,G", interval: 800 },
        6: { melodyLength: 2, notePool: ['C4','D4','E4','F4','G4'], name: "2 Notes: C-G White Keys", interval: 750 },
        7: { melodyLength: 3, notePool: ['C4','D4','E4'], name: "3 Notes: C,D,E Steps", interval: 700 },
        8: { melodyLength: 3, notePool: ['C4','E4','G4'], name: "3 Notes: C Major Arpeggio", interval: 700 },
        9: { melodyLength: 3, notePool: ['C4','D4','E4','F4','G4','A4','B4'], name: "3 Notes: C Major Scale", interval: 650 },
        10: { melodyLength: 3, notePool: allChromaticC4B4.slice(0,7), name: "3 Notes: Chromatic C4-F#4", interval: 650 }, // C,C#,D,D#,E,F,F#
        11: { melodyLength: 4, notePool: ['C4','D4','E4','F4','G4','A4','B4'], name: "4 Notes: C Major Scale", interval: 600 },
        12: { melodyLength: 4, notePool: allChromaticC4B4, name: "4 Notes: Full Chromatic C4-B4", interval: 600 },
        13: { melodyLength: 4, notePool: ['G3','A3','B3','C4','D4','E4','F4','G4'], name: "4 Notes: G Major (Lower)", interval: 650},
        14: { melodyLength: 5, notePool: allChromaticC4B4, name: "5 Notes: Chromatic C4-B4", interval: 550},
        15: { melodyLength: 5, notePool: noteFrequencies.keys, name: "5 Notes: Wider Chromatic G3-E5", interval: 550, notePool: Object.keys(noteFrequencies).filter(n => n !== 'G#3' && n !== 'A#3' && n!== 'C#4' && n!=='D#4' && n!=='F#4' && n!=='G#4' && n!=='A#4' && n!=='C#5' && n!=='D#5' )}, // Example of a wider pool, simplified
    };
    const MAX_LEVEL = Object.keys(levelSettings).length;


    // --- Audio Functions ---
    function getAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                alert('Web Audio API is not supported in this browser');
                console.error(e);
            }
        }
        return audioContext;
    }

    function playNote(noteName, duration = 0.5, delay = 0) {
        const context = getAudioContext();
        if(!context) return;
        const frequency = noteFrequencies[noteName];
        if (!frequency) { console.warn(`Freq not found: ${noteName}`); return; }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay);
        gainNode.gain.setValueAtTime(0, context.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.6, context.currentTime + delay + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + delay + duration);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + duration);
    }

    async function playSequence(notes) {
        if (!gameInProgress) return;
        disableControlsDuringPlayback();
        const settings = levelSettings[currentLevel];
        const interval = settings.interval || 700;

        for (let i = 0; i < notes.length; i++) {
            playNote(notes[i], interval / 1000 * 0.8);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        if (gameInProgress) { // Check again in case game ended during sequence
            canPlayPiano = true;
            checkAnswerBtn.disabled = true; // Disabled until user plays enough notes
            playMelodyBtn.disabled = false; // Can replay current melody
            feedbackDiv.textContent = `Your turn! Play the ${currentMelody.length}-note melody.`;
            feedbackDiv.className = 'feedback';
        }
    }

    // --- Piano Key Generation & Styling ---
    function createPiano() {
        pianoKeyRenderOrder.forEach(noteName => {
            const keyElement = document.createElement('div');
            keyElement.classList.add('key');
            keyElement.classList.add(noteName.includes('#') ? 'black' : 'white');
            keyElement.dataset.note = noteName;
            keyElement.addEventListener('mousedown', () => handlePianoKeyPress(noteName, keyElement));
            pianoContainer.appendChild(keyElement);
        });
    }

    function updatePianoKeyStyles() {
        const currentNotePool = levelSettings[currentLevel]?.notePool || allChromaticC4B4;
        document.querySelectorAll('.piano .key').forEach(keyEl => {
            const note = keyEl.dataset.note;
            if (currentNotePool.includes(note)) {
                keyEl.classList.remove('dimmed-for-level');
            } else {
                keyEl.classList.add('dimmed-for-level');
            }
        });
    }

    function handlePianoKeyPress(noteName, keyElement = null) {
        if (!canPlayPiano || !gameInProgress) return;
        
        const currentNotePool = levelSettings[currentLevel]?.notePool || allChromaticC4B4;
        if (!currentNotePool.includes(noteName) && !keyElement?.classList.contains('dimmed-for-level')) {
            // If key is dimmed, don't register or play (already handled by CSS opacity and cursor)
            // This secondary check is mostly for keyboard input where element might not be directly checked
            // However, the main check for dimmed keys should be before calling this
        }


        playNote(noteName, 0.4);
        userMelody.push(noteName);

        const actualElement = keyElement || document.querySelector(`.key[data-note="${noteName}"]`);
        if (actualElement && !actualElement.classList.contains('dimmed-for-level')) {
            actualElement.classList.add('active');
            setTimeout(() => actualElement.classList.remove('active'), 200);
        }

        if (currentMelody.length > 0) {
            feedbackDiv.textContent = `Notes played: ${userMelody.length}`;
            checkAnswerBtn.disabled = userMelody.length < currentMelody.length;
        }
    }

    // --- Game Logic ---
    function generateMelody() {
        const settings = levelSettings[currentLevel];
        currentMelody = [];
        const notePool = settings.notePool;
        const length = settings.melodyLength;

        if (!notePool || notePool.length === 0) {
            console.error("Note pool empty for level:", currentLevel);
            currentMelody = ['C4']; return;
        }

        // Simple generation, try to make notes different if pool is small and length is 2
        if (length === 2 && notePool.length === 2) {
            currentMelody.push(notePool[0]);
            currentMelody.push(notePool[1]);
            if (Math.random() < 0.5) currentMelody.reverse(); // Shuffle C-D or D-C
        } else if (length === 1 && notePool.length > 0){
            currentMelody.push(notePool[Math.floor(Math.random() * notePool.length)]);
        }
        else {
            for (let i = 0; i < length; i++) {
                let nextNote;
                do {
                     nextNote = notePool[Math.floor(Math.random() * notePool.length)];
                // Avoid immediate repetition in short melodies if pool allows
                } while (length <= 3 && notePool.length > 1 && nextNote === currentMelody[i-1]);
                currentMelody.push(nextNote);
            }
        }
        console.log(`Lvl ${currentLevel} (${settings.name}): ${currentMelody.join(', ')}`);
    }

    function checkAnswer() {
        if (!gameInProgress) return;
        canPlayPiano = false; // Stop piano input during feedback/transition
        disableControlsDuringPlayback(); // General disable

        const targetLength = currentMelody.length;
        const userPlayedSegment = userMelody.slice(-targetLength);
        let correct = userPlayedSegment.length === targetLength &&
                      currentMelody.every((note, index) => note === userPlayedSegment[index]);

        if (correct) {
            correctAnswersInARow++;
            feedbackDiv.textContent = `Correct!`;
            feedbackDiv.className = 'feedback correct';

            if (correctAnswersInARow >= CORRECT_ANSWERS_TO_LEVEL_UP) {
                if (currentLevel < MAX_LEVEL) {
                    currentLevel++;
                    correctAnswersInARow = 0;
                    saveLevel(currentLevel); // Save new level
                    feedbackDiv.textContent = `Level Up! Now on Level ${currentLevel}: ${levelSettings[currentLevel].name}`;
                } else {
                    handleGameCompletion();
                    return; // Exit, game over
                }
            } else {
                feedbackDiv.textContent = `Correct! (${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP} for next level)`;
            }
            // Auto proceed to next melody/level
            setTimeout(() => {
                if(gameInProgress) startNewRound(true); // Pass true to autoPlay
            }, 2000); // 2-second delay
        } else {
            correctAnswersInARow = 0;
            feedbackDiv.textContent = `Not quite. Melody was: ${currentMelody.join(', ')}. You played: ${userPlayedSegment.join(', ')}. Try this level again.`;
            feedbackDiv.className = 'feedback incorrect';
            // Auto proceed to new melody for *same* level
             setTimeout(() => {
                if(gameInProgress) startNewRound(true); // Pass true to autoPlay
            }, 3000); // 3-second delay for incorrect
        }
        userMelody = [];
        updateProgressDisplay();
        populateLevelSelection(); // Update level selection dropdown
    }

    function handleGameCompletion() {
        gameInProgress = false;
        canPlayPiano = false;
        feedbackDiv.textContent = "Congratulations! You've mastered all levels!";
        feedbackDiv.className = 'feedback correct';
        playMelodyBtn.textContent = "Restart Game";
        playMelodyBtn.disabled = false;
        checkAnswerBtn.disabled = true;
        currentLevelDisplay.textContent = "Game Mastered!";
        progressToNextLevelDisplay.textContent = "Well Done!";
        updatePianoKeyStyles(); // Dim all keys or set a default state
        populateLevelSelection(); // Update level selection dropdown
    }

    // --- Level Storage Functions ---
    function saveLevel(level) {
        try {
            localStorage.setItem(LOCAL_STORAGE_LEVEL_KEY, level);
            console.log(`Level ${level} saved to localStorage.`);
        } catch (e) {
            console.error("Failed to save level to localStorage:", e);
        }
    }

    function populateLevelSelection() {
        levelSelect.innerHTML = ''; // Clear existing options
        const maxUnlockedLevel = loadLevel(); // Get the highest unlocked level
        for (let i = 1; i <= maxUnlockedLevel; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Level ${i}: ${levelSettings[i].name}`;
            levelSelect.appendChild(option);
        }
        levelSelect.value = currentLevel; // Set current level as selected
    }

    function loadLevel() {
        try {
            const savedLevel = localStorage.getItem(LOCAL_STORAGE_LEVEL_KEY);
            if (savedLevel) {
                let level = parseInt(savedLevel, 10);
                // Ensure loaded level is within valid range
                if (level >= 1 && level <= MAX_LEVEL) {
                    return level;
                } else if (level > MAX_LEVEL) {
                    return MAX_LEVEL; // Cap at max level if somehow higher
                }
            }
        } catch (e) {
            console.error("Failed to load level from localStorage:", e);
        }
        return 1; // Default to level 1 if no saved level or error
    }

    function startNewRound(autoPlayMelody = false) {
        if (!gameInProgress && playMelodyBtn.textContent !== "Restart Game") { // Prevent starting if game over unless restarting
             handleGameCompletion(); // Ensure UI is in completed state
             return;
        }
        if (currentLevel > MAX_LEVEL) {
            handleGameCompletion();
            return;
        }

        gameInProgress = true; // Make sure it's set
        userMelody = [];
        generateMelody();
        updatePianoKeyStyles();
        updateProgressDisplay();
        populateLevelSelection(); // Update level selection dropdown

        feedbackDiv.textContent = `Level ${currentLevel}: ${levelSettings[currentLevel].name}. Listen...`;
        feedbackDiv.className = 'feedback';
        
        canPlayPiano = false; // User can't play until melody is heard
        playMelodyBtn.disabled = false;
        playMelodyBtn.textContent = "Play Melody"; // Ensure correct text
        checkAnswerBtn.disabled = true; // Disabled until user plays notes

        if (autoPlayMelody) {
            setTimeout(() => playSequence(currentMelody), 500); // Short delay before auto-playing
        }
    }

    // --- UI Update & Control Functions ---
    function updateProgressDisplay() {
        if (!gameInProgress && currentLevel > MAX_LEVEL) return; // Already handled by completion
        currentLevelDisplay.textContent = `Level: ${currentLevel}`;
        progressToNextLevelDisplay.textContent = `Correct: ${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP}`;
    }

    function disableControlsDuringPlayback() {
        playMelodyBtn.disabled = true;
        checkAnswerBtn.disabled = true;
    }


    // --- Event Listeners ---
    playMelodyBtn.addEventListener('click', () => {
        if (getAudioContext() === null && playMelodyBtn.textContent !== "Restart Game") {
            // If context failed to init, don't proceed unless restarting.
            // Alert already shown in getAudioContext.
            return;
        }

        if (playMelodyBtn.textContent === "Restart Game") {
            currentLevel = 1;
            correctAnswersInARow = 0;
            saveLevel(currentLevel); // Reset saved level on restart
            gameInProgress = true; // Explicitly set game in progress
            startNewRound(true); // autoPlay new first melody
        } else if (currentMelody.length > 0 && gameInProgress) {
            playSequence(currentMelody);
        } else if (gameInProgress) { // If no current melody but game is on (e.g. first click)
            startNewRound(true);
        }
    });

    checkAnswerBtn.addEventListener('click', () => {
        if (!gameInProgress) return;
        if (userMelody.length < currentMelody.length) {
            feedbackDiv.textContent = "Play enough notes first!";
            feedbackDiv.className = 'feedback incorrect';
            return;
        }
        checkAnswer();
    });

    levelSelect.addEventListener('change', (event) => {
        const selectedLevel = parseInt(event.target.value, 10);
        if (selectedLevel >= 1 && selectedLevel <= loadLevel()) { // Only allow selecting unlocked levels
            currentLevel = selectedLevel;
            correctAnswersInARow = 0; // Reset progress for the new level
            startNewRound(true); // Start new round with selected level
        } else {
            // Optionally provide feedback if an invalid level was somehow selected
            console.warn("Attempted to select an invalid or locked level.");
            levelSelect.value = currentLevel; // Revert selection
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.repeat || !canPlayPiano || !gameInProgress) return;
        const noteName = keyMap[event.code];
        if (noteName) {
            const keyElement = document.querySelector(`.key[data-note="${noteName}"]`);
            if (keyElement && !keyElement.classList.contains('dimmed-for-level')) {
                 handlePianoKeyPress(noteName, keyElement);
            } else if (keyElement && keyElement.classList.contains('dimmed-for-level')){
                // Optionally play a very soft "thud" or nothing if a dimmed key is pressed via keyboard
                // For now, do nothing.
            }
        }
    });

    // --- Initialization ---
    createPiano();
    currentLevel = loadLevel(); // Load level on init
    populateLevelSelection(); // Populate dropdown on init
    // Don't start a round immediately, let user click "Play Melody" first.
    // Update UI for initial state.
    playMelodyBtn.disabled = false;
    checkAnswerBtn.disabled = true;
    canPlayPiano = false;
    updatePianoKeyStyles(); // Dim keys based on level 1 initially
    updateProgressDisplay();
    feedbackDiv.textContent = `Welcome! Click "Play Melody" to start Level ${currentLevel}.`;
});
