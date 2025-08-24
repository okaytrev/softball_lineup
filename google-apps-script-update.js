// Google Apps Script Update for Sacrifice Fly
// 
// This update changes "fieldersChoice" to "sacrificeFly" throughout the script
// 
// In your Google Apps Script, you need to make the following changes:

// 1. Update any column headers from "FC" or "Fielder's Choice" to "SF" or "Sacrifice Fly"

// 2. Replace all instances of:
//    - fieldersChoice → sacrificeFly
//    - "Fielder's Choice" → "Sacrifice Fly"
//    - "FC" → "SF"

// 3. IMPORTANT: Update the batting average calculation
//    Sacrifice flies do NOT count as official at-bats
//    
//    Change from:
//    const average = atBats > 0 ? (hits / atBats).toFixed(3) : '.000';
//    
//    To:
//    const officialAtBats = atBats - sacrificeFlies;
//    const average = officialAtBats > 0 ? (hits / officialAtBats).toFixed(3) : '.000';

// 4. Example of updated player stats structure:
const playerStats = {
    playerName: "John Doe",
    gameDate: new Date(),
    atBats: 4,  // This includes sacrifice flies
    hits: 2,
    singles: 1,
    doubles: 1,
    triples: 0,
    homeRuns: 0,
    sacrificeFly: 1,  // Changed from fieldersChoice
    outs: 1,
    runs: 1,
    rbi: 2,
    // When calculating average: use (atBats - sacrificeFly) = 3 official at-bats
    // Average would be: 2 hits / 3 official at-bats = .667
};

// 5. If you're storing data in sheets, make sure the column headers match:
//    - Change "Fielder's Choice" or "FC" column to "Sacrifice Fly" or "SF"
//    - Add a note that batting averages exclude sacrifice flies

// 6. Sample batting average calculation function:
function calculateBattingAverage(hits, atBats, sacrificeFlies) {
    const officialAtBats = atBats - sacrificeFlies;
    return officialAtBats > 0 ? (hits / officialAtBats).toFixed(3) : '.000';
}

// 7. When aggregating stats, remember to subtract sacrifice flies from at-bats:
function aggregatePlayerStats(statsArray) {
    const totals = {
        atBats: 0,
        hits: 0,
        sacrificeFly: 0,
        // ... other stats
    };
    
    statsArray.forEach(stat => {
        totals.atBats += stat.atBats;
        totals.hits += stat.hits;
        totals.sacrificeFly += stat.sacrificeFly || 0;
        // ... aggregate other stats
    });
    
    // Calculate batting average with official at-bats
    const officialAtBats = totals.atBats - totals.sacrificeFly;
    totals.average = officialAtBats > 0 ? (totals.hits / officialAtBats).toFixed(3) : '.000';
    
    return totals;
}