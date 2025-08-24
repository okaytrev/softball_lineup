// Simple authentication
const TEAM_PASSWORD = 'bonix'; // Change this to your team's password

// Google Sheets Integration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFqW85BjRB9DcYTeyg_hXYSkMdAbYvj3QgN1EGMllHUsfOvzwbjeRX471nndzFXp6d/exec'; // Replace with your Apps Script URL

function checkAuth() {
    const savedAuth = localStorage.getItem('softballAuth');
    if (savedAuth === TEAM_PASSWORD) {
        return true;
    }
    
    const password = prompt('Enter team password to access the Softball Manager:');
    if (password === TEAM_PASSWORD) {
        localStorage.setItem('softballAuth', password);
        return true;
    } else {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1a1a1a;">
                <div style="text-align: center; color: #e0e0e0;">
                    <h1 style="color: #ef4444;">Access Denied</h1>
                    <p>Invalid password. Please refresh and try again.</p>
                </div>
            </div>
        `;
        return false;
    }
}

// Check authentication before initializing
if (!checkAuth()) {
    throw new Error('Unauthorized access');
}

let teammates = [];
let fieldPositions = {};
let battingLineup = [];
let nextPlayerId = 100; // Start new player IDs at 100 to avoid conflicts
let selectedPlayer = null; // Track currently selected player for touch mode
let removeMode = false; // Track if we're in remove mode

// Stats tracking
let gameStats = {}; // Store stats for current game
let currentAtBat = {
    playerId: null,
    atBatNumber: 1,
    result: null,
    rbi: 0,
    runs: 0
};

async function loadTeammates() {
    try {
        const response = await fetch('teammates.json');
        const data = await response.json();
        teammates = data.teammates;
        initializeApp();
    } catch (error) {
        console.error('Error loading teammates.json via fetch. Using hardcoded data.', error);
        teammates = [
            {"name": "Kyle H", "id": 1},
            {"name": "Trevar", "id": 2},
            {"name": "Jayson G", "id": 3},
            {"name": "Kyle P", "id": 4},
            {"name": "Jason", "id": 5},
            {"name": "Andy", "id": 6},
            {"name": "Damion", "id": 7},
            {"name": "Mitch", "id": 8},
            {"name": "Jaspen", "id": 9},
            {"name": "Joe", "id": 10},
            {"name": "Dan", "id": 11},
            {"name": "Matt", "id": 12}
        ];
        initializeApp();
    }
}

function initializeApp() {
    loadSavedData();
    updateAllSections();
    setupDragAndDrop();
    setupEventListeners();
    
    // Auto-load from cloud on startup
    loadFromCloud(true); // true = silent load
}

function getPlayerLocation(playerId) {
    if (Object.values(fieldPositions).includes(playerId)) return 'field';
    return 'available';
}

function updateAllSections() {
    renderAvailablePlayers();
    syncBattingLineupWithField();
    renderBattingLineup();
    updateFieldPositions();
}

function renderAvailablePlayers() {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';
    
    const availablePlayers = teammates.filter(player => {
        return !Object.values(fieldPositions).includes(player.id);
    });
    
    availablePlayers.forEach(player => {
        const playerCard = createPlayerCard(player);
        playerList.appendChild(playerCard);
    });
}

function createPlayerCard(player, forLineup = false) {
    const card = document.createElement('div');
    card.className = 'player-card';
    if (removeMode && !forLineup) {
        card.classList.add('removable');
    }
    card.draggable = true;
    card.dataset.playerId = player.id;
    card.dataset.playerName = player.name;
    card.dataset.source = getPlayerLocation(player.id);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = player.name;
    card.appendChild(nameSpan);
    
    if (forLineup) {
        const positionLabel = document.createElement('span');
        positionLabel.className = 'field-position-label';
        const position = getPlayerFieldPosition(player.id);
        if (position) {
            positionLabel.textContent = getPositionAbbreviation(position);
        }
        card.appendChild(positionLabel);
    }
    
    // Add click handler for touch-friendly selection
    if (!forLineup) {
        card.addEventListener('click', () => {
            if (removeMode) {
                handlePlayerRemove(player);
            } else {
                handlePlayerClick(player);
            }
        });
    }
    
    setupPlayerCardDragEvents(card);
    return card;
}

function getPlayerFieldPosition(playerId) {
    for (const [position, id] of Object.entries(fieldPositions)) {
        if (id === playerId) {
            return position;
        }
    }
    return null;
}

function syncBattingLineupWithField() {
    // Get all players on the field
    const fieldPlayerIds = Object.values(fieldPositions);
    
    // Remove players from lineup who are no longer on field
    battingLineup = battingLineup.filter(player => fieldPlayerIds.includes(player.id));
    
    // Add new field players to lineup if not already there
    fieldPlayerIds.forEach(playerId => {
        if (!battingLineup.some(p => p.id === playerId)) {
            const player = teammates.find(t => t.id === playerId);
            if (player) {
                battingLineup.push(player);
            }
        }
    });
}

function renderBattingLineup() {
    const lineupList = document.getElementById('lineup-list');
    lineupList.innerHTML = '';
    
    battingLineup.forEach((player, index) => {
        const lineupItem = document.createElement('div');
        lineupItem.className = 'lineup-item';
        lineupItem.dataset.playerId = player.id;
        
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.className = 'lineup-number-input';
        numberInput.value = index + 1;
        numberInput.min = 1;
        numberInput.max = battingLineup.length;
        numberInput.addEventListener('change', (e) => handleOrderChange(player.id, parseInt(e.target.value) - 1));
        
        const playerCard = createPlayerCard(player, true);
        playerCard.style.flex = '1';
        
        lineupItem.appendChild(numberInput);
        lineupItem.appendChild(playerCard);
        lineupList.appendChild(lineupItem);
    });
}

function handleOrderChange(playerId, newIndex) {
    const currentIndex = battingLineup.findIndex(p => p.id === playerId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= battingLineup.length) return;
    
    const [player] = battingLineup.splice(currentIndex, 1);
    battingLineup.splice(newIndex, 0, player);
    
    renderBattingLineup();
    saveData();
}

function updateFieldPositions() {
    // Clear all field positions first
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.textContent = getPositionAbbreviation(zone.dataset.position);
        zone.classList.remove('occupied');
    });
    
    // Update with current positions
    Object.entries(fieldPositions).forEach(([position, playerId]) => {
        const player = teammates.find(p => p.id === playerId);
        if (player) {
            const zone = document.querySelector(`.drop-zone[data-position="${position}"]`);
            if (zone) {
                zone.textContent = player.name;
                zone.classList.add('occupied');
            }
        }
    });
}

function setupPlayerCardDragEvents(card) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
}

function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.drop-zone');
    const lineupList = document.getElementById('lineup-list');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleFieldDrop);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('click', handleZoneClick);
    });
    
    lineupList.addEventListener('dragover', handleDragOver);
    lineupList.addEventListener('drop', handleLineupReorder);
    lineupList.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('playerId', e.target.dataset.playerId);
    e.dataTransfer.setData('playerName', e.target.dataset.playerName);
    e.dataTransfer.setData('source', e.target.dataset.source);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (e.currentTarget.classList.contains('drop-zone') || 
        e.currentTarget.classList.contains('drop-zone-list')) {
        e.currentTarget.classList.add('drag-over');
    }
    return false;
}

function handleDragLeave(e) {
    if (e.currentTarget.classList.contains('drag-over')) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleFieldDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const playerId = parseInt(e.dataTransfer.getData('playerId'));
    const position = e.target.dataset.position;
    
    if (!position) return;
    
    // Remove player from any existing position
    removePlayerFromField(playerId);
    
    // If position is occupied, remove that player first
    if (fieldPositions[position]) {
        removePlayerFromField(fieldPositions[position]);
    }
    
    // Assign player to new position
    fieldPositions[position] = playerId;
    
    e.target.classList.remove('drag-over');
    updateAllSections();
    saveData();
    
    return false;
}

function handleLineupReorder(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const playerId = parseInt(e.dataTransfer.getData('playerId'));
    const dropTarget = e.target.closest('.lineup-item');
    
    if (!dropTarget || !battingLineup.some(p => p.id === playerId)) {
        e.currentTarget.classList.remove('drag-over');
        return;
    }
    
    const targetId = parseInt(dropTarget.dataset.playerId);
    const draggedIndex = battingLineup.findIndex(p => p.id === playerId);
    const targetIndex = battingLineup.findIndex(p => p.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedPlayer] = battingLineup.splice(draggedIndex, 1);
        battingLineup.splice(targetIndex, 0, draggedPlayer);
    }
    
    e.currentTarget.classList.remove('drag-over');
    renderBattingLineup();
    saveData();
    
    return false;
}

function removePlayerFromField(playerId) {
    Object.keys(fieldPositions).forEach(position => {
        if (fieldPositions[position] === playerId) {
            delete fieldPositions[position];
        }
    });
}

function handlePlayerClick(player) {
    // Remove previous selection
    document.querySelectorAll('.player-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Remove available state from zones
    document.querySelectorAll('.drop-zone.available').forEach(zone => {
        zone.classList.remove('available');
    });
    
    // If clicking the same player, deselect
    if (selectedPlayer && selectedPlayer.id === player.id) {
        selectedPlayer = null;
        return;
    }
    
    // Select new player
    selectedPlayer = player;
    const playerCard = document.querySelector(`.player-card[data-player-id="${player.id}"]`);
    if (playerCard && !playerCard.closest('.lineup-item')) {
        playerCard.classList.add('selected');
        
        // Show available drop zones
        document.querySelectorAll('.drop-zone:not(.occupied)').forEach(zone => {
            zone.classList.add('available');
        });
    }
}

function handleZoneClick(e) {
    const position = e.target.dataset.position;
    
    // If a player is selected and zone is empty, place the player
    if (selectedPlayer && !fieldPositions[position]) {
        // Remove player from any existing position
        removePlayerFromField(selectedPlayer.id);
        
        // Place player in new position
        fieldPositions[position] = selectedPlayer.id;
        
        // Clear selection
        clearSelection();
        
        updateAllSections();
        saveData();
    }
    // If no player selected and position is occupied, remove the player
    else if (!selectedPlayer && fieldPositions[position]) {
        removePlayerFromField(fieldPositions[position]);
        updateAllSections();
        saveData();
    }
}

function clearSelection() {
    selectedPlayer = null;
    document.querySelectorAll('.player-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelectorAll('.drop-zone.available').forEach(zone => {
        zone.classList.remove('available');
    });
}

function getPositionAbbreviation(position) {
    const abbreviations = {
        'pitcher': 'P',
        'catcher': 'C',
        'first-base': '1B',
        'second-base': '2B',
        'third-base': '3B',
        'shortstop': 'SS',
        'left-field': 'LF',
        'left-center': 'LC',
        'right-center': 'RC',
        'right-field': 'RF',
        'dh1': 'DH',
        'dh2': 'DH',
        'dh3': 'DH'
    };
    return abbreviations[position] || position;
}

function setupEventListeners() {
    document.getElementById('reset-field').addEventListener('click', resetField);
    document.getElementById('copy-lineup').addEventListener('click', copyLineup);
    document.getElementById('export-lineup').addEventListener('click', exportLineup);
    document.getElementById('add-player-btn').addEventListener('click', addPlayer);
    document.getElementById('remove-player-btn').addEventListener('click', toggleRemoveMode);
    document.getElementById('copy-roster-btn').addEventListener('click', copyRoster);
    document.getElementById('reset-roster-btn').addEventListener('click', resetRoster);
    document.getElementById('save-lineup').addEventListener('click', saveLineup);
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchPage(e.target.dataset.page);
        });
    });
    
    // History page event listeners
    document.getElementById('refresh-history').addEventListener('click', loadHistoricalStats);
    document.getElementById('player-filter').addEventListener('change', filterHistoricalStats);
    document.getElementById('date-from').addEventListener('change', filterHistoricalStats);
    document.getElementById('date-to').addEventListener('change', filterHistoricalStats);
    
    // Handle scroll indicator for mobile tables
    const tableContainer = document.getElementById('player-table-container');
    if (tableContainer) {
        tableContainer.addEventListener('scroll', function() {
            if (this.scrollLeft > 10) {
                this.classList.add('scrolled');
            } else {
                this.classList.remove('scrolled');
            }
        });
    }
    
    // Stats page event listeners
    document.getElementById('current-batter').addEventListener('change', updateCurrentBatter);
    document.getElementById('at-bat-number').addEventListener('change', updateAtBatNumber);
    document.getElementById('stats-help-btn').addEventListener('click', toggleStatsHelp);
    
    // At-bat number increment/decrement buttons
    document.getElementById('at-bat-prev').addEventListener('click', () => {
        const input = document.getElementById('at-bat-number');
        const currentValue = parseInt(input.value) || 1;
        if (currentValue > 1) {
            input.value = currentValue - 1;
            input.dispatchEvent(new Event('change'));
        }
    });
    
    document.getElementById('at-bat-next').addEventListener('click', () => {
        const input = document.getElementById('at-bat-number');
        const currentValue = parseInt(input.value) || 1;
        input.value = currentValue + 1;
        input.dispatchEvent(new Event('change'));
    });
    
    document.querySelectorAll('.result-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const result = e.target.dataset.result;
            recordAtBatResult(result);
            showDiamondVisualization(result);
        });
    });
    
    // RBI button listeners
    document.querySelectorAll('.rbi-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentAtBat.rbi = parseInt(e.target.dataset.rbi);
            
            // Update the existing at-bat if it exists
            if (currentAtBat.playerId && gameStats[currentAtBat.playerId]) {
                const existingAtBat = gameStats[currentAtBat.playerId].atBats.find(
                    ab => ab.number === currentAtBat.atBatNumber
                );
                
                if (existingAtBat) {
                    // Update the RBI value for the existing at-bat
                    const oldRbi = existingAtBat.rbi;
                    existingAtBat.rbi = currentAtBat.rbi;
                    
                    // Update the player's total RBI
                    gameStats[currentAtBat.playerId].rbi += (currentAtBat.rbi - oldRbi);
                    
                    // Refresh the display
                    displayGameStats();
                    
                    // Show feedback
                    const playerName = gameStats[currentAtBat.playerId].name;
                    console.log(`Updated: ${playerName} now has ${currentAtBat.rbi} RBI on at-bat #${currentAtBat.atBatNumber}`);
                }
            }
        });
    });
    
    // Runs button listeners
    document.querySelectorAll('.runs-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentAtBat.runs = parseInt(e.target.dataset.runs);
            
            // Update the existing at-bat if it exists
            if (currentAtBat.playerId && gameStats[currentAtBat.playerId]) {
                const existingAtBat = gameStats[currentAtBat.playerId].atBats.find(
                    ab => ab.number === currentAtBat.atBatNumber
                );
                
                if (existingAtBat) {
                    // Update the runs value for the existing at-bat
                    const oldRuns = existingAtBat.runs;
                    existingAtBat.runs = currentAtBat.runs;
                    
                    // Update the player's total runs
                    gameStats[currentAtBat.playerId].runs += (currentAtBat.runs - oldRuns);
                    
                    // Refresh the display
                    displayGameStats();
                    
                    // Show feedback
                    const playerName = gameStats[currentAtBat.playerId].name;
                    const runStatus = currentAtBat.runs === 1 ? 'scored' : 'did not score';
                    console.log(`Updated: ${playerName} ${runStatus} on at-bat #${currentAtBat.atBatNumber}`);
                }
            }
        });
    });
    
    document.getElementById('save-stats').addEventListener('click', saveStatsToCloud);
    document.getElementById('clear-stats').addEventListener('click', clearGameStats);
    
    // Clear selection when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.player-card') && 
            !e.target.closest('.drop-zone') &&
            !e.target.closest('.manage-btn') &&
            selectedPlayer) {
            clearSelection();
        }
    });
}

function addPlayer() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    
    if (name) {
        const newPlayer = {
            id: nextPlayerId++,
            name: name
        };
        teammates.push(newPlayer);
        input.value = '';
        updateAllSections();
        saveData();
    }
}

function toggleRemoveMode() {
    removeMode = !removeMode;
    const btn = document.getElementById('remove-player-btn');
    if (removeMode) {
        btn.textContent = 'Cancel Remove';
        btn.style.backgroundColor = '#991b1b';
        clearSelection();
    } else {
        btn.textContent = 'Remove Player';
        btn.style.backgroundColor = '';
    }
    updateAllSections();
}

function handlePlayerRemove(player) {
    if (confirm(`Remove ${player.name} from the roster?`)) {
        // Remove from field if they're on it
        removePlayerFromField(player.id);
        
        // Remove from teammates array
        teammates = teammates.filter(t => t.id !== player.id);
        
        // Turn off remove mode
        toggleRemoveMode();
        
        updateAllSections();
        saveData();
    }
}

function copyRoster() {
    let rosterText = 'Team Roster:\n\n';
    teammates.forEach((player, index) => {
        rosterText += `${index + 1}. ${player.name}\n`;
    });
    
    navigator.clipboard.writeText(rosterText).then(() => {
        alert('Roster copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy roster:', err);
        alert('Failed to copy roster. Please try again.');
    });
}

function resetRoster() {
    if (confirm('Reset to original roster? This will remove all added players and changes.')) {
        // Reset to original teammates
        teammates = [
            {"name": "Kyle H", "id": 1},
            {"name": "Trevar", "id": 2},
            {"name": "Jayson G", "id": 3},
            {"name": "Kyle P", "id": 4},
            {"name": "Jason", "id": 5},
            {"name": "Andy", "id": 6},
            {"name": "Damion", "id": 7},
            {"name": "Mitch", "id": 8},
            {"name": "Jaspen", "id": 9},
            {"name": "Joe", "id": 10},
            {"name": "Dan", "id": 11},
            {"name": "Matt", "id": 12}
        ];
        
        // Reset field and lineup
        fieldPositions = {};
        battingLineup = [];
        nextPlayerId = 100;
        
        // Clear any modes
        if (removeMode) {
            toggleRemoveMode();
        }
        clearSelection();
        
        updateAllSections();
        saveData();
    }
}


function resetField() {
    fieldPositions = {};
    battingLineup = [];
    updateAllSections();
    saveData();
}

function copyLineup() {
    let lineupText = 'Batting Lineup:\n\n';
    battingLineup.forEach((player, index) => {
        const position = getPlayerFieldPosition(player.id);
        const positionText = position ? ` (${getPositionAbbreviation(position)})` : '';
        lineupText += `${index + 1}. ${player.name}${positionText}\n`;
    });
    
    navigator.clipboard.writeText(lineupText).then(() => {
        alert('Lineup copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy lineup:', err);
        alert('Failed to copy lineup. Please try again.');
    });
}

function exportLineup() {
    let csvContent = 'Order,Name,Position\n';
    battingLineup.forEach((player, index) => {
        const position = getPlayerFieldPosition(player.id);
        const positionText = position ? getPositionAbbreviation(position) : '';
        csvContent += `${index + 1},"${player.name}","${positionText}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `softball_lineup_${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveData() {
    const data = {
        fieldPositions,
        battingLineup: battingLineup.map(p => p.id),
        teammates: teammates
    };
    localStorage.setItem('softballData', JSON.stringify(data));
}

// Save lineup to Google Sheets
async function saveLineup() {
    const saveBtn = document.getElementById('save-lineup');
    const originalText = saveBtn.textContent;
    
    // Add loading state
    saveBtn.classList.add('btn-loading');
    saveBtn.disabled = true;
    
    const lineup = {
        fieldPositions,
        battingLineup: battingLineup.map(p => ({
            id: p.id,
            name: p.name,
            position: getPlayerFieldPosition(p.id)
        })),
        teammates: teammates,
        savedAt: new Date().toISOString()
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Apps Script
            headers: {
                'Content-Type': 'text/plain', // Apps Script requirement
            },
            body: JSON.stringify({
                lineup: lineup,
                savedBy: 'Coach'
            })
        });
        
        // Simulate minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert('Lineup saved to cloud! Team can now access it.');
    } catch (error) {
        console.error('Cloud save error:', error);
        alert('Cloud save failed, but lineup is saved locally.');
    } finally {
        // Remove loading state
        saveBtn.classList.remove('btn-loading');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Load from Google Sheets
async function loadFromCloud(silent = false) {
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (silent && loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        if (data.error) {
            if (!silent) {
                alert('No cloud lineup found.');
            }
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            return;
        }
        
        const lineup = data.lineup;
        
        // Update local data
        if (lineup.fieldPositions) {
            fieldPositions = lineup.fieldPositions;
        }
        
        if (lineup.teammates) {
            teammates = lineup.teammates;
            // Update nextPlayerId
            const maxId = Math.max(...teammates.map(t => t.id));
            if (maxId >= nextPlayerId) {
                nextPlayerId = maxId + 1;
            }
        }
        
        if (lineup.battingLineup) {
            battingLineup = lineup.battingLineup.map(savedPlayer => {
                const teammate = teammates.find(t => t.id === savedPlayer.id);
                return teammate || savedPlayer;
            }).filter(Boolean);
        }
        
        updateAllSections();
        saveData(); // Save to local storage
        
        if (!silent) {
            alert(`Lineup loaded from cloud!\nLast saved: ${new Date(data.timestamp).toLocaleString()}`);
        } else {
            console.log('Cloud lineup loaded:', new Date(data.timestamp).toLocaleString());
        }
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Cloud load error:', error);
        if (!silent) {
            alert('Failed to load from cloud.');
        }
        // Hide loading indicator on error
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

function loadSavedData() {
    const savedData = localStorage.getItem('softballData');
    if (savedData) {
        const data = JSON.parse(savedData);
        fieldPositions = data.fieldPositions || {};
        
        // Load saved teammates if available
        if (data.teammates && data.teammates.length > 0) {
            teammates = data.teammates;
            // Update nextPlayerId to avoid conflicts
            const maxId = Math.max(...teammates.map(t => t.id));
            if (maxId >= nextPlayerId) {
                nextPlayerId = maxId + 1;
            }
        }
        
        if (data.battingLineup && data.battingLineup.length > 0) {
            battingLineup = data.battingLineup.map(playerId => {
                return teammates.find(t => t.id === playerId);
            }).filter(Boolean);
        } else {
            battingLineup = [];
        }
    }
}

loadTeammates();

// Navigation and Stats Functions
function switchPage(pageName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageName) {
            btn.classList.add('active');
        }
    });
    
    // Update page visibility
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(`${pageName}-page`).style.display = 'block';
    
    // If switching to stats page, populate the batter dropdown
    if (pageName === 'stats') {
        populateBatterDropdown();
        displayGameStats();
    }
    
    // If switching to history page, load historical stats
    if (pageName === 'history') {
        loadHistoricalStats();
    }
}

function populateBatterDropdown() {
    const select = document.getElementById('current-batter');
    select.innerHTML = '<option value="">Select a player...</option>';
    
    // Only show players in the batting lineup
    battingLineup.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        select.appendChild(option);
    });
}

function updateCurrentBatter(e) {
    currentAtBat.playerId = parseInt(e.target.value);
    
    // Update at-bat status indicator
    updateAtBatStatus();
    
    // Check if the current at-bat number exists for this player
    if (currentAtBat.playerId && gameStats[currentAtBat.playerId]) {
        const existingAtBat = gameStats[currentAtBat.playerId].atBats.find(
            ab => ab.number === currentAtBat.atBatNumber
        );
        
        if (existingAtBat) {
            // Show the diamond visualization for the existing at-bat
            showDiamondVisualization(existingAtBat.result);
            
            // Update the RBI and runs buttons to match the existing at-bat
            document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.rbi-btn[data-rbi="${existingAtBat.rbi}"]`).classList.add('active');
            currentAtBat.rbi = existingAtBat.rbi;
            
            document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.runs-btn[data-runs="${existingAtBat.runs}"]`).classList.add('active');
            currentAtBat.runs = existingAtBat.runs;
        } else {
            // Hide diamond and runs section if no existing at-bat
            document.querySelector('.diamond-result-container').style.display = 'none';
            document.querySelector('.runs-section').style.display = 'none';
        }
    } else {
        // Hide diamond and runs section if no player selected
        document.querySelector('.diamond-result-container').style.display = 'none';
        document.querySelector('.runs-section').style.display = 'none';
    }
}

function updateAtBatNumber(e) {
    currentAtBat.atBatNumber = parseInt(e.target.value);
    
    // Update at-bat status indicator
    updateAtBatStatus();
    
    // Check if this at-bat already exists and show diamond visualization
    if (currentAtBat.playerId && gameStats[currentAtBat.playerId]) {
        const existingAtBat = gameStats[currentAtBat.playerId].atBats.find(
            ab => ab.number === currentAtBat.atBatNumber
        );
        
        if (existingAtBat) {
            // Show the diamond visualization for the existing at-bat
            showDiamondVisualization(existingAtBat.result);
            
            // Update the RBI and runs buttons to match the existing at-bat
            document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.rbi-btn[data-rbi="${existingAtBat.rbi}"]`).classList.add('active');
            currentAtBat.rbi = existingAtBat.rbi;
            
            document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.runs-btn[data-runs="${existingAtBat.runs}"]`).classList.add('active');
            currentAtBat.runs = existingAtBat.runs;
        } else {
            // Hide diamond and runs section if no existing at-bat
            document.querySelector('.diamond-result-container').style.display = 'none';
            document.querySelector('.runs-section').style.display = 'none';
        }
    }
}

// Update at-bat status indicator
function updateAtBatStatus() {
    const statusElement = document.getElementById('at-bat-status');
    
    if (!currentAtBat.playerId) {
        statusElement.className = 'at-bat-status';
        statusElement.textContent = '';
        return;
    }
    
    if (gameStats[currentAtBat.playerId]) {
        const existingAtBat = gameStats[currentAtBat.playerId].atBats.find(
            ab => ab.number === currentAtBat.atBatNumber
        );
        
        if (existingAtBat) {
            statusElement.className = 'at-bat-status recorded';
            statusElement.textContent = `✓ Recorded: ${formatResult(existingAtBat.result)}`;
        } else {
            statusElement.className = 'at-bat-status new';
            statusElement.textContent = '● New at-bat';
        }
    } else {
        statusElement.className = 'at-bat-status new';
        statusElement.textContent = '● New at-bat';
    }
}

function recordAtBatResult(result) {
    if (!currentAtBat.playerId) {
        alert('Please select a batter first!');
        return;
    }
    
    const playerId = currentAtBat.playerId;
    const atBatNum = currentAtBat.atBatNumber;
    
    // Initialize player stats if not exists
    if (!gameStats[playerId]) {
        const player = teammates.find(t => t.id === playerId);
        gameStats[playerId] = {
            name: player.name,
            atBats: [],
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeruns: 0,
            outs: 0,
            sacrificeFly: 0,
            rbi: 0,
            runs: 0
        };
    }
    
    // Check if this at-bat number already exists for this player
    const existingAtBatIndex = gameStats[playerId].atBats.findIndex(ab => ab.number === atBatNum);
    
    if (existingAtBatIndex !== -1) {
        // At-bat already exists - ask if they want to replace it
        const existingResult = gameStats[playerId].atBats[existingAtBatIndex].result;
        const confirmReplace = confirm(
            `At-bat #${atBatNum} for ${gameStats[playerId].name} already recorded as ${existingResult.replace('-', ' ').toUpperCase()}.\n\n` +
            `Replace with ${result.replace('-', ' ').toUpperCase()}?`
        );
        
        if (!confirmReplace) {
            return;
        }
        
        // Remove the old result from stats
        const oldResult = existingResult;
        switch(oldResult) {
            case 'single':
                gameStats[playerId].hits--;
                gameStats[playerId].singles--;
                break;
            case 'double':
                gameStats[playerId].hits--;
                gameStats[playerId].doubles--;
                break;
            case 'triple':
                gameStats[playerId].hits--;
                gameStats[playerId].triples--;
                break;
            case 'homerun':
                gameStats[playerId].hits--;
                gameStats[playerId].homeruns--;
                break;
            case 'sacrifice-fly':
                gameStats[playerId].sacrificeFly--;
                break;
            case 'out':
                gameStats[playerId].outs--;
                break;
        }
        
        // Subtract old RBI and runs
        const oldRBI = gameStats[playerId].atBats[existingAtBatIndex].rbi || 0;
        const oldRuns = gameStats[playerId].atBats[existingAtBatIndex].runs || 0;
        gameStats[playerId].rbi -= oldRBI;
        gameStats[playerId].runs -= oldRuns;
        
        // Update the at-bat with new result
        gameStats[playerId].atBats[existingAtBatIndex] = {
            number: atBatNum,
            result: result,
            rbi: currentAtBat.rbi,
            runs: currentAtBat.runs,
            time: new Date().toLocaleTimeString()
        };
    } else {
        // New at-bat - add it
        const atBat = {
            number: atBatNum,
            result: result,
            rbi: currentAtBat.rbi,
            runs: currentAtBat.runs,
            time: new Date().toLocaleTimeString()
        };
        
        gameStats[playerId].atBats.push(atBat);
        
        // Sort at-bats by number
        gameStats[playerId].atBats.sort((a, b) => a.number - b.number);
    }
    
    // Update stats with new result
    switch(result) {
        case 'single':
            gameStats[playerId].hits++;
            gameStats[playerId].singles++;
            break;
        case 'double':
            gameStats[playerId].hits++;
            gameStats[playerId].doubles++;
            break;
        case 'triple':
            gameStats[playerId].hits++;
            gameStats[playerId].triples++;
            break;
        case 'homerun':
            gameStats[playerId].hits++;
            gameStats[playerId].homeruns++;
            break;
        case 'sacrifice-fly':
            gameStats[playerId].sacrificeFly++;
            break;
        case 'out':
            gameStats[playerId].outs++;
            break;
    }
    
    // Find the highest at-bat number across all players
    let maxAtBat = atBatNum;
    Object.values(gameStats).forEach(playerStat => {
        playerStat.atBats.forEach(ab => {
            if (ab.number > maxAtBat) {
                maxAtBat = ab.number;
            }
        });
    });
    
    // Add RBI and runs
    gameStats[playerId].rbi += currentAtBat.rbi;
    gameStats[playerId].runs += currentAtBat.runs;
    
    // Reset RBI and runs selection for next at-bat
    document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.rbi-btn[data-rbi="0"]').classList.add('active');
    document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.runs-btn[data-runs="0"]').classList.add('active');
    currentAtBat.rbi = 0;
    currentAtBat.runs = 0;
    
    // Update display
    displayGameStats();
    updateAtBatStatus();
    
    // Visual feedback
    const actionText = existingAtBatIndex !== -1 ? 'Updated' : 'Recorded';
    const rbiText = currentAtBat.rbi > 0 ? ` with ${currentAtBat.rbi} RBI` : '';
    alert(`${actionText}: ${gameStats[playerId].name} - At Bat #${atBatNum} - ${result.replace('-', ' ').toUpperCase()}${rbiText}`);
}

function displayGameStats() {
    const display = document.getElementById('game-stats-display');
    
    display.innerHTML = '';
    
    if (Object.keys(gameStats).length === 0) {
        display.innerHTML = '<p style="color: #666; text-align: center;">No stats recorded yet</p>';
        return;
    }
    
    Object.entries(gameStats).forEach(([playerId, player]) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-stats';
        playerDiv.dataset.playerId = playerId;
        
        // Calculate official at-bats (excluding sacrifice flies)
        const officialAtBats = player.atBats.filter(ab => ab.result !== 'sacrifice-fly').length;
        const avg = officialAtBats > 0 ? (player.hits / officialAtBats).toFixed(3) : '.000';
        
        // Create at-bat summary with clickable links
        const atBatDetails = player.atBats.map(ab => {
            const resultShort = {
                'single': '1B',
                'double': '2B',
                'triple': '3B',
                'homerun': 'HR',
                'sacrifice-fly': 'SF',
                'out': 'Out'
            }[ab.result] || ab.result;
            
            const rbiText = ab.rbi > 0 ? ` (${ab.rbi} RBI)` : '';
            const runText = ab.runs === 1 ? ' ®' : '';
            return `<span class="at-bat-link" data-player-id="${playerId}" data-at-bat="${ab.number}" data-result="${ab.result}">#${ab.number}: ${resultShort}${rbiText}${runText}</span>`;
        }).join(' | ');
        
        playerDiv.innerHTML = `
            <h5>${player.name}</h5>
            <div class="stat-line">AVG: ${avg} (${player.hits}-${officialAtBats}) | Runs: ${player.runs} | RBI: ${player.rbi}</div>
            <div class="stat-line">1B: ${player.singles} | 2B: ${player.doubles} | 3B: ${player.triples} | HR: ${player.homeruns}</div>
            <div class="stat-line">Outs: ${player.outs} | SF: ${player.sacrificeFly}</div>
            ${atBatDetails ? `<div class="at-bat-details">At-Bats: ${atBatDetails}</div>` : ''}
        `;
        
        display.appendChild(playerDiv);
    });
    
    // Add click event listeners to at-bat links
    display.addEventListener('click', (e) => {
        if (e.target.classList.contains('at-bat-link')) {
            const playerId = parseInt(e.target.dataset.playerId);
            const atBatNum = parseInt(e.target.dataset.atBat);
            const result = e.target.dataset.result;
            
            // Get the at-bat data
            const playerStats = gameStats[playerId];
            const atBat = playerStats.atBats.find(ab => ab.number === atBatNum);
            
            // Update current selection
            document.getElementById('current-batter').value = playerId;
            document.getElementById('at-bat-number').value = atBatNum;
            
            // Update current at-bat state
            currentAtBat.playerId = playerId;
            currentAtBat.atBatNumber = atBatNum;
            
            if (atBat) {
                // Update the RBI buttons
                currentAtBat.rbi = atBat.rbi;
                document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`.rbi-btn[data-rbi="${atBat.rbi}"]`).classList.add('active');
                
                // Update the runs buttons
                currentAtBat.runs = atBat.runs;
                document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`.runs-btn[data-runs="${atBat.runs}"]`).classList.add('active');
            }
            
            // Show the diamond visualization
            showDiamondVisualization(result);
            
            // Update status
            updateAtBatStatus();
        }
    });
}

async function saveStatsToCloud() {
    const saveBtn = document.getElementById('save-stats');
    const originalText = saveBtn.textContent;
    
    // Confirm before saving and ending game
    if (!confirm('Save stats and end the current game? This will clear all current game data.')) {
        return;
    }
    
    // Add loading state
    saveBtn.classList.add('btn-loading');
    saveBtn.disabled = true;
    
    const statsData = {
        gameDate: new Date().toISOString(),
        gameStats: gameStats,
        battingOrder: battingLineup.map(p => ({id: p.id, name: p.name}))
    };
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                stats: statsData,
                savedBy: 'Stats Keeper'
            })
        });
        
        // Simulate minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert('Game stats saved successfully! Starting new game...');
        
        // Clear game stats after saving
        gameStats = {};
        currentAtBat = {
            playerId: null,
            atBatNumber: 1,
            result: null,
            rbi: 0,
            runs: 0
        };
        
        // Reset UI elements
        document.getElementById('current-batter').value = '';
        document.getElementById('at-bat-number').value = 1;
        document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.rbi-btn[data-rbi="0"]').classList.add('active');
        document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.runs-btn[data-runs="0"]').classList.add('active');
        document.querySelector('.diamond-result-container').style.display = 'none';
        document.querySelector('.runs-section').style.display = 'none';
        
        // Update display
        displayGameStats();
        updateAtBatStatus();
    } catch (error) {
        console.error('Stats save error:', error);
        alert('Failed to save stats. Please try again.');
    } finally {
        // Remove loading state
        saveBtn.classList.remove('btn-loading');
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function clearGameStats() {
    if (confirm('Clear all stats for this game? This cannot be undone!')) {
        gameStats = {};
        currentAtBat = {
            playerId: null,
            atBatNumber: 1,
            result: null,
            rbi: 0,
            runs: 0
        };
        document.getElementById('current-batter').value = '';
        document.getElementById('at-bat-number').value = 1;
        
        // Reset RBI and runs buttons
        document.querySelectorAll('.rbi-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.rbi-btn[data-rbi="0"]').classList.add('active');
        document.querySelectorAll('.runs-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.runs-btn[data-runs="0"]').classList.add('active');
        
        // Hide diamond and runs section
        document.querySelector('.diamond-result-container').style.display = 'none';
        document.querySelector('.runs-section').style.display = 'none';
        
        displayGameStats();
    }
}

function toggleStatsHelp() {
    const helpTooltip = document.getElementById('stats-help');
    const helpBtn = document.getElementById('stats-help-btn');
    
    if (helpTooltip.style.display === 'none') {
        helpTooltip.style.display = 'block';
        helpBtn.style.backgroundColor = '#22c55e';
        helpBtn.textContent = '×';
    } else {
        helpTooltip.style.display = 'none';
        helpBtn.style.backgroundColor = '#4ade80';
        helpBtn.textContent = '?';
    }
}

// Historical Stats Functions
let historicalData = [];
let filteredData = [];

async function loadHistoricalStats() {
    const refreshBtn = document.getElementById('refresh-history');
    const originalText = refreshBtn.textContent;
    
    // Add loading state
    refreshBtn.classList.add('btn-loading');
    refreshBtn.disabled = true;
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=stats`);
        const data = await response.json();
        
        if (data.error) {
            document.getElementById('summary-display').innerHTML = 
                '<p style="color: #666; text-align: center;">No historical stats found. Play some games first!</p>';
            document.getElementById('player-stats-body').innerHTML = '';
            document.getElementById('game-details-container').innerHTML = '';
            return;
        }
        
        historicalData = data.stats;
        
        // Populate player filter dropdown
        const uniquePlayers = [...new Set(historicalData.map(stat => stat.playerName))].sort();
        const playerFilter = document.getElementById('player-filter');
        playerFilter.innerHTML = '<option value="">All Players</option>';
        uniquePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerFilter.appendChild(option);
        });
        
        // Apply filters and display
        filterHistoricalStats();
        
        // Simulate minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
    } catch (error) {
        console.error('Error loading historical stats:', error);
        alert('Failed to load historical stats. Please check your connection.');
    } finally {
        // Remove loading state
        refreshBtn.classList.remove('btn-loading');
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
    }
}

function filterHistoricalStats() {
    const playerFilter = document.getElementById('player-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    filteredData = historicalData.filter(stat => {
        // Player filter
        if (playerFilter && stat.playerName !== playerFilter) return false;
        
        // Date filters
        if (dateFrom || dateTo) {
            const statDate = new Date(stat.gameDate);
            if (dateFrom && statDate < new Date(dateFrom)) return false;
            if (dateTo && statDate > new Date(dateTo)) return false;
        }
        
        return true;
    });
    
    displayHistoricalStats();
}

function displayHistoricalStats() {
    displaySummaryStats();
    displayPlayerTable();
    displayGameDetails();
}

function displaySummaryStats() {
    const summaryDisplay = document.getElementById('summary-display');
    
    if (filteredData.length === 0) {
        summaryDisplay.innerHTML = '<p style="color: #666; text-align: center;">No data matches the selected filters</p>';
        return;
    }
    
    // Calculate summary statistics
    const totalGames = [...new Set(filteredData.map(stat => stat.gameDate))].length;
    const totalAtBats = filteredData.reduce((sum, stat) => sum + stat.atBats, 0);
    const totalHits = filteredData.reduce((sum, stat) => sum + stat.hits, 0);
    const totalRuns = filteredData.reduce((sum, stat) => sum + (stat.runs || 0), 0);
    const totalRBI = filteredData.reduce((sum, stat) => sum + (stat.rbi || 0), 0);
    const totalSacrificeFlies = filteredData.reduce((sum, stat) => sum + (stat.sacrificeFly || 0), 0);
    const totalOfficialAtBats = totalAtBats - totalSacrificeFlies;
    const teamAverage = totalOfficialAtBats > 0 ? (totalHits / totalOfficialAtBats).toFixed(3) : '.000';
    
    summaryDisplay.innerHTML = `
        <div class="summary-card">
            <div class="stat-value">${totalGames}</div>
            <div class="stat-label">Games Played</div>
        </div>
        <div class="summary-card">
            <div class="stat-value">${teamAverage}</div>
            <div class="stat-label">Batting Average</div>
        </div>
        <div class="summary-card">
            <div class="stat-value">${totalHits}</div>
            <div class="stat-label">Total Hits</div>
        </div>
        <div class="summary-card">
            <div class="stat-value">${totalRuns}</div>
            <div class="stat-label">Total Runs</div>
        </div>
        <div class="summary-card">
            <div class="stat-value">${totalRBI}</div>
            <div class="stat-label">Total RBI</div>
        </div>
    `;
}

function displayPlayerTable() {
    const tbody = document.getElementById('player-stats-body');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '';
        return;
    }
    
    // Aggregate stats by player
    const playerStats = {};
    
    filteredData.forEach(stat => {
        if (!playerStats[stat.playerName]) {
            playerStats[stat.playerName] = {
                games: new Set(),
                atBats: 0,
                hits: 0,
                singles: 0,
                doubles: 0,
                triples: 0,
                homeRuns: 0,
                sacrificeFly: 0,
                outs: 0,
                runs: 0,
                rbi: 0,
                officialAtBats: 0
            };
        }
        
        const player = playerStats[stat.playerName];
        player.games.add(stat.gameDate);
        player.atBats += stat.atBats;
        player.hits += stat.hits;
        player.singles += stat.singles;
        player.doubles += stat.doubles;
        player.triples += stat.triples;
        player.homeRuns += stat.homeRuns;
        player.sacrificeFly += stat.sacrificeFly;
        player.outs += stat.outs;
        player.runs += (stat.runs || 0);
        player.rbi += (stat.rbi || 0);
        // Calculate official at-bats (total at-bats minus sacrifice flies)
        player.officialAtBats = player.atBats - player.sacrificeFly;
    });
    
    // Convert to array and sort by batting average
    const playerArray = Object.entries(playerStats).map(([name, stats]) => ({
        name,
        games: stats.games.size,
        atBats: stats.atBats,
        hits: stats.hits,
        singles: stats.singles,
        doubles: stats.doubles,
        triples: stats.triples,
        homeRuns: stats.homeRuns,
        sacrificeFly: stats.sacrificeFly,
        outs: stats.outs,
        runs: stats.runs,
        rbi: stats.rbi,
        average: stats.officialAtBats > 0 ? (stats.hits / stats.officialAtBats).toFixed(3) : '.000'
    })).sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
    
    // Display in table
    tbody.innerHTML = playerArray.map(player => `
        <tr onclick="selectPlayer('${player.name}')">
            <td>${player.name}</td>
            <td>${player.games}</td>
            <td>${player.atBats}</td>
            <td>${player.hits}</td>
            <td>${player.average}</td>
            <td>${player.runs}</td>
            <td>${player.rbi}</td>
            <td>${player.singles}</td>
            <td>${player.doubles}</td>
            <td>${player.triples}</td>
            <td>${player.homeRuns}</td>
            <td>${player.outs}</td>
        </tr>
    `).join('');
}

function displayGameDetails() {
    const container = document.getElementById('game-details-container');
    
    if (filteredData.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    // Group by game date
    const gameGroups = {};
    filteredData.forEach(stat => {
        if (!gameGroups[stat.gameDate]) {
            gameGroups[stat.gameDate] = [];
        }
        gameGroups[stat.gameDate].push(stat);
    });
    
    // Sort games by date (most recent first)
    const sortedGames = Object.entries(gameGroups)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .slice(0, 5); // Show last 5 games
    
    container.innerHTML = `
        <h4>Recent Games (Last 5)</h4>
        ${sortedGames.map(([date, players]) => {
            const gameHits = players.reduce((sum, p) => sum + p.hits, 0);
            const gameAtBats = players.reduce((sum, p) => sum + p.atBats, 0);
            const gameAvg = gameAtBats > 0 ? (gameHits / gameAtBats).toFixed(3) : '.000';
            
            return `
                <div class="game-detail-item">
                    <h4>${new Date(date).toLocaleDateString()} - Team AVG: ${gameAvg}</h4>
                    ${players.map(p => `
                        <div class="game-player-stat">
                            <span>${p.playerName}</span>
                            <span>${p.hits}-${p.atBats} (${p.battingAverage})</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('')}
    `;
}

function selectPlayer(playerName) {
    // Update filter and re-filter data
    document.getElementById('player-filter').value = playerName;
    filterHistoricalStats();
    
    // Highlight selected row
    document.querySelectorAll('.stats-table tbody tr').forEach(row => {
        row.classList.remove('selected');
        if (row.cells[0].textContent === playerName) {
            row.classList.add('selected');
        }
    });
}

// Format at-bat result for display
function formatResult(result) {
    const resultMap = {
        'single': 'Single',
        'double': 'Double',
        'triple': 'Triple',
        'homerun': 'Home Run',
        'sacrifice-fly': 'Sacrifice Fly',
        'out': 'Out'
    };
    return resultMap[result] || result;
}

// Show diamond visualization
function showDiamondVisualization(result) {
    const container = document.querySelector('.diamond-result-container');
    const runsSection = document.querySelector('.runs-section');
    const resultText = document.querySelector('.diamond-svg .result-text');
    const runner = document.querySelector('.diamond-svg .runner');
    const paths = document.querySelectorAll('.diamond-svg .base-path');
    const bases = document.querySelectorAll('.diamond-svg .base');
    
    // Reset all paths and bases
    paths.forEach(path => path.style.display = 'none');
    bases.forEach(base => base.classList.remove('active'));
    runner.style.display = 'none';
    
    // Show container and runs section
    container.style.display = 'block';
    runsSection.style.display = 'block';
    
    // Set result text
    resultText.textContent = formatResult(result);
    
    // Show appropriate visualization
    setTimeout(() => {
        if (result !== 'out' && result !== 'sacrifice-fly') {
            runner.style.display = 'block';
            document.querySelector(`.${result}-path`).style.display = 'block';
            
            // Highlight bases based on result
            switch(result) {
                case 'single':
                    document.querySelector('.first-base').classList.add('active');
                    break;
                case 'double':
                    document.querySelector('.first-base').classList.add('active');
                    document.querySelector('.second-base').classList.add('active');
                    break;
                case 'triple':
                    document.querySelector('.first-base').classList.add('active');
                    document.querySelector('.second-base').classList.add('active');
                    document.querySelector('.third-base').classList.add('active');
                    break;
                case 'homerun':
                    bases.forEach(base => base.classList.add('active'));
                    break;
            }
        }
    }, 100);
    
    // Don't auto-hide - keep visualization visible
}

