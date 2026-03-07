// DOM Elements
const uploadSection = document.getElementById('upload-section');
const statsSection = document.getElementById('stats-section');
const flashcardsGrid = document.getElementById('flashcards-grid');
const csvFileInput = document.getElementById('csv-file');

// Control elements
const filterUnlearned = document.getElementById('filter-unlearned');
const filterReview = document.getElementById('filter-review');
const categoryDropdownList = document.getElementById('category-list');
const dropdownBtn = document.getElementById('dropdown-btn');
const categoryDropdownWrapper = document.getElementById('category-dropdown');

// Stats Elements
const totalCountEl = document.getElementById('total-count');
const learnedCountEl = document.getElementById('learned-count');
const reviewCountEl = document.getElementById('review-count');
const progressBar = document.getElementById('progress-bar');

// App State
let vocabularyData = [];
let categoriesList = new Set();
// learnedState key: word itself, value: { learned: boolean, review: boolean }
const STATE_KEY = 'vocabApp_v2';
const vocabState = JSON.parse(localStorage.getItem(STATE_KEY)) || {};

// Build mobile support for hover menu (tap toggles active class)
dropdownBtn.addEventListener('click', (e) => {
    // Only matters on touch / click devices, CSS hover handles mouse
    categoryDropdownWrapper.classList.toggle('active');
    e.stopPropagation();
});
// Hide when clicking outside
document.addEventListener('click', (e) => {
    if(!categoryDropdownWrapper.contains(e.target)) {
        categoryDropdownWrapper.classList.remove('active');
    }
});

// Event Listeners
csvFileInput.addEventListener('change', handleFileUpload);
filterUnlearned.addEventListener('change', applyFilter);
filterReview.addEventListener('change', applyFilter);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            uploadSection.style.display = 'none';
            statsSection.style.display = 'grid';
            
            buildCategoryFlyout();
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
    categoriesList.clear();
    
    // Auto-detect header if first row looks like headers
    let startIndex = 0;
    if (rows[0] && rows[0].length >= 3 && (rows[0][1].includes('Word') || rows[0][1].includes('単語'))) {
        startIndex = 1;
    }

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        
        // CSV should be: Category, Word, Meaning
        if (row.length >= 3) {
            const catCol = row[0] ? row[0].trim() : 'カテゴリなし';
            const wordCol = row[1] ? row[1].trim() : '';
            const meaningCol = row[2] ? row[2].trim() : '';

            if (wordCol && meaningCol) {
                categoriesList.add(catCol);
                vocabularyData.push({
                    category: catCol,
                    word: wordCol,
                    meaning: meaningCol,
                    id: `word_${i}`
                });
            }
        }
    }
}

function buildCategoryFlyout() {
    categoryDropdownList.innerHTML = '';
    
    // Create an "All Categories" checkbox first
    const allLabel = document.createElement('label');
    allLabel.className = 'cat-checkbox-label';
    const allInput = document.createElement('input');
    allInput.type = 'checkbox';
    allInput.checked = false; // default blank = all
    allInput.id = 'filter-cat-all';
    
    allLabel.appendChild(allInput);
    allLabel.appendChild(document.createTextNode('すべて選択 / 解除'));
    
    allInput.addEventListener('change', (e) => {
        const checkboxes = categoryDropdownList.querySelectorAll('.cat-filter');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        applyFilter();
    });
    
    categoryDropdownList.appendChild(allLabel);
    
    const divider = document.createElement('hr');
    divider.style.borderColor = 'rgba(255,255,255,0.1)';
    divider.style.margin = '4px 0';
    categoryDropdownList.appendChild(divider);

    // Create a checkbox for each category
    const sortedCats = Array.from(categoriesList).sort();
    
    sortedCats.forEach(cat => {
        const label = document.createElement('label');
        label.className = 'cat-checkbox-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'cat-filter';
        input.value = cat;
        // Checkboxes default off. If everything is off, we show everything.
        
        input.addEventListener('change', () => {
            // Uncheck "All" when manual selecting
            if(!input.checked) {
                document.getElementById('filter-cat-all').checked = false;
            }
            applyFilter();
        });
        
        label.appendChild(input);
        label.appendChild(document.createTextNode(cat));
        categoryDropdownList.appendChild(label);
    });
}

function renderCards() {
    flashcardsGrid.innerHTML = '';
    
    // Group vocab by category for displaying headers
    const groupedData = {};
    vocabularyData.forEach(item => {
        if (!groupedData[item.category]) {
            groupedData[item.category] = [];
        }
        groupedData[item.category].push(item);
    });

    const sortedCats = Array.from(categoriesList).sort();

    sortedCats.forEach(cat => {
        // Render Category Header
        const catHeader = document.createElement('div');
        catHeader.className = 'category-header';
        catHeader.textContent = cat;
        catHeader.dataset.category = cat;
        flashcardsGrid.appendChild(catHeader);

        // Render Words for Category
        groupedData[cat].forEach(item => {
            // Initialize robustly so state won't crash if new
            if (!vocabState[item.word]) {
                vocabState[item.word] = { learned: false, review: false };
            }
            
            const state = vocabState[item.word];

            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.word = item.word;
            card.dataset.category = item.category;

            // Header part
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

            // Actions - Checkboxes
            const actionsBlock = document.createElement('div');
            actionsBlock.className = 'card-actions';

            // Learned Checkbox
            const learnedLabel = document.createElement('label');
            learnedLabel.className = 'status-checkbox learned';
            learnedLabel.addEventListener('click', e => e.stopPropagation());
            
            const learnedInput = document.createElement('input');
            learnedInput.type = 'checkbox';
            learnedInput.checked = state.learned;
            learnedInput.addEventListener('change', e => {
                updateStatus(item.word, 'learned', e.target.checked);
            });
            const learnedText = document.createElement('span');
            learnedText.className = 'checkbox-label';
            learnedText.textContent = '覚えた';
            
            learnedLabel.appendChild(learnedInput);
            learnedLabel.appendChild(learnedText);


            // Review Checkbox
            const reviewLabel = document.createElement('label');
            reviewLabel.className = 'status-checkbox review';
            reviewLabel.addEventListener('click', e => e.stopPropagation());

            const reviewInput = document.createElement('input');
            reviewInput.type = 'checkbox';
            reviewInput.checked = state.review;
            reviewInput.addEventListener('change', e => {
                updateStatus(item.word, 'review', e.target.checked);
            });
            const reviewText = document.createElement('span');
            reviewText.className = 'checkbox-label';
            reviewText.textContent = '要復習';

            reviewLabel.appendChild(reviewInput);
            reviewLabel.appendChild(reviewText);

            actionsBlock.appendChild(learnedLabel);
            actionsBlock.appendChild(reviewLabel);

            header.appendChild(wordBox);
            header.appendChild(actionsBlock);

            // Body part (Hidden by default)
            const body = document.createElement('div');
            body.className = 'card-body';
            
            const meaningEl = document.createElement('div');
            meaningEl.className = 'meaning';
            meaningEl.textContent = item.meaning;

            body.appendChild(meaningEl);

            header.addEventListener('click', () => {
                card.classList.toggle('revealed');
            });

            card.appendChild(header);
            card.appendChild(body);

            flashcardsGrid.appendChild(card);
        });
    });

    applyFilter();
}

function updateStatus(word, type, value) {
    if (!vocabState[word]) vocabState[word] = {};
    vocabState[word][type] = value;
    
    // Save to localStorage
    localStorage.setItem(STATE_KEY, JSON.stringify(vocabState));
    
    updateStats();
    
    // If filtering active, wait slightly for animation then re-filter
    setTimeout(() => {
        applyFilter();
    }, 200);
}

function applyFilter() {
    const showOnlyUnlearned = filterUnlearned.checked;
    const showOnlyReview = filterReview.checked;
    
    // Extract selected categories
    const catCheckboxes = categoryDropdownList.querySelectorAll('.cat-filter');
    const selectedCats = Array.from(catCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    // If no categories are explicitly selected, we treat it as ALL categories bypass
    const filterByCat = selectedCats.length > 0;

    const cards = flashcardsGrid.querySelectorAll('.card');
    
    cards.forEach(card => {
        const word = card.dataset.word;
        const cat = card.dataset.category;
        const state = vocabState[word] || { learned: false, review: false };

        let makeVisible = true;

        // Condition 1: Unlearned ONLY
        if (showOnlyUnlearned && state.learned) {
            makeVisible = false;
        }

        // Condition 2: Review ONLY
        if (showOnlyReview && !state.review) {
            makeVisible = false;
        }

        // Condition 3: Category Selected
        if (filterByCat && !selectedCats.includes(cat)) {
            makeVisible = false;
        }

        if (makeVisible) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    // Hide empty category headers
    const headers = flashcardsGrid.querySelectorAll('.category-header');
    headers.forEach(header => {
        const catName = header.dataset.category;
        // See if any cards matching this category are currently NOT hidden
        const hasVisible = Array.from(cards).some(c => c.dataset.category === catName && !c.classList.contains('hidden'));
        header.style.display = hasVisible ? 'block' : 'none';
    });
}

function updateStats() {
    const total = vocabularyData.length;
    let learnedCount = 0;
    let reviewCount = 0;

    vocabularyData.forEach(item => {
        const state = vocabState[item.word] || {};
        if (state.learned) learnedCount++;
        if (state.review) reviewCount++;
    });

    totalCountEl.textContent = total;
    learnedCountEl.textContent = learnedCount;
    reviewCountEl.textContent = reviewCount;

    const percentage = total === 0 ? 0 : (learnedCount / total) * 100;
    progressBar.style.width = `${percentage}%`;
}
