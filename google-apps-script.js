// This code goes in Google Apps Script, not your local files
// Go to your Google Sheet → Extensions → Apps Script
// Delete any existing code and paste this:

function doGet(e) {
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
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Append new row with lineup data
    sheet.appendRow([
      new Date().toLocaleString(),
      JSON.stringify(data.lineup),
      data.savedBy || 'Web App'
    ]);
    
    // Keep only last 100 entries to prevent sheet from getting too large
    if (sheet.getLastRow() > 100) {
      sheet.deleteRow(2); // Delete oldest entry (row 2, keeping header)
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