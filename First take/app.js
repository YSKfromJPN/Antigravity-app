// DOM Elements
const uploadSection = document.getElementById('upload-section');
const statsSection = document.getElementById('stats-section');
const flashcardsGrid = document.getElementById('flashcards-grid');
const csvFileInput = document.getElementById('csv-file');
const filterToggle = document.getElementById('filter-toggle');
const totalCountEl = document.getElementById('total-count');
const learnedCountEl = document.getElementById('learned-count');
const remainingCountEl = document.getElementById('remaining-count');
const progressBar = document.getElementById('progress-bar');

// App State
let vocabularyData = [];
// learnedState key: word itself, value: boolean
const learnedState = JSON.parse(localStorage.getItem('vocabLearnedState')) || {};

// Event Listeners
csvFileInput.addEventListener('change', handleFileUpload);
filterToggle.addEventListener('change', applyFilter);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Use PapaParse to parse the CSV file
    Papa.parse(file, {
        header: false, // In case header might vary, we parse as array of arrays
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            uploadSection.style.display = 'none';
            statsSection.style.display = 'grid'; // because we use grid in CSS
            renderCards();
            updateStats();
        },
        error: function(error) {
            alert('CSV読み込み中にエラーが発生しました: ' + error.message);
        }
    });
}

function processData(rows) {
    vocabularyData = [];
    
    // First row might be headers like "No.,Word,Meaning"
    // We check and skip if it looks like a header
    let startIndex = 0;
    if (rows[0] && rows[0][1] && rows[0][1].toLowerCase().includes('word')) {
        startIndex = 1;
    }

    let currentCategory = '';

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        
        // Ensure row has enough columns
        // Some rows might be category headers, like ",CLOTHING,"
        if (row.length >= 2) {
            const wordCol = row[1] ? row[1].trim() : '';
            const meaningCol = row.length > 2 && row[2] ? row[2].trim() : '';

            // If meaning is empty, and word is ALL CAPS or just a generic word, it might be a category
            if (wordCol && !meaningCol && (wordCol === wordCol.toUpperCase() || wordCol === 'Food' || wordCol === 'HOUSE')) {
                currentCategory = wordCol;
                vocabularyData.push({
                    type: 'category',
                    name: currentCategory,
                    id: `cat_${i}`
                });
                continue;
            }

            // Normal vocab item
            if (wordCol && meaningCol) {
                vocabularyData.push({
                    type: 'word',
                    word: wordCol,
                    meaning: meaningCol,
                    id: `word_${i}`
                });
            }
        }
    }
}

function renderCards() {
    flashcardsGrid.innerHTML = '';

    vocabularyData.forEach(item => {
        if (item.type === 'category') {
            const catEl = document.createElement('div');
            catEl.className = 'category-header';
            catEl.textContent = item.name;
            flashcardsGrid.appendChild(catEl);
        } else if (item.type === 'word') {
            const isLearned = learnedState[item.word] === true;

            const card = document.createElement('div');
            card.className = `card ${isLearned ? 'learned' : ''}`;
            card.dataset.word = item.word;

            // Header part (Always visible)
            const header = document.createElement('div');
            header.className = 'card-header';
            
            const wordBox = document.createElement('div');
            wordBox.className = 'word-box';
            
            const wordEl = document.createElement('div');
            wordEl.className = 'word';
            wordEl.textContent = item.word;
            
            const hint = document.createElement('div');
            hint.className = 'click-hint';
            hint.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> クリックで意味を表示';

            wordBox.appendChild(wordEl);
            wordBox.appendChild(hint);

            // Checkbox
            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'learned-checkbox';
            
            // Stop click event from bubbling up to the card (which reveals the meaning)
            checkboxLabel.addEventListener('click', (e) => e.stopPropagation());

            const checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.checked = isLearned;
            
            checkboxInput.addEventListener('change', (e) => {
                toggleLearnedStatus(item.word, e.target.checked, card);
            });

            const spanLabel = document.createElement('span');
            spanLabel.className = 'checkbox-label';
            spanLabel.textContent = '覚えた';

            checkboxLabel.appendChild(checkboxInput);
            checkboxLabel.appendChild(spanLabel);

            header.appendChild(wordBox);
            header.appendChild(checkboxLabel);

            // Body part (Hidden by default)
            const body = document.createElement('div');
            body.className = 'card-body';
            
            const meaningEl = document.createElement('div');
            meaningEl.className = 'meaning';
            // Meaning often contains newlines in CSV for sentences
            meaningEl.textContent = item.meaning;

            body.appendChild(meaningEl);

            // Toggle reveal on card click
            header.addEventListener('click', () => {
                card.classList.toggle('revealed');
            });

            card.appendChild(header);
            card.appendChild(body);

            flashcardsGrid.appendChild(card);
        }
    });

    applyFilter();
}

function toggleLearnedStatus(word, isLearned, cardElement) {
    if (isLearned) {
        learnedState[word] = true;
        cardElement.classList.add('learned');
    } else {
        delete learnedState[word];
        cardElement.classList.remove('learned');
    }
    
    // Save to localStorage
    localStorage.setItem('vocabLearnedState', JSON.stringify(learnedState));
    
    updateStats();
    
    // If filter is active, updating a checkbox might mean we need to re-apply filter quickly
    if (filterToggle.checked && isLearned) {
        // slight delay to let the animation play out
        setTimeout(() => {
            applyFilter();
        }, 300);
    }
}

function applyFilter() {
    const showOnlyUnlearned = filterToggle.checked;
    
    const cards = flashcardsGrid.querySelectorAll('.card');
    let firstVisibleInCategory = null;

    cards.forEach(card => {
        const word = card.dataset.word;
        const isLearned = learnedState[word] === true;

        if (showOnlyUnlearned && isLearned) {
            card.classList.add('hidden');
        } else {
            card.classList.remove('hidden');
        }
    });

    // Handle Category Headers visibility (hide if all words under it are hidden)
    // We iterate over the nodes in flashcardsGrid
    let currentCategoryHeader = null;
    let anyVisibleInCurrentCategory = false;

    Array.from(flashcardsGrid.children).forEach(child => {
        if (child.classList.contains('category-header')) {
            // If we had a previous category, determine its visibility
            if (currentCategoryHeader) {
                currentCategoryHeader.style.display = anyVisibleInCurrentCategory ? 'block' : 'none';
            }
            // Reset for next category
            currentCategoryHeader = child;
            anyVisibleInCurrentCategory = false;
        } else if (child.classList.contains('card')) {
            if (!child.classList.contains('hidden')) {
                anyVisibleInCurrentCategory = true;
            }
        }
    });

    // Check last category
    if (currentCategoryHeader) {
        currentCategoryHeader.style.display = anyVisibleInCurrentCategory ? 'block' : 'none';
    }
}

function updateStats() {
    const words = vocabularyData.filter(item => item.type === 'word');
    const total = words.length;
    let learned = 0;

    words.forEach(item => {
        if (learnedState[item.word] === true) learned++;
    });

    const remaining = total - learned;

    totalCountEl.textContent = total;
    learnedCountEl.textContent = learned;
    remainingCountEl.textContent = remaining;

    const percentage = total === 0 ? 0 : (learned / total) * 100;
    progressBar.style.width = `${percentage}%`;
}
