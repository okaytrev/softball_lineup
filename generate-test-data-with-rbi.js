// Script to generate fake softball stats data with RBIs for testing
// This creates CSV data that can be imported into Google Sheets

const players = [
    "Kyle H", "Trevar", "Jayson G", "Kyle P", "Jason", 
    "Andy", "Damion", "Mitch", "Jaspen", "Joe", "Dan", "Matt"
];

// Generate games from the last 3 months
const generateGameDates = (numGames) => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < numGames; i++) {
        const daysAgo = Math.floor(Math.random() * 90); // Random day within last 90 days
        const gameDate = new Date(today);
        gameDate.setDate(gameDate.getDate() - daysAgo);
        dates.push(gameDate);
    }
    
    return dates.sort((a, b) => a - b); // Sort chronologically
};

// Generate realistic at-bat results with RBI logic
const generateAtBatResult = () => {
    const rand = Math.random();
    let result, isHit, typicalRBI;
    
    // Approximate real softball statistics with RBI expectations
    if (rand < 0.28) {
        result = 'single';
        isHit = true;
        // Singles typically drive in 0-1 runs
        typicalRBI = Math.random() < 0.7 ? 0 : 1;
    } else if (rand < 0.33) {
        result = 'double';
        isHit = true;
        // Doubles typically drive in 0-2 runs
        const rbiRand = Math.random();
        typicalRBI = rbiRand < 0.4 ? 0 : rbiRand < 0.8 ? 1 : 2;
    } else if (rand < 0.35) {
        result = 'triple';
        isHit = true;
        // Triples typically drive in 1-3 runs
        const rbiRand = Math.random();
        typicalRBI = rbiRand < 0.2 ? 1 : rbiRand < 0.7 ? 2 : 3;
    } else if (rand < 0.38) {
        result = 'homerun';
        isHit = true;
        // Home runs drive in at least 1 (the batter)
        const rbiRand = Math.random();
        typicalRBI = rbiRand < 0.4 ? 1 : rbiRand < 0.7 ? 2 : rbiRand < 0.9 ? 3 : 4;
    } else if (rand < 0.43) {
        result = 'fieldersChoice';
        isHit = false;
        // Fielder's choice can drive in runs
        typicalRBI = Math.random() < 0.8 ? 0 : 1;
    } else {
        result = 'out';
        isHit = false;
        // Outs can still drive in runs (sac fly, ground out)
        typicalRBI = Math.random() < 0.9 ? 0 : 1;
    }
    
    return { result, isHit, rbi: typicalRBI };
};

// Generate stats for one player in one game
const generatePlayerGameStats = (playerName, gameDate) => {
    const atBats = Math.floor(Math.random() * 3) + 3; // 3-5 at bats per game
    let hits = 0;
    let singles = 0;
    let doubles = 0;
    let triples = 0;
    let homeRuns = 0;
    let fieldersChoice = 0;
    let outs = 0;
    let rbi = 0;
    
    for (let i = 0; i < atBats; i++) {
        const { result, isHit, rbi: atBatRBI } = generateAtBatResult();
        
        if (isHit) hits++;
        rbi += atBatRBI;
        
        switch(result) {
            case 'single': singles++; break;
            case 'double': doubles++; break;
            case 'triple': triples++; break;
            case 'homerun': homeRuns++; break;
            case 'fieldersChoice': fieldersChoice++; break;
            case 'out': outs++; break;
        }
    }
    
    const battingAverage = atBats > 0 ? (hits / atBats).toFixed(3) : '.000';
    
    return {
        gameDate: gameDate.toLocaleDateString(),
        playerName,
        atBats,
        hits,
        singles,
        doubles,
        triples,
        homeRuns,
        battingAverage,
        outs,
        fieldersChoice,
        rbi
    };
};

// Generate all game data
const generateAllGameData = (numGames = 15) => {
    const gameDates = generateGameDates(numGames);
    const allStats = [];
    
    gameDates.forEach(date => {
        // Random number of players per game (8-12)
        const numPlayers = Math.floor(Math.random() * 5) + 8;
        const gamePlayers = [...players].sort(() => Math.random() - 0.5).slice(0, numPlayers);
        
        gamePlayers.forEach(player => {
            const stats = generatePlayerGameStats(player, date);
            allStats.push(stats);
        });
    });
    
    return allStats;
};

// Convert to CSV format
const convertToCSV = (data) => {
    const headers = [
        'Game Date', 'Player Name', 'At Bats', 'Hits', 'Singles', 
        'Doubles', 'Triples', 'Home Runs', 'Batting Average', 'Outs', 'Fielders Choice', 'RBI'
    ];
    
    const rows = data.map(stat => [
        stat.gameDate,
        stat.playerName,
        stat.atBats,
        stat.hits,
        stat.singles,
        stat.doubles,
        stat.triples,
        stat.homeRuns,
        stat.battingAverage,
        stat.outs,
        stat.fieldersChoice,
        stat.rbi
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    
    return csvContent;
};

// Generate the data
const statsData = generateAllGameData(20); // Generate 20 games worth of data
const csvData = convertToCSV(statsData);

// Display some sample stats
console.log('Generated stats for', statsData.length, 'player-game combinations');
console.log('\nFirst 5 entries:');
console.log(statsData.slice(0, 5));

// Calculate some summary stats
const playerTotals = {};
statsData.forEach(stat => {
    if (!playerTotals[stat.playerName]) {
        playerTotals[stat.playerName] = {
            games: 0,
            atBats: 0,
            hits: 0,
            homeRuns: 0,
            rbi: 0
        };
    }
    const player = playerTotals[stat.playerName];
    player.games++;
    player.atBats += stat.atBats;
    player.hits += stat.hits;
    player.homeRuns += stat.homeRuns;
    player.rbi += stat.rbi;
});

console.log('\nPlayer Season Summary:');
Object.entries(playerTotals)
    .sort(([,a], [,b]) => b.rbi - a.rbi) // Sort by RBI
    .forEach(([name, stats]) => {
        const avg = (stats.hits / stats.atBats).toFixed(3);
        console.log(`${name}: ${stats.games} games, ${avg} AVG, ${stats.homeRuns} HR, ${stats.rbi} RBI`);
    });

// Calculate team totals
const teamTotals = Object.values(playerTotals).reduce((acc, player) => ({
    games: Math.max(acc.games, player.games),
    atBats: acc.atBats + player.atBats,
    hits: acc.hits + player.hits,
    homeRuns: acc.homeRuns + player.homeRuns,
    rbi: acc.rbi + player.rbi
}), { games: 0, atBats: 0, hits: 0, homeRuns: 0, rbi: 0 });

console.log('\nTeam Totals:');
console.log(`Games: ${teamTotals.games}`);
console.log(`Team AVG: ${(teamTotals.hits / teamTotals.atBats).toFixed(3)}`);
console.log(`Total Hits: ${teamTotals.hits}`);
console.log(`Total HRs: ${teamTotals.homeRuns}`);
console.log(`Total RBI: ${teamTotals.rbi}`);

// Save to file
const fs = require('fs');
fs.writeFileSync('test-stats-data-with-rbi.csv', csvData);
console.log('\nData saved to test-stats-data-with-rbi.csv');

// Also create a version that can be copy-pasted directly
const copyPasteData = statsData.map(stat => 
    `${stat.gameDate}\t${stat.playerName}\t${stat.atBats}\t${stat.hits}\t${stat.singles}\t${stat.doubles}\t${stat.triples}\t${stat.homeRuns}\t${stat.battingAverage}\t${stat.outs}\t${stat.fieldersChoice}\t${stat.rbi}`
).join('\n');

fs.writeFileSync('test-stats-paste-with-rbi.txt', copyPasteData);
console.log('Copy-paste version saved to test-stats-paste-with-rbi.txt');