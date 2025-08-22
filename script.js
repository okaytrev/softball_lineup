let teammates = [];
let fieldPositions = {};
let battingLineup = [];
let nextSubId = 100; // Start substitute IDs at 100 to avoid conflicts

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
    const playerList = document.getElementById('player-list');
    
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
    const playerName = e.dataTransfer.getData('playerName');
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

function handleZoneClick(e) {
    const position = e.target.dataset.position;
    if (fieldPositions[position]) {
        removePlayerFromField(fieldPositions[position]);
        updateAllSections();
        saveData();
    }
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
    document.getElementById('add-sub-btn').addEventListener('click', addSubstitute);
    document.getElementById('sub-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSubstitute();
    });
}

function addSubstitute() {
    const input = document.getElementById('sub-name-input');
    const name = input.value.trim();
    
    if (name) {
        const newSub = {
            id: nextSubId++,
            name: name + ' (Sub)',
            isSub: true
        };
        teammates.push(newSub);
        input.value = '';
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
    const substitutes = teammates.filter(t => t.isSub);
    const data = {
        fieldPositions,
        battingLineup: battingLineup.map(p => p.id),
        substitutes: substitutes
    };
    localStorage.setItem('softballData', JSON.stringify(data));
}

function loadSavedData() {
    const savedData = localStorage.getItem('softballData');
    if (savedData) {
        const data = JSON.parse(savedData);
        fieldPositions = data.fieldPositions || {};
        
        // Load substitutes
        if (data.substitutes && data.substitutes.length > 0) {
            data.substitutes.forEach(sub => {
                if (!teammates.find(t => t.id === sub.id)) {
                    teammates.push(sub);
                    if (sub.id >= nextSubId) {
                        nextSubId = sub.id + 1;
                    }
                }
            });
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