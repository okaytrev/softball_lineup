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
    document.getElementById('save-cloud').addEventListener('click', saveToCloud);
    document.getElementById('player-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    
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

// Cloud save to Google Sheets
async function saveToCloud() {
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
        
        alert('Lineup saved to cloud! Team can now access it.');
    } catch (error) {
        console.error('Cloud save error:', error);
        alert('Cloud save failed, but lineup is saved locally.');
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