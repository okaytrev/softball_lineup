# Softball Team Manager

A web-based drag-and-drop softball team management application for organizing field positions and batting lineups.

## Features

- **Interactive Field Layout**: Visual baseball diamond with drag-and-drop player positioning
- **Batting Lineup Management**: Automatically syncs with field positions and allows custom ordering
- **Position Support**: All standard positions (P, C, 1B, 2B, 3B, SS, LF, LC, RC, RF) plus 3 DH spots
- **Substitute Players**: Add custom substitute players on the fly
- **Export Options**: 
  - Copy lineup as formatted text to clipboard
  - Export lineup as CSV file
- **Persistent Storage**: All changes are automatically saved to browser localStorage
- **Mobile Friendly**: Fully responsive design works on phones, tablets, and desktops

## Getting Started

1. Open `index.html` in a web browser
2. The app will load with the default roster of players

## How to Use

### Managing Field Positions
- **Drag players** from the "Available Players" section to any field position
- **Click on an occupied position** to remove the player and return them to available
- Players on the field automatically appear in the batting lineup

### Managing Batting Lineup
- **Reorder players** by:
  - Typing a new number in the input box next to their name
  - Dragging players within the lineup (coming soon)
- The lineup only shows players currently on the field
- Each player's field position is displayed next to their name

### Adding Substitute Players
- Type the substitute's name in the input field under "Available Players"
- Click "Add Sub" or press Enter
- Substitutes appear with "(Sub)" suffix and can be used like regular players

### Exporting Lineups
- **Copy Lineup**: Copies a text version to clipboard (e.g., "1. John Doe (P)")
- **Export Lineup**: Downloads a CSV file with Order, Name, and Position columns

### Special Positions
- **DH Positions**: Three designated hitter spots (DH1, DH2, DH3) are located to the left of the field
- All DH positions show as "DH" in the batting lineup

## Roster

Default players:
- Kyle H
- Trevar
- Jayson G
- Kyle P
- Jason
- Andy
- Damion
- Mitch
- Jaspen
- Joe
- Dan
- Matt

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- No server required - runs entirely in the browser
- Data persists using localStorage
- Responsive design with mobile-specific optimizations

## Files

- `index.html` - Main application structure
- `styles.css` - All styling including dark mode theme
- `script.js` - Application logic and interactivity
- `teammates.json` - Default roster data
- `baseball-field-png.png` - Field background image (required)

## Browser Compatibility

Works on all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- localStorage
- Drag and Drop API

## Tips

- Reset all field positions with the "Reset Field" button
- Player data persists between sessions
- For best mobile experience, use landscape orientation for the field view