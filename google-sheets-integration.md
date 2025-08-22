# Google Sheets Integration for Softball Manager

## Overview
Google Sheets acts as your free cloud database. Your app reads/writes directly to a spreadsheet that your team can also view.

## How It Works

### 1. **Data Structure in Sheets**
Your Google Sheet would look like:

| A | B | C | D |
|---|---|---|---|
| **Timestamp** | **Field Positions** | **Batting Order** | **Updated By** |
| 2024-01-15 3:45pm | {"pitcher": 1, "first-base": 2, ...} | [1, 5, 3, 7, ...] | Coach Mike |

### 2. **Two Approaches**

#### **Option A: Read-Only (Simpler)**
- Manually update the Google Sheet
- App reads from sheet only
- Good for: Coach controls lineups

#### **Option B: Read/Write (Full Integration)**
- App can update the sheet directly
- Real-time sync across devices
- Good for: Multiple coaches managing

## Step-by-Step Setup

### 1. **Create Google Sheet**
1. Create new Google Sheet
2. Name it "Softball Lineup"
3. Set up columns as shown above

### 2. **Make Sheet Public or Get API Access**

#### **Public Method (Easiest)**
1. Share → Anyone with link can view
2. File → Share → Publish to web
3. Get the sheet ID from URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

#### **API Method (More Secure)**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google Sheets API
4. Create credentials (API Key or OAuth)

### 3. **Implementation Code**

#### **Reading from Public Sheet:**
```javascript
// No API key needed for public read-only
const SHEET_ID = 'your-sheet-id-here';
const RANGE = 'A2:C2'; // Latest lineup row

async function loadFromGoogleSheets() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&range=${RANGE}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Google returns JSONP, need to parse
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const data = json.table.rows[0].c;
        
        // Parse the data
        const fieldPositions = JSON.parse(data[1].v);
        const battingOrder = JSON.parse(data[2].v);
        
        // Update your app
        updateFromSheetData(fieldPositions, battingOrder);
        
    } catch (error) {
        console.error('Failed to load from Google Sheets:', error);
    }
}
```

#### **Writing to Sheet (Requires API Key):**
```javascript
const API_KEY = 'your-api-key';
const SHEET_ID = 'your-sheet-id';

async function saveToGoogleSheets() {
    const data = {
        timestamp: new Date().toLocaleString(),
        fieldPositions: JSON.stringify(fieldPositions),
        battingOrder: JSON.stringify(battingLineup.map(p => p.id)),
        updatedBy: 'Web App'
    };
    
    const range = 'A2:D2'; // Append to row 2
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: [[
                    data.timestamp,
                    data.fieldPositions,
                    data.battingOrder,
                    data.updatedBy
                ]]
            })
        });
        
        alert('Lineup saved to Google Sheets!');
    } catch (error) {
        console.error('Save failed:', error);
    }
}
```

### 4. **Add to Your Softball Manager**

```javascript
// Add buttons to your HTML
<button onclick="loadFromGoogleSheets()">Load from Sheets</button>
<button onclick="saveToGoogleSheets()">Save to Sheets</button>

// Auto-load on startup
window.addEventListener('load', () => {
    if (checkAuth()) {
        loadTeammates();
        loadFromGoogleSheets(); // Load latest from sheets
    }
});
```

## Benefits for Your Team

1. **Shared View**: Everyone can see the Google Sheet
2. **History**: Every lineup is saved with timestamp
3. **Backup**: Data stored in Google's cloud
4. **Mobile Friendly**: Edit sheet from Google Sheets app
5. **Free**: No cost for normal usage
6. **Notifications**: Can set up alerts when lineup changes

## Privacy Options

### **Private Team Sheet**
- Share only with team emails
- Requires Google login
- More complex setup

### **Public Read-Only**
- Anyone with link can view
- Only designated people can edit
- Simpler setup

## Alternative: Google Forms + Sheets

Create a Google Form for lineup submission:
1. Form collects lineup choices
2. Automatically saves to Sheet
3. Your app reads from Sheet
4. Coach approves via Sheet

## Example Sheet Structure

### Tab 1: Current Lineup
| Position | Player ID | Player Name |
|----------|-----------|-------------|
| Pitcher | 1 | Kyle H |
| First Base | 5 | Jason |

### Tab 2: Batting Order
| Order | Player ID | Player Name | Status |
|-------|-----------|-------------|---------|
| 1 | 2 | Trevar | Active |
| 2 | 7 | Damion | Active |

### Tab 3: Roster
| ID | Name | Active |
|----|------|---------|
| 1 | Kyle H | Yes |
| 2 | Trevar | Yes |

## Next Steps

1. **Quick Start**: Try the read-only public sheet method
2. **Test**: Create a test sheet with sample data
3. **Integrate**: Add load button to your app
4. **Expand**: Add write capability if needed

Want me to help you set this up with your specific Google Sheet?