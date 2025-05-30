document.addEventListener('DOMContentLoaded', () => {
    const pianoContainer = document.getElementById('piano');
    const playMelodyBtn = document.getElementById('playMelodyBtn');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const feedbackDiv = document.getElementById('feedback');
    const currentLevelDisplay = document.getElementById('currentLevelDisplay');
    const progressToNextLevelDisplay = document.getElementById('progressToNextLevelDisplay');
    const levelSelect = document.getElementById('levelSelect');

    let audioContext;
    let currentMelody = [];
    let userMelody = [];
    let canPlayPiano = false;
    let gameInProgress = true;

    let currentLevel;
    let correctAnswersInARow = 0;
    const CORRECT_ANSWERS_TO_LEVEL_UP = 3;
    const LOCAL_STORAGE_LEVEL_KEY = 'melodyPitchInfiniteCurrentLevel'; // Use a new key for infinite version

    const noteFrequencies = {
        'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
        'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
        'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
    };
    
    // Note definitions for getLevelSettings - suffixed with _gs to avoid potential conflicts
    const allChromaticC4B4_gs = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'];
    const allChromaticC4C5_gs = [...allChromaticC4B4_gs, 'C5'];
    const cMajorScaleC4B4_gs = ['C4','D4','E4','F4','G4','A4','B4'];
    const cMajorScaleC4C5_gs = [...cMajorScaleC4B4_gs, 'C5'];
    const cMajorPentatonicC4A4_gs = ['C4','D4','E4','G4','A4'];
    const cMajorPentatonicC4C5_gs = [...cMajorPentatonicC4A4_gs, 'C5'];

    const pianoKeyRenderOrder = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5'];

    const keyMap = {
        'KeyA': 'C4', 'KeyW': 'C#4', 'KeyS': 'D4', 'KeyE': 'D#4', 'KeyD': 'E4',
        'KeyF': 'F4', 'KeyT': 'F#4', 'KeyG': 'G4', 'KeyY': 'G#4', 'KeyH': 'A4',
        'KeyU': 'A#4', 'KeyJ': 'B4', 'KeyK': 'C5'
    };

    // --- NEW: getLevelSettings function ---
    function getLevelSettings(level) {
        let melodyLength;
        let notePool;
        let name;
        let tempo = 950;

        if (level === 1) {
            melodyLength = 1; notePool = ['C4', 'G4']; name = "1 Note: C4 vs G4"; tempo = 900;
        } else if (level === 2) {
            melodyLength = 1; notePool = ['C4', 'E4']; name = "1 Note: C4 vs E4"; tempo = 900;
        } else if (level === 3) {
            melodyLength = 1; notePool = ['C4', 'D4']; name = "1 Note: C4 vs D4"; tempo = 900;
        } else if (level === 4) {
            melodyLength = 1; notePool = ['C4', 'F4']; name = "1 Note: C4 vs F4"; tempo = 900;
        } else if (level === 5) {
            melodyLength = 1; notePool = ['C4', 'C5']; name = "1 Note: C4 vs C5 (Octave)"; tempo = 900;
        }
        else if (level >= 6 && level <= 25) { // PHASE 1: Two-Note Melodies
            melodyLength = 2;
            tempo = 850 - Math.floor((level - 6) / 4) * 25;
            const subPhase = level - 5;
            if (subPhase <= 3) { notePool = ['C4', 'D4', 'E4']; name = `2 Notes: C-D-E Steps (${subPhase}/3)`; }
            else if (subPhase <= 6) { notePool = ['C4', 'E4', 'G4']; name = `2 Notes: C-E-G Skips (${subPhase-3}/3)`; }
            else if (subPhase <= 9) { notePool = cMajorPentatonicC4A4_gs; name = `2 Notes: C Pentatonic Frags (${subPhase-6}/3)`; }
            else if (subPhase <= 12) { notePool = cMajorScaleC4B4_gs.slice(0, 5); name = `2 Notes: C-G Diatonic Frags (${subPhase-9}/3)`; }
            else if (subPhase <= 15) { notePool = cMajorScaleC4B4_gs; name = `2 Notes: C Maj Scale Frags (${subPhase-12}/3)`; }
            else if (subPhase <= 17) { notePool = ['C4', 'C#4', 'D4']; name = `2 Notes: Chromatic C-C#-D (${subPhase-15}/2)`; }
            else { // Levels 23-25
                if (subPhase <= 18) { notePool = allChromaticC4B4_gs.slice(0,3); // C, C#, D
                } else if (subPhase <= 19) { notePool = allChromaticC4B4_gs.slice(0,4); // C, C#, D, D#
                } else { notePool = allChromaticC4B4_gs.slice(0,5); } // C, C#, D, D#, E
                name = `2 Notes: Chromatic Frags (${subPhase-17}/3)`;
            }
        }
        else if (level >= 26 && level <= 55) { // PHASE 2: Three-Note Melodies
            melodyLength = 3;
            tempo = 750 - Math.floor((level - 26) / 5) * 20;
            const subPhase = level - 25;
            if (subPhase <= 4) { notePool = ['C4', 'D4', 'E4']; name = `3 Notes: C-D-E Steps (${subPhase}/4)`; }
            else if (subPhase <= 8) { notePool = cMajorPentatonicC4C5_gs; name = `3 Notes: C Pentatonic (${subPhase-4}/4)`; }
            else if (subPhase <= 12) { notePool = ['C4', 'E4', 'G4', 'C5']; name = `3 Notes: C Maj Arp (${subPhase-8}/4)`; }
            else if (subPhase <= 17) { notePool = cMajorScaleC4B4_gs.slice(0, 5); name = `3 Notes: C-G Diatonic (${subPhase-12}/5)`;}
            else if (subPhase <= 22) { notePool = cMajorScaleC4C5_gs; name = `3 Notes: C Maj Scale (${subPhase-17}/5)`; }
            else if (subPhase <= 26) { notePool = ['C4','D4','E4','F4','F#4','G4']; name = `3 Notes: Diatonic + F# (${subPhase-22}/4)`; }
            else { // Levels 52-55
                if (subPhase <= 28) { notePool = allChromaticC4B4_gs.slice(0,5); // C,C#,D,D#,E
                } else { notePool = allChromaticC4B4_gs.slice(0,7); } // C to F#
                name = `3 Notes: Chromatic Frags (${subPhase-26}/4)`;
            }
        }
         else if (level >= 56 && level <= 90) { // PHASE 3: Four-Note Melodies
            melodyLength = 4;
            tempo = 650 - Math.floor((level - 56) / 6) * 15;
            const subPhase = level - 55;
            if (subPhase <= 5) { notePool = cMajorPentatonicC4C5_gs; name = `4 Notes: C Pentatonic (${subPhase}/5)`; }
            else if (subPhase <= 10) { notePool = cMajorScaleC4B4_gs.slice(0,5); name = `4 Notes: C-G Diatonic (${subPhase-5}/5)`; }
            else if (subPhase <= 17) { notePool = cMajorScaleC4C5_gs; name = `4 Notes: C Maj Scale (${subPhase-10}/7)`; }
            else if (subPhase <= 24) { notePool = ['C4','C#4','D4','E4','F4','F#4','G4','A4','B4','C5'].filter(n => noteFrequencies[n]); name = `4 Notes: C Maj + Chromatics (${subPhase-17}/7)`; }
            else if (subPhase <= 30) { notePool = allChromaticC4B4_gs.slice(0,7); name = `4 Notes: Chromatic C-F# (${subPhase-24}/6)`; }
            else { notePool = allChromaticC4B4_gs; name = `4 Notes: Chromatic C-B (${subPhase-30}/5)`; }
        }
        else { // PHASE 4+: Longer Melodies
            const baseLevelForPhase4 = 90;
            const levelsIntoPhase4 = level - baseLevelForPhase4;
            melodyLength = 5 + Math.floor(levelsIntoPhase4 / 40);
            melodyLength = Math.min(melodyLength, 8); // Cap melody length
            tempo = 550 - Math.floor(levelsIntoPhase4 / 8) * 10 - (melodyLength - 4) * 30;
            const stageInLength = levelsIntoPhase4 % 40;
            if (stageInLength < 8) { notePool = cMajorPentatonicC4C5_gs; name = `${melodyLength} Notes: C Pentatonic`; }
            else if (stageInLength < 16) { notePool = cMajorScaleC4C5_gs; name = `${melodyLength} Notes: C Major Scale`; }
            else if (stageInLength < 24) { notePool = allChromaticC4B4_gs.slice(0,7); name = `${melodyLength} Notes: Chromatic C-F#`; }
            else if (stageInLength < 32) { notePool = allChromaticC4B4_gs; name = `${melodyLength} Notes: Chromatic C-B`; }
            else { notePool = allChromaticC4C5_gs; name = `${melodyLength} Notes: Chromatic C-C (Octave)`; }
            if (melodyLength >=6 && level > 150) {
                const widerPoolBase = ['G3','A3','B3', ...allChromaticC4C5_gs, 'D5', 'E5'];
                notePool = widerPoolBase.filter(n => noteFrequencies[n]); // Ensure all notes have frequencies
                name = `${melodyLength} Notes: Wider Chromatic`;
            }
        }
        tempo = Math.max(350, tempo); // Absolute minimum tempo
        return {
            levelNumber: level,
            melodyLength,
            notePool: (notePool && notePool.length > 0) ? notePool : ['C4'], // Fallback
            name: `Lvl ${level}: ${name}`,
            interval: tempo
        };
    }

    // --- Audio Functions --- (Mostly Unchanged)
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
        const settings = getLevelSettings(currentLevel); // UPDATED
        const interval = settings.interval || 700;

        for (let i = 0; i < notes.length; i++) {
            playNote(notes[i], interval / 1000 * 0.8);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        if (gameInProgress) {
            canPlayPiano = true;
            checkAnswerBtn.disabled = true;
            playMelodyBtn.disabled = false;
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
        const currentSettings = getLevelSettings(currentLevel); // UPDATED
        const currentNotePool = currentSettings?.notePool || pianoKeyRenderOrder; // Use pianoKeyRenderOrder as a fallback
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
        
        const currentSettings = getLevelSettings(currentLevel); // UPDATED
        const currentNotePool = currentSettings?.notePool || pianoKeyRenderOrder;

        // Only play/register if the note is part of the current level's pool or if all keys are active (e.g. pianoKeyRenderOrder fallback)
        // The dimmed-for-level class should visually guide the user, this is an additional check.
        if (!currentNotePool.includes(noteName)) {
            const actualElement = keyElement || document.querySelector(`.key[data-note="${noteName}"]`);
            if(actualElement && actualElement.classList.contains('dimmed-for-level')) {
                return; // Do not process if key is visually dimmed for the level
            }
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
        const settings = getLevelSettings(currentLevel); // UPDATED
        currentMelody = [];
        const notePool = settings.notePool;
        const length = settings.melodyLength;

        if (!notePool || notePool.length === 0) {
            console.error("Note pool empty for level:", currentLevel, "Settings:", settings);
            currentMelody = ['C4']; return; // Fallback
        }
        
        if (length === 1 && notePool.length > 0){ // Ensure this comes before the more general 'else'
            currentMelody.push(notePool[Math.floor(Math.random() * notePool.length)]);
        } else if (length === 2 && notePool.length === 2) {
            currentMelody.push(notePool[0]);
            currentMelody.push(notePool[1]);
            if (Math.random() < 0.5) currentMelody.reverse();
        } else {
            let lastNote = null; // To avoid immediate repetition for short melodies
            for (let i = 0; i < length; i++) {
                let nextNote;
                let attempts = 0; // Prevent infinite loop if pool is too small
                do {
                     nextNote = notePool[Math.floor(Math.random() * notePool.length)];
                     attempts++;
                } while (length <= 3 && notePool.length > 1 && nextNote === lastNote && attempts < 10);
                currentMelody.push(nextNote);
                lastNote = nextNote;
            }
        }
        console.log(`${settings.name}: ${currentMelody.join(', ')}`);
    }

    function checkAnswer() {
        if (!gameInProgress) return;
        canPlayPiano = false;
        disableControlsDuringPlayback();

        const targetLength = currentMelody.length;
        const userPlayedSegment = userMelody.slice(-targetLength); // Check only the last N notes
        let correct = userPlayedSegment.length === targetLength &&
                      currentMelody.every((note, index) => note === userPlayedSegment[index]);

        if (correct) {
            correctAnswersInARow++;
            feedbackDiv.textContent = `Correct!`;
            feedbackDiv.className = 'feedback correct';

            if (correctAnswersInARow >= CORRECT_ANSWERS_TO_LEVEL_UP) {
                currentLevel++;
                correctAnswersInARow = 0;
                saveLevel(currentLevel);
                const newLevelSettings = getLevelSettings(currentLevel); // UPDATED
                feedbackDiv.textContent = `Level Up! Now on ${newLevelSettings.name}`;
                if (currentLevel % 25 === 0) { // Optional milestone message
                    feedbackDiv.textContent += " Great progress!";
                }
            } else {
                feedbackDiv.textContent = `Correct! (${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP} for next level)`;
            }
            setTimeout(() => {
                if(gameInProgress) startNewRound(true);
            }, 1500); // Shorter delay for correct
        } else {
            correctAnswersInARow = 0;
            feedbackDiv.textContent = `Not quite. Melody was: ${currentMelody.join(', ')}. You played: ${userPlayedSegment.join(', ')}. Try this level again.`;
            feedbackDiv.className = 'feedback incorrect';
             setTimeout(() => {
                if(gameInProgress) startNewRound(true);
            }, 2500);
        }
        userMelody = []; // Clear user melody after checking
        updateProgressDisplay();
        populateLevelSelection();
    }

    function handleGameCompletion() { // This is now more like a "high score" or "restart" point
        gameInProgress = false;
        canPlayPiano = false;
        const finalLevelSettings = getLevelSettings(currentLevel);
        feedbackDiv.textContent = `Wow! You've reached ${finalLevelSettings.name}! Click Restart to play again.`;
        feedbackDiv.className = 'feedback correct';
        playMelodyBtn.textContent = "Restart Game";
        playMelodyBtn.disabled = false;
        checkAnswerBtn.disabled = true;
        currentLevelDisplay.textContent = `Reached: ${currentLevel}`;
        progressToNextLevelDisplay.textContent = "Fantastic!";
        updatePianoKeyStyles();
        populateLevelSelection();
    }

    // --- Level Storage Functions ---
    function saveLevel(level) {
        try {
            localStorage.setItem(LOCAL_STORAGE_LEVEL_KEY, level);
        } catch (e) {
            console.error("Failed to save level to localStorage:", e);
        }
    }
    
    function loadLevel() {
        try {
            const savedLevel = localStorage.getItem(LOCAL_STORAGE_LEVEL_KEY);
            if (savedLevel) {
                let level = parseInt(savedLevel, 10);
                if (level >= 1) { // No hard upper cap, but getLevelSettings might have practical limits
                    return Math.min(level, 999); // Practical cap for safety/UI
                }
            }
        } catch (e) {
            console.error("Failed to load level from localStorage:", e);
        }
        return 1;
    }

    function populateLevelSelection() {
        levelSelect.innerHTML = '';
        const maxUnlockedLevel = loadLevel();
        const practicalDropdownLimit = Math.max(maxUnlockedLevel, 200); // Show at least 200 or current unlocked

        for (let i = 1; i <= practicalDropdownLimit; i++) {
            if (i > maxUnlockedLevel && i > currentLevel + 5 && i !== practicalDropdownLimit) { // Don't list too many future levels
                if (i % 10 === 0 || i % 25 === 0 ) { /* show some milestones */ }
                else { continue; }
            }
            const option = document.createElement('option');
            option.value = i;
            const levelData = getLevelSettings(i);
            option.textContent = levelData.name.length > 50 ? `Lvl ${i}: ${levelData.melodyLength} notes...` : levelData.name; // Truncate long names
            
            if (i > maxUnlockedLevel) {
                option.disabled = true; // Visually indicate locked levels
                option.textContent += " (Locked)";
            }
            levelSelect.appendChild(option);
        }
        
        // Ensure currentLevel is selectable if it exists or is maxUnlockedLevel
        if (document.querySelector(`option[value="${currentLevel}"]`)) {
             levelSelect.value = currentLevel;
        } else if (maxUnlockedLevel > 0 && document.querySelector(`option[value="${maxUnlockedLevel}"]`)) {
             levelSelect.value = maxUnlockedLevel; // Fallback to highest unlocked if current isn't directly listed
        } else if (levelSelect.options.length > 0) {
             levelSelect.value = levelSelect.options[0].value;
        }
    }


    function startNewRound(autoPlayMelody = false) {
        if (playMelodyBtn.textContent === "Restart Game" && !autoPlayMelody) {
            // If game is in a "completed/restart" state, and this wasn't triggered by restart button, do nothing
            // The restart logic is handled in the playMelodyBtn event listener.
            if (!gameInProgress) return; // If gameInProgress is false, it means we are in a "finished" state.
        }

        gameInProgress = true;
        userMelody = [];
        generateMelody();
        updatePianoKeyStyles();
        updateProgressDisplay();
        // populateLevelSelection(); // Called after checkAnswer or on init/level change

        const settings = getLevelSettings(currentLevel); // UPDATED
        feedbackDiv.textContent = `${settings.name}. Listen...`;
        feedbackDiv.className = 'feedback';
        
        canPlayPiano = false;
        playMelodyBtn.disabled = false;
        playMelodyBtn.textContent = "Play Melody";
        checkAnswerBtn.disabled = true;

        if (autoPlayMelody) {
            setTimeout(() => playSequence(currentMelody), 500);
        }
    }

    // --- UI Update & Control Functions ---
    function updateProgressDisplay() {
        // if (!gameInProgress && currentLevel > MAX_LEVEL) return; // Old MAX_LEVEL check
        const settings = getLevelSettings(currentLevel);
        currentLevelDisplay.textContent = `Level: ${currentLevel}`; // Simpler display name
        progressToNextLevelDisplay.textContent = `Correct: ${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP}`;
    }

    function disableControlsDuringPlayback() {
        playMelodyBtn.disabled = true;
        checkAnswerBtn.disabled = true;
    }

    // --- Event Listeners ---
    playMelodyBtn.addEventListener('click', () => {
        if (getAudioContext() === null && playMelodyBtn.textContent !== "Restart Game") {
            return;
        }

        if (playMelodyBtn.textContent === "Restart Game") {
            currentLevel = 1;
            correctAnswersInARow = 0;
            saveLevel(currentLevel);
            gameInProgress = true; 
            populateLevelSelection(); // Update dropdown for new game
            startNewRound(true);
        } else if (currentMelody.length > 0 && gameInProgress) {
            playSequence(currentMelody);
        } else if (gameInProgress) {
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
        const maxUnlocked = loadLevel();
        if (selectedLevel >= 1 && selectedLevel <= maxUnlocked) { // Only allow selecting unlocked levels
            currentLevel = selectedLevel;
            correctAnswersInARow = 0;
            saveLevel(currentLevel); // Save the manually selected level as current progress
            populateLevelSelection(); // Re-populate to set the correct selection and lock status
            startNewRound(true);
        } else {
            console.warn("Attempted to select an invalid or locked level.");
            levelSelect.value = currentLevel; // Revert selection
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.repeat || !canPlayPiano || !gameInProgress) return;
        const noteName = keyMap[event.code];
        if (noteName) {
            const keyElement = document.querySelector(`.key[data-note="${noteName}"]`);
            // Pass keyElement to handlePianoKeyPress for dimmed check
            handlePianoKeyPress(noteName, keyElement);
        }
    });

    // --- Initialization ---
    createPiano();
    currentLevel = loadLevel();
    populateLevelSelection();
    
    playMelodyBtn.disabled = false;
    checkAnswerBtn.disabled = true;
    canPlayPiano = false;
    updatePianoKeyStyles();
    updateProgressDisplay();
    const initialSettings = getLevelSettings(currentLevel);
    feedbackDiv.textContent = `Welcome! Click "Play Melody" to start ${initialSettings.name}.`;
});