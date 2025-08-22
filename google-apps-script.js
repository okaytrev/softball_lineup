// This code goes in Google Apps Script, not your local files
// Go to your Google Sheet → Extensions → Apps Script
// Delete any existing code and paste this:

function doGet(e) {
  // Check if requesting stats history
  if (e.parameter.type === 'stats') {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const statsSheet = spreadsheet.getSheetByName('Game Stats');
    
    if (!statsSheet || statsSheet.getLastRow() < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({error: 'No stats data found'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get all stats data (skip header row)
    const dataRange = statsSheet.getRange(2, 1, statsSheet.getLastRow() - 1, 12);
    const statsData = dataRange.getValues();
    
    // Convert to structured format
    const formattedStats = statsData.map(row => ({
      gameDate: row[0],
      playerName: row[1],
      atBats: row[2],
      hits: row[3],
      singles: row[4],
      doubles: row[5],
      triples: row[6],
      homeRuns: row[7],
      battingAverage: row[8],
      outs: row[9],
      fieldersChoice: row[10],
      rbi: row[11] || 0
    }));
    
    return ContentService
      .createTextOutput(JSON.stringify({stats: formattedStats}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default behavior - get lineup
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({error: 'No lineup data found'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get the most recent lineup (last row)
  const range = sheet.getRange(lastRow, 1, 1, 3);
  const [timestamp, lineupData, savedBy] = range.getValues()[0];
  
  const response = {
    timestamp,
    lineup: JSON.parse(lineupData),
    savedBy
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Check if this is stats data or lineup data
    if (data.stats) {
      // Handle game stats data
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let statsSheet = spreadsheet.getSheetByName('Game Stats');
      
      // Create the stats sheet if it doesn't exist
      if (!statsSheet) {
        statsSheet = spreadsheet.insertSheet('Game Stats');
        
        // Add comprehensive headers for stats tracking
        statsSheet.appendRow([
          'Game Date',
          'Player Name',
          'At Bats',
          'Hits',
          'Singles',
          'Doubles',
          'Triples',
          'Home Runs',
          'Batting Average',
          'Outs',
          'Fielders Choice',
          'RBI'
        ]);
        
        // Format the header row
        const headerRange = statsSheet.getRange(1, 1, 1, 12);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4ade80');
        headerRange.setFontColor('#1a1a1a');
      }
      
      // Extract the game date
      const gameDate = new Date(data.stats.gameDate).toLocaleDateString();
      
      // Add a row for each player's stats
      const gameStats = data.stats.gameStats;
      Object.keys(gameStats).forEach(playerId => {
        const playerStats = gameStats[playerId];
        const atBats = playerStats.atBats.length;
        const battingAverage = atBats > 0 ? (playerStats.hits / atBats).toFixed(3) : '.000';
        
        statsSheet.appendRow([
          gameDate,
          playerStats.name,
          atBats,
          playerStats.hits,
          playerStats.singles,
          playerStats.doubles,
          playerStats.triples,
          playerStats.homeruns,
          battingAverage,
          playerStats.outs,
          playerStats.fieldersChoice,
          playerStats.rbi || 0
        ]);
      });
      
    } else if (data.lineup) {
      // Handle lineup data - save to the main sheet
      const sheet = SpreadsheetApp.getActiveSheet();
      
      // Add headers if this is the first entry
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Lineup Data', 'Saved By']);
      }
      
      sheet.appendRow([
        new Date().toLocaleString(),
        JSON.stringify(data.lineup),
        data.savedBy || 'Web App'
      ]);
      
      // Keep only last 100 entries to prevent sheet from getting too large
      if (sheet.getLastRow() > 100) {
        sheet.deleteRow(2); // Delete oldest entry (row 2, keeping header)
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to ensure script is working
function test() {
  Logger.log('Script is connected to sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getName());
}