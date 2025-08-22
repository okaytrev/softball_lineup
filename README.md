# Softball Team Manager

A comprehensive web-based application for managing recreational softball teams with lineup management, game statistics tracking, historical data analysis, and cloud storage via Google Sheets.

## Features

### Team Management
- **Interactive Field Layout**: Visual baseball diamond with drag-and-drop player positioning
- **Batting Lineup Management**: Organize batting order with automatic position tracking
- **Player Roster Management**: Add/remove players dynamically
- **Position Support**: All standard positions (P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF) plus 3 DH spots
- **Touch-Friendly**: Click-to-select alternative for mobile devices

### Statistics Tracking
- **Game Stats Recording**: Track at-bats, hits, RBIs, and various outcomes
- **At-Bat Results**: Single, Double, Triple, Home Run, Fielder's Choice, Out
- **RBI Tracking**: Record 0-4 runs batted in per at-bat with dedicated selection buttons
- **Real-Time Stats Display**: See batting averages, hit breakdowns, and RBI totals during games
- **Edit Previous At-Bats**: Correct mistakes by re-selecting at-bat numbers (with confirmation)
- **Manual At-Bat Control**: At-bat number doesn't auto-increment for better control

### Historical Analysis
- **Season Statistics**: View aggregated stats across all games
- **Player Performance**: Individual batting averages, RBI totals, hit breakdowns
- **Game History**: Browse recent games with team performance metrics
- **Filtering Options**: Filter by player or date range
- **Sortable Stats Table**: Players ranked by batting average with RBI column
- **Mobile-Optimized Tables**: Horizontal scrolling with visual indicator

### Technical Features
- **Cloud Storage**: Save and load data using Google Sheets (no backend required)
- **Mobile Optimized**: Fully responsive design for phones and tablets
- **Dark Mode**: Easy-on-the-eyes dark theme with green accents
- **Password Protection**: Simple team password to prevent unauthorized access
- **Loading Indicators**: Animated spinners for all cloud operations (save/load/refresh)
- **Persistent Storage**: Local storage backup when offline
- **Touch-Friendly**: 44px minimum touch targets following Apple guidelines

## Getting Started

### 1. Initial Setup
1. Clone or download this repository
2. Open `index.html` in a web browser
3. Enter the team password when prompted (default: "bonix")

### 2. Google Sheets Integration Setup

To enable cloud saving and team-wide access:

1. **Create a Google Sheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new blank spreadsheet
   - Name it "Softball Team Data" (or your preference)

2. **Set Up Google Apps Script**
   - In your Google Sheet, go to Extensions → Apps Script
   - Delete any existing code
   - Copy the entire contents of `google-apps-script.js`
   - Paste into the Apps Script editor
   - Click "Save" (💾 icon)

3. **Deploy the Script**
   - Click "Deploy" → "New deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
   - Copy the Web app URL (starts with `https://script.google.com/macros/s/...`)

4. **Configure the App**
   - Open `script.js` in a text editor
   - Find line 5: `const GOOGLE_SCRIPT_URL = '...'`
   - Replace the URL with your copied Web app URL
   - Save the file

## How to Use

### Managing Lineups (Lineup Page)
- **Drag players** from "Available Players" to field positions
- **Click players** on mobile to select, then click position
- **Reorder batting lineup** using the number inputs
- **Add new players** with the Add Player button
- **Remove players** using Remove Player mode
- **Save to cloud** to share lineup with team

### Recording Game Stats (Stats Page)
1. Select the current batter from dropdown
2. Enter the at-bat number (doesn't auto-increment)
3. Click the result button (Single, Double, etc.)
4. Select RBI (0-4 runs batted in)
5. Stats update automatically
6. Save stats to cloud when game ends

### Viewing Historical Data (History Page)
- **Season summary** shows games played, team batting average, total hits, total RBI
- **Player stats table** displays individual performance metrics with RBI column
- **Filter by player** using the dropdown
- **Filter by date range** for specific time periods
- **Recent games** section shows last 5 games with team averages
- **Mobile scrolling** - horizontal scroll for table with visual indicator
- Click any player row to filter their stats
- **Refresh Data** button with loading indicator

## Export Options
- **Copy Lineup**: Text format for sharing (e.g., "1. John Doe (P)")
- **Copy Roster**: List of all players
- **Export Lineup**: CSV file with positions
- **Stats Data**: Automatically saved to Google Sheets

## Roster

Default players:
- Kyle H, Trevar, Jayson G, Kyle P, Jason, Andy
- Damion, Mitch, Jaspen, Joe, Dan, Matt

## Mobile Features
- **Touch-optimized interface** with 44px minimum touch targets
- **Responsive layouts** for all screen sizes (phones, tablets, desktop)
- **Horizontal scrolling** for stats tables with "→ Scroll for more" indicator
- **Single-column layouts** on very small screens (< 480px)
- **Loading animations** visible and properly sized on mobile
- **Landscape orientation** recommended for field view
- **Portrait optimization** for stats and history pages
- **Touch-friendly buttons** for all interactions

## Technical Details

### Frontend
- Built with vanilla HTML, CSS, and JavaScript
- No framework dependencies
- ES6+ features used throughout
- CSS Grid and Flexbox layouts

### Data Storage
- **Local**: Browser localStorage for offline use
- **Cloud**: Google Sheets via Apps Script
- Automatic sync on page load
- Manual save buttons for explicit control

### Files
- `index.html` - Main application structure
- `styles.css` - Dark mode theme and responsive design
- `script.js` - Core application logic
- `google-apps-script.js` - Server-side Google Apps Script
- `teammates.json` - Default roster data
- `baseball-field-png.png` - Field background image

## Browser Requirements
- Modern browsers with support for:
  - ES6 JavaScript
  - CSS Grid and Flexbox
  - localStorage
  - Drag and Drop API
  - Fetch API

## Tips & Tricks
- **Quick Reset**: Use "Reset Field" to clear all positions
- **Backup**: Data auto-saves locally even without internet
- **Team Access**: Share the Google Script URL with coaches
- **Stats Accuracy**: You can edit previous at-bats if you make mistakes
- **Mobile**: Use landscape for field, portrait for stats

## Troubleshooting

**Can't save to cloud?**
- Check your internet connection
- Verify the Google Script URL is correct
- Make sure the Apps Script is deployed

**Stats not showing?**
- Ensure you've saved at least one game's stats
- Check the date range filters
- Try clicking "Refresh Data"

**Password not working?**
- Default password is "bonix"
- Clear browser cache if issues persist
- Check localStorage permissions

## License

This project is for recreational use. Feel free to modify for your team's needs!