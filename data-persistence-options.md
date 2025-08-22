# Data Persistence Options (No Database)

## 1. **GitHub as Storage (Recommended)**
Use GitHub API to save JSON files directly to your repo:

```javascript
// Save data to GitHub
async function saveToGitHub(data) {
    const token = 'YOUR_GITHUB_TOKEN'; // Personal access token
    const owner = 'your-username';
    const repo = 'softball';
    const path = 'data/lineup.json';
    
    // Get current file (to get SHA)
    const current = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Authorization': `token ${token}` }
    });
    const currentData = await current.json();
    
    // Update file
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: 'Update lineup',
            content: btoa(JSON.stringify(data)), // Base64 encode
            sha: currentData.sha // Required for updates
        })
    });
}
```

## 2. **Google Sheets API**
Use Google Sheets as a simple database:

```javascript
// Uses Google Sheets API v4
const SHEET_ID = 'your-sheet-id';
const API_KEY = 'your-api-key';

async function saveToSheets(data) {
    const range = 'A1';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=RAW&key=${API_KEY}`;
    
    await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            values: [[JSON.stringify(data)]]
        })
    });
}
```

## 3. **Firebase Realtime Database (Free Tier)**
No backend needed, just client-side JavaScript:

```javascript
// Initialize Firebase
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "..."
};
firebase.initializeApp(firebaseConfig);

// Save data
function saveToFirebase(data) {
    firebase.database().ref('lineup').set(data);
}

// Load data
firebase.database().ref('lineup').on('value', (snapshot) => {
    const data = snapshot.val();
    // Update your app
});
```

## 4. **Netlify Forms + Functions**
Store form submissions and retrieve via API:

```javascript
// Save via form submission
<form name="lineup-data" netlify netlify-honeypot="bot-field" hidden>
    <input type="text" name="data" />
</form>

// Retrieve via Netlify Function
exports.handler = async (event, context) => {
    // Access form submissions via Netlify API
};
```

## 5. **JSONBin.io (Free Tier)**
Simple JSON storage service:

```javascript
const BIN_ID = 'your-bin-id';
const API_KEY = 'your-api-key';

// Save data
async function saveToJSONBin(data) {
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY
        },
        body: JSON.stringify(data)
    });
}

// Load data
async function loadFromJSONBin() {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
    });
    return await response.json();
}
```

## 6. **URL Parameters (For Sharing)**
Encode entire state in URL:

```javascript
// Save to URL
function saveToURL(data) {
    const encoded = btoa(JSON.stringify(data));
    window.history.pushState({}, '', `#${encoded}`);
}

// Load from URL
function loadFromURL() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        return JSON.parse(atob(hash));
    }
}
```

## 7. **QR Code Storage**
Generate QR code containing the data:

```javascript
// Generate QR code with lineup data
function generateQR(data) {
    const qr = new QRCode(document.getElementById("qrcode"), {
        text: JSON.stringify(data),
        width: 256,
        height: 256
    });
}
```

## Recommended Solution: GitHub + Local Storage

1. **Local Storage**: Immediate saves (what you have now)
2. **GitHub API**: Periodic backups or manual "cloud save"
3. **Benefits**:
   - Works offline
   - Free forever
   - Version history
   - Team can pull latest data

## Implementation for Softball Manager:

```javascript
// Add to your script.js
async function cloudSave() {
    const data = {
        teammates,
        fieldPositions,
        battingLineup,
        savedDate: new Date().toISOString()
    };
    
    try {
        await saveToGitHub(data);
        alert('Lineup saved to cloud!');
    } catch (error) {
        console.error('Cloud save failed:', error);
        alert('Cloud save failed. Data still saved locally.');
    }
}

// Add cloud save button
<button onclick="cloudSave()">Save to Cloud</button>
```

Want me to implement any of these options?