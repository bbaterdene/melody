document.addEventListener('DOMContentLoaded', () => {
    const pianoContainer = document.getElementById('piano');
    const playMelodyBtn = document.getElementById('playMelodyBtn');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const feedbackDiv = document.getElementById('feedback');
    const currentLevelDisplay = document.getElementById('currentLevelDisplay');
    const progressToNextLevelDisplay = document.getElementById('progressToNextLevelDisplay');
    const levelSelect = document.getElementById('levelSelect');

    let audioContext;
    let keepAliveNode = null;
    let currentMelody = [];
    let userMelody = [];
    let canPlayPiano = false;
    let gameInProgress = true;

    let currentLevel = 1;
    let maxLevelReached = 1;
    let correctAnswersInARow = 0;

    const CORRECT_ANSWERS_TO_LEVEL_UP = 3;
    const CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE = 6; // For unlocking a new highest level

    let isAttemptingUnlockChallenge = false;
    let challengeTargetLevel = 0; // The specific locked level being attempted

    const LOCAL_STORAGE_LEVEL_KEY = 'melodyPitchInfiniteCurrentLevel';
    const LOCAL_STORAGE_MAX_LEVEL_KEY = 'melodyPitchInfiniteMaxLevelReached';

    const noteFrequencies = {
        'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
        'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
        'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
    };

    const allChromaticC4B4_gs = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'];
    const allChromaticC4C5_gs = [...allChromaticC4B4_gs, 'C5'];
    const cMajorScaleC4B4_gs = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
    const cMajorScaleC4C5_gs = [...cMajorScaleC4B4_gs, 'C5'];
    const cMajorPentatonicC4A4_gs = ['C4', 'D4', 'E4', 'G4', 'A4'];
    const cMajorPentatonicC4C5_gs = [...cMajorPentatonicC4A4_gs, 'C5'];

    const pianoKeyRenderOrder = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];

    const keyMap = {
        'KeyA': 'C4', 'KeyW': 'C#4', 'KeyS': 'D4', 'KeyE': 'D#4', 'KeyD': 'E4',
        'KeyF': 'F4', 'KeyT': 'F#4', 'KeyG': 'G4', 'KeyY': 'G#4', 'KeyH': 'A4',
        'KeyU': 'A#4', 'KeyJ': 'B4', 'KeyK': 'C5'
    };

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
        else if (level >= 6 && level <= 25) {
            melodyLength = 2;
            tempo = 850 - Math.floor((level - 6) / 4) * 25;
            const subPhase = level - 5;
            if (subPhase <= 3) { notePool = ['C4', 'D4', 'E4']; name = `2 Notes: C-D-E Steps (${subPhase}/3)`; }
            else if (subPhase <= 6) { notePool = ['C4', 'E4', 'G4']; name = `2 Notes: C-E-G Skips (${subPhase - 3}/3)`; }
            else if (subPhase <= 9) { notePool = cMajorPentatonicC4A4_gs; name = `2 Notes: C Pentatonic Frags (${subPhase - 6}/3)`; }
            else if (subPhase <= 12) { notePool = cMajorScaleC4B4_gs.slice(0, 5); name = `2 Notes: C-G Diatonic Frags (${subPhase - 9}/3)`; }
            else if (subPhase <= 15) { notePool = cMajorScaleC4B4_gs; name = `2 Notes: C Maj Scale Frags (${subPhase - 12}/3)`; }
            else if (subPhase <= 17) { notePool = ['C4', 'C#4', 'D4']; name = `2 Notes: Chromatic C-C#-D (${subPhase - 15}/2)`; }
            else {
                if (subPhase <= 18) { notePool = allChromaticC4B4_gs.slice(0, 3);
                } else if (subPhase <= 19) { notePool = allChromaticC4B4_gs.slice(0, 4);
                } else { notePool = allChromaticC4B4_gs.slice(0, 5); }
                name = `2 Notes: Chromatic Frags (${subPhase - 17}/3)`;
            }
        }
        else if (level >= 26 && level <= 55) {
            melodyLength = 3;
            tempo = 750 - Math.floor((level - 26) / 5) * 20;
            const subPhase = level - 25;
            if (subPhase <= 4) { notePool = ['C4', 'D4', 'E4']; name = `3 Notes: C-D-E Steps (${subPhase}/4)`; }
            else if (subPhase <= 8) { notePool = cMajorPentatonicC4C5_gs; name = `3 Notes: C Pentatonic (${subPhase - 4}/4)`; }
            else if (subPhase <= 12) { notePool = ['C4', 'E4', 'G4', 'C5']; name = `3 Notes: C Maj Arp (${subPhase - 8}/4)`; }
            else if (subPhase <= 17) { notePool = cMajorScaleC4B4_gs.slice(0, 5); name = `3 Notes: C-G Diatonic (${subPhase - 12}/5)`; }
            else if (subPhase <= 22) { notePool = cMajorScaleC4C5_gs; name = `3 Notes: C Maj Scale (${subPhase - 17}/5)`; }
            else if (subPhase <= 26) { notePool = ['C4', 'D4', 'E4', 'F4', 'F#4', 'G4']; name = `3 Notes: Diatonic + F# (${subPhase - 22}/4)`; }
            else {
                if (subPhase <= 28) { notePool = allChromaticC4B4_gs.slice(0, 5);
                } else { notePool = allChromaticC4B4_gs.slice(0, 7); }
                name = `3 Notes: Chromatic Frags (${subPhase - 26}/4)`;
            }
        }
        else if (level >= 56 && level <= 90) {
            melodyLength = 4;
            tempo = 650 - Math.floor((level - 56) / 6) * 15;
            const subPhase = level - 55;
            if (subPhase <= 5) { notePool = cMajorPentatonicC4C5_gs; name = `4 Notes: C Pentatonic (${subPhase}/5)`; }
            else if (subPhase <= 10) { notePool = cMajorScaleC4B4_gs.slice(0, 5); name = `4 Notes: C-G Diatonic (${subPhase - 5}/5)`; }
            else if (subPhase <= 17) { notePool = cMajorScaleC4C5_gs; name = `4 Notes: C Maj Scale (${subPhase - 10}/7)`; }
            else if (subPhase <= 24) { notePool = ['C4', 'C#4', 'D4', 'E4', 'F4', 'F#4', 'G4', 'A4', 'B4', 'C5'].filter(n => noteFrequencies[n]); name = `4 Notes: C Maj + Chromatics (${subPhase - 17}/7)`; }
            else if (subPhase <= 30) { notePool = allChromaticC4B4_gs.slice(0, 7); name = `4 Notes: Chromatic C-F# (${subPhase - 24}/6)`; }
            else { notePool = allChromaticC4B4_gs; name = `4 Notes: Chromatic C-B (${subPhase - 30}/5)`; }
        }
        else { // Level 91+
            const baseLevelForPhase4 = 90;
            const levelsIntoPhase4 = level - baseLevelForPhase4;
            melodyLength = 5 + Math.floor(levelsIntoPhase4 / 40);
            melodyLength = Math.min(melodyLength, 8);
            tempo = 550 - Math.floor(levelsIntoPhase4 / 8) * 10 - (melodyLength - 5) * 30;

            const stageInLength = levelsIntoPhase4 % 40;
            if (stageInLength < 8) { notePool = cMajorPentatonicC4C5_gs; name = `${melodyLength} Notes: C Pentatonic`; }
            else if (stageInLength < 16) { notePool = cMajorScaleC4C5_gs; name = `${melodyLength} Notes: C Major Scale`; }
            else if (stageInLength < 24) { notePool = allChromaticC4B4_gs.slice(0, 7); name = `${melodyLength} Notes: Chromatic C-F#`; }
            else if (stageInLength < 32) { notePool = allChromaticC4B4_gs; name = `${melodyLength} Notes: Chromatic C-B`; }
            else { notePool = allChromaticC4C5_gs; name = `${melodyLength} Notes: Chromatic C-C (Octave)`; }

            if (melodyLength >= 6 && level > 150) {
                const widerPoolBase = ['G3', 'A3', 'B3', ...allChromaticC4C5_gs, 'D5', 'E5'];
                notePool = widerPoolBase.filter(n => noteFrequencies[n]);
                name = `${melodyLength} Notes: Wider Chromatic`;
            }
        }
        tempo = Math.max(350, tempo);
        return {
            levelNumber: level,
            melodyLength,
            notePool: (notePool && notePool.length > 0) ? notePool : ['C4'],
            name: `Lvl ${level}: ${name}`,
            interval: tempo
        };
    }

    function getAudioContext() {
        if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
            if (!audioContext) {
                alert('Web Audio API is not supported in this browser');
            }
            audioContext = null;
            return null;
        }

        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                alert('Web Audio API is not supported in this browser');
                console.error("Error creating AudioContext:", e);
                audioContext = null;
                return null;
            }
        }

        // Do NOT resume here; we’ll call resume() inside the first user gesture
        return audioContext;
    }

    let keepAliveOscillator = null;
    let keepAliveStarted = false;

    function ensureKeepAlive() {
        const context = getAudioContext();
        if (!context || keepAliveStarted) return;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.setValueAtTime(20, context.currentTime);
        gain.gain.setValueAtTime(0.00001, context.currentTime); // Tiny non-zero gain
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        keepAliveOscillator = osc;
        keepAliveStarted = true;
        console.log("Keep-alive oscillator started.");
    }

    function primeAudioSystem(context) {
        if (!context || context.state !== 'running') {
            return;
        }
        try {
            const bufferSource = context.createBufferSource();
            const buffer = context.createBuffer(1, 1, context.sampleRate);
            bufferSource.buffer = buffer;
            bufferSource.connect(context.destination);
            bufferSource.start();
        } catch (e) {
            console.error("Error priming audio system:", e);
        }
    }

    function playNote(noteName, duration = 0.5, delay = 0) {
        const context = getAudioContext();
        if (!context) return;

        const frequency = noteFrequencies[noteName];
        if (!frequency) { console.warn(`Freq not found: ${noteName}`); return; }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay);

        gainNode.gain.setValueAtTime(0, context.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.6, context.currentTime + delay + 0.08);
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + delay + duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + duration + 0.01); // Stop slightly after gain ramp
    }

    async function playSequence(notes) {
        const context = getAudioContext();
        if (!context) {
            console.warn("playSequence: No audio context. Cannot play sequence.");
            if (gameInProgress) {
                canPlayPiano = false;
                checkAnswerBtn.disabled = true;
                playMelodyBtn.disabled = false;
                feedbackDiv.textContent = `Your turn! (Audio not available). Play the ${currentMelody.length}-note melody.`;
                feedbackDiv.className = 'feedback incorrect';
            }
            return;
        }

        if (notes && notes.length > 0 && context.state === 'running') {
            primeAudioSystem(context);
        }

        if (!gameInProgress) return;
        disableControlsDuringPlayback();
        
        const levelForSettings = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
        const settings = getLevelSettings(levelForSettings);
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
        const levelForSettings = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
        const currentSettings = getLevelSettings(levelForSettings);
        const currentNotePool = currentSettings?.notePool || pianoKeyRenderOrder;
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
        const context = getAudioContext();
        if (!context) return;

        if (!canPlayPiano || !gameInProgress) return;

        const levelForSettings = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
        const currentSettings = getLevelSettings(levelForSettings);
        const currentNotePool = currentSettings?.notePool || pianoKeyRenderOrder;

        if (!currentNotePool.includes(noteName)) {
            const actualElement = keyElement || document.querySelector(`.key[data-note="${noteName}"]`);
            if (actualElement && actualElement.classList.contains('dimmed-for-level')) {
                return;
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
    
    function generateMelody(levelToGenerateFor = currentLevel) {
        const settings = getLevelSettings(levelToGenerateFor);
        currentMelody = [];
        const notePool = settings.notePool;
        const length = settings.melodyLength;

        if (!notePool || notePool.length === 0) {
            console.error("Note pool empty for level:", levelToGenerateFor, "Settings:", settings);
            currentMelody = ['C4']; return;
        }
        
        if (length === 1 && notePool.length > 0){
            currentMelody.push(notePool[Math.floor(Math.random() * notePool.length)]);
        } else if (length === 2 && notePool.length === 2) {
            currentMelody.push(notePool[0]);
            currentMelody.push(notePool[1]);
            if (Math.random() < 0.5) currentMelody.reverse();
        } else {
            let lastNote = null; 
            for (let i = 0; i < length; i++) {
                let nextNote;
                let attempts = 0; 
                do {
                     nextNote = notePool[Math.floor(Math.random() * notePool.length)];
                     attempts++;
                } while (length <= 3 && notePool.length > 1 && nextNote === lastNote && attempts < 10);
                currentMelody.push(nextNote);
                lastNote = nextNote;
            }
        }
        console.log(`Generating for ${settings.name}: ${currentMelody.join(', ')}`);
    }

    function checkAnswer() {
        if (!gameInProgress) return;
        canPlayPiano = false;
        disableControlsDuringPlayback();

        const targetLength = currentMelody.length;
        const userPlayedSegment = userMelody.slice(-targetLength);
        let correct = userPlayedSegment.length === targetLength &&
                      currentMelody.every((note, index) => note === userPlayedSegment[index]);

        let feedbackMessage = "";
        let newLevelInfo = "";

        if (isAttemptingUnlockChallenge) {
            if (correct) {
                correctAnswersInARow++;
                if (correctAnswersInARow >= CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE) {
                    // Unlock success!
                    maxLevelReached = challengeTargetLevel;
                    currentLevel = challengeTargetLevel; // Officially set
                    isAttemptingUnlockChallenge = false;
                    correctAnswersInARow = 0;
                    saveGameState();
                    newLevelInfo = getLevelSettings(currentLevel).name;
                    feedbackMessage = `UNLOCKED! ${newLevelInfo} is now your highest.`;
                    feedbackDiv.className = 'feedback correct';
                    populateLevelSelection();
                } else {
                    // Correct, but not enough for unlock yet
                    feedbackMessage = `Correct! (${correctAnswersInARow}/${CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE} for unlock). Keep going on Level ${challengeTargetLevel}!`;
                    feedbackDiv.className = 'feedback correct';
                    // Stay on this challenge level, next round will be for challengeTargetLevel
                }
            } else {
                // Unlock challenge failed
                feedbackMessage = `Unlock attempt for Level ${userPlayedSegment.length > 0 ? challengeTargetLevel : currentLevel} failed. Returning to Level ${maxLevelReached}.`;
                feedbackDiv.className = 'feedback incorrect';
                isAttemptingUnlockChallenge = false;
                currentLevel = maxLevelReached; // Revert to the highest known safe point
                correctAnswersInARow = 0;
                challengeTargetLevel = 0; // Reset challenge target
                saveGameState(); // Save the reverted state
                populateLevelSelection();
            }
        } else { // Normal play on an unlocked level (currentLevel <= maxLevelReached)
            if (correct) {
                correctAnswersInARow++;
                if (correctAnswersInARow >= CORRECT_ANSWERS_TO_LEVEL_UP) {
                    currentLevel++;
                    maxLevelReached = Math.max(maxLevelReached, currentLevel);
                    correctAnswersInARow = 0;
                    saveGameState();
                    newLevelInfo = getLevelSettings(currentLevel).name;
                    feedbackMessage = `Level Up! Now on ${newLevelInfo}.`;
                    if (currentLevel > 0 && currentLevel % 25 === 0) {
                         feedbackMessage += " Great progress!";
                    }
                    feedbackDiv.className = 'feedback correct';
                    populateLevelSelection();
                } else {
                    feedbackMessage = `Correct! (${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP} for next level)`;
                    feedbackDiv.className = 'feedback correct';
                }
            } else {
                // Incorrect on normal level
                correctAnswersInARow = 0;
                const playedNotesStr = userPlayedSegment.length > 0 ? userPlayedSegment.join(', ') : "no notes (or too few)";
                feedbackMessage = `Not quite. Melody was: ${currentMelody.join(', ')}. You played: ${playedNotesStr}. Try this level again.`;
                feedbackDiv.className = 'feedback incorrect';
            }
        }

        feedbackDiv.textContent = feedbackMessage;
        userMelody = [];
        updateProgressDisplay();

        const timeoutDuration = correct ? 
            ( (isAttemptingUnlockChallenge && correctAnswersInARow < CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE && correctAnswersInARow > 0) ? 1500 : 1800) 
            : 2500;
        setTimeout(() => {
            if (gameInProgress) startNewRound(true);
        }, timeoutDuration);
    }
    
    function saveGameState() {
        try {
            localStorage.setItem(LOCAL_STORAGE_LEVEL_KEY, currentLevel);
            localStorage.setItem(LOCAL_STORAGE_MAX_LEVEL_KEY, maxLevelReached);
        } catch (e) {
            console.error("Failed to save game state to localStorage:", e);
        }
    }

    function loadGameState() {
        try {
            const savedCurrentLevel = localStorage.getItem(LOCAL_STORAGE_LEVEL_KEY);
            if (savedCurrentLevel) {
                currentLevel = parseInt(savedCurrentLevel, 10);
                if (isNaN(currentLevel) || currentLevel < 1) currentLevel = 1;
            } else {
                currentLevel = 1;
            }

            const savedMaxLevel = localStorage.getItem(LOCAL_STORAGE_MAX_LEVEL_KEY);
            if (savedMaxLevel) {
                maxLevelReached = parseInt(savedMaxLevel, 10);
                if (isNaN(maxLevelReached) || maxLevelReached < 1) maxLevelReached = 1;
            } else {
                maxLevelReached = 1;
            }
            
            maxLevelReached = Math.max(maxLevelReached, currentLevel); 
            currentLevel = Math.min(currentLevel, maxLevelReached); 
            isAttemptingUnlockChallenge = false; // Ensure this is reset on load
            challengeTargetLevel = 0;

        } catch (e) {
            console.error("Failed to load game state from localStorage:", e);
            currentLevel = 1;
            maxLevelReached = 1;
            isAttemptingUnlockChallenge = false;
            challengeTargetLevel = 0;
        }
    }

    function populateLevelSelection() {
        const previouslySelectedValue = levelSelect.value; // Store for potential re-selection
        levelSelect.innerHTML = '';
        
        // Determine a practical upper limit for the dropdown options
        let practicalDropdownLimit = Math.max(maxLevelReached + 20, 50); // Show at least a few locked levels
        if (isAttemptingUnlockChallenge && challengeTargetLevel > practicalDropdownLimit) {
            practicalDropdownLimit = challengeTargetLevel + 5; // Ensure challenge target is visible
        }
        practicalDropdownLimit = Math.min(practicalDropdownLimit, 999); // Cap at a high number

        let currentLevelOrChallengeTarget = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
        let optionForCurrentSelectionExists = false;

        for (let i = 1; i <= practicalDropdownLimit; i++) {
            // More lenient skipping to ensure important levels are shown
            if ( i !== currentLevelOrChallengeTarget && i !== maxLevelReached &&
                 i > maxLevelReached + 5 && 
                 i !== practicalDropdownLimit &&
                 !(i % 10 === 0 || i % 25 === 0 || i % 5 === 0 && i > 50) 
            ) {
                 if (i > 50 && i % 2 !== 0) continue; // Skip odd levels far out if not milestones
                 else if (i <= 50 && i > maxLevelReached + 3 && i % 2 !== 0 && i %5 !== 0) continue; 
            }

            const option = document.createElement('option');
            option.value = i;
            const levelData = getLevelSettings(i);
            option.textContent = levelData.name.length > 55 ? `Lvl ${i}: ${levelData.melodyLength} notes...` : levelData.name; 
            
            if (i > maxLevelReached) {
                option.textContent += " (Locked)";
            }
            levelSelect.appendChild(option);
            if (i === currentLevelOrChallengeTarget) {
                optionForCurrentSelectionExists = true;
            }
        }
        
        // If currentLevelOrChallengeTarget didn't get an option due to loop limits/skipping, add it
        if (!optionForCurrentSelectionExists && currentLevelOrChallengeTarget > 0 && currentLevelOrChallengeTarget <= 999) {
            const option = document.createElement('option');
            option.value = currentLevelOrChallengeTarget;
            const levelData = getLevelSettings(currentLevelOrChallengeTarget);
            option.textContent = levelData.name.length > 55 ? `Lvl ${currentLevelOrChallengeTarget}: ${levelData.melodyLength} notes...` : levelData.name;
            if (currentLevelOrChallengeTarget > maxLevelReached) {
                option.textContent += " (Locked)";
            }
            // Insert it in sorted order or append
            let inserted = false;
            for (let existingOpt of levelSelect.options) {
                if (parseInt(existingOpt.value) > currentLevelOrChallengeTarget) {
                    levelSelect.insertBefore(option, existingOpt);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) levelSelect.appendChild(option);
        }
        
        // Set the selected value
        if (document.querySelector(`option[value="${currentLevelOrChallengeTarget}"]`)) {
            levelSelect.value = currentLevelOrChallengeTarget;
        } else if (previouslySelectedValue && document.querySelector(`option[value="${previouslySelectedValue}"]`)) {
            levelSelect.value = previouslySelectedValue; // Fallback to previous if current somehow disappeared
        } else if (levelSelect.options.length > 0) {
            levelSelect.value = levelSelect.options[0].value; // Absolute fallback
        }
    }

    function startNewRound(autoPlayMelody = false) {
        gameInProgress = true;
        userMelody = [];
        
        const levelForMelody = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
        generateMelody(levelForMelody); // Generate melody for the correct level
        
        updatePianoKeyStyles();
        updateProgressDisplay();

        const settings = getLevelSettings(levelForMelody);
        if (isAttemptingUnlockChallenge) {
            feedbackDiv.textContent = `CHALLENGE Lvl ${challengeTargetLevel}: ${settings.name.replace(`Lvl ${challengeTargetLevel}: `, '')}. Get ${CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE} correct! Listen...`;
        } else {
            feedbackDiv.textContent = `${settings.name}. Listen...`;
        }
        feedbackDiv.className = 'feedback';
        
        canPlayPiano = false;
        playMelodyBtn.disabled = false;
        playMelodyBtn.textContent = "Play Melody";
        checkAnswerBtn.disabled = true;

        if (autoPlayMelody) {
            setTimeout(() => playSequence(currentMelody), 500); 
        }
    }

    function updateProgressDisplay() {
        if (isAttemptingUnlockChallenge) {
            currentLevelDisplay.textContent = `Challenge: Lvl ${challengeTargetLevel} (Max: ${maxLevelReached})`;
            progressToNextLevelDisplay.textContent = `For Unlock: ${correctAnswersInARow}/${CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE}`;
        } else {
            currentLevelDisplay.textContent = `Level: ${currentLevel} (Max: ${maxLevelReached})`;
            progressToNextLevelDisplay.textContent = `Correct: ${correctAnswersInARow}/${CORRECT_ANSWERS_TO_LEVEL_UP}`;
        }
    }

    function disableControlsDuringPlayback() {
        playMelodyBtn.disabled = true;
        checkAnswerBtn.disabled = true;
    }

    playMelodyBtn.addEventListener('click', () => {
        const context = getAudioContext();
        if (context && context.state === 'suspended') {
            // First user tap: resume & prime, then proceed
            context.resume().then(() => {
                ensureKeepAlive();
                setTimeout(() => {
                    if (playMelodyBtn.textContent === "Restart Game") {
                        currentLevel = 1;
                        correctAnswersInARow = 0;
                        isAttemptingUnlockChallenge = false;
                        challengeTargetLevel = 0;
                        saveGameState();
                        gameInProgress = true;
                        populateLevelSelection();
                        startNewRound(true);
                    } else if (currentMelody.length > 0 && gameInProgress) {
                        playSequence(currentMelody);
                    } else if (gameInProgress) {
                        startNewRound(true);
                    }
                }, 50);
            }).catch(err => {
                console.error("Error resuming AudioContext:", err);
            });
            return;
        }

        if (context === null && playMelodyBtn.textContent !== "Restart Game") {
            feedbackDiv.textContent = "Audio system not available. Please try refreshing.";
            feedbackDiv.className = 'feedback incorrect';
            return;
        }

        if (playMelodyBtn.textContent === "Restart Game") {
            currentLevel = 1;
            correctAnswersInARow = 0;
            isAttemptingUnlockChallenge = false;
            challengeTargetLevel = 0;
            saveGameState();
            gameInProgress = true;
            populateLevelSelection();
            if (context && context.state === 'running') {
                ensureKeepAlive();
                setTimeout(() => startNewRound(true), 50);
            } else {
                startNewRound(true);
            }
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
        isAttemptingUnlockChallenge = false; // Reset by default on any selection change

        if (selectedLevel > maxLevelReached) {
            // This is an attempt to unlock a new highest level
            isAttemptingUnlockChallenge = true;
            challengeTargetLevel = selectedLevel;
            currentLevel = selectedLevel; // Temporarily set currentLevel for melody generation and UI consistency
            correctAnswersInARow = 0;
            feedbackDiv.textContent = `CHALLENGE: Unlock Level ${challengeTargetLevel}! Get ${CORRECT_ANSWERS_FOR_UNLOCK_CHALLENGE} correct in a row.`;
            feedbackDiv.className = 'feedback'; // Neutral feedback for challenge start
            // Don't save state yet for challengeTargetLevel, only on success.
        } else if (selectedLevel >= 1 && selectedLevel <= maxLevelReached) {
            // Navigating to an already unlocked or current level
            currentLevel = selectedLevel;
            correctAnswersInARow = 0;
            challengeTargetLevel = 0; // Ensure no lingering challenge target
            saveGameState(); 
        } else {
            // Invalid selection (should not happen if dropdown is populated correctly)
            console.warn("Invalid level selection:", selectedLevel);
            levelSelect.value = currentLevel; // Revert to a known good state
            return;
        }
        populateLevelSelection(); // Re-render to ensure correct selection highlight and (Locked) status
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'running') {
            ensureKeepAlive();
            setTimeout(() => startNewRound(true), 50);
        } else {
            startNewRound(true);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.repeat || !gameInProgress) return; 
        
        const context = getAudioContext(); 
        if (!context || !canPlayPiano) return; 

        const noteName = keyMap[event.code];
        if (noteName) {
            const keyElement = document.querySelector(`.key[data-note="${noteName}"]`);
            handlePianoKeyPress(noteName, keyElement); 
        }
    });

    // --- Initialization ---
    createPiano();
    loadGameState();
    
    populateLevelSelection();
    
    playMelodyBtn.disabled = false; 
    checkAnswerBtn.disabled = true;
    canPlayPiano = false; 
    updatePianoKeyStyles();
    updateProgressDisplay();
    
    const initialLevelForDisplay = isAttemptingUnlockChallenge ? challengeTargetLevel : currentLevel;
    const initialSettings = getLevelSettings(initialLevelForDisplay);
    feedbackDiv.textContent = `Welcome! Click "Play Melody" to start ${initialSettings.name}.`;
});