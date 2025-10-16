# Quick Notes - Edge Extension

A Chromium extension for Microsoft Edge that allows you to store, manage, and quickly copy text strings with a secret option for sensitive content.

## Features

-   ✅ Create, edit, and delete text notes
-   ✅ Copy notes to clipboard with one click
-   ✅ Secret notes (content is obfuscated in the list view)
-   ✅ Search functionality
-   ✅ Modern, responsive UI
-   ✅ Persistent storage using Chrome storage API

## Installation

### For Microsoft Edge:

1. **Enable Developer Mode:**

    - Open Microsoft Edge
    - Go to `edge://extensions/`
    - Turn on "Developer mode" in the bottom left corner

2. **Load the Extension:**

    - Click "Load unpacked" button
    - Navigate to this project folder (`edge-quicknotes`)
    - Select the folder and click "Select Folder"

3. **Pin the Extension:**
    - Click the puzzle piece icon in the Edge toolbar
    - Find "Quick Notes" and click the pin icon to keep it visible

### For Google Chrome:

1. **Enable Developer Mode:**

    - Open Google Chrome
    - Go to `chrome://extensions/`
    - Turn on "Developer mode" in the top right corner

2. **Load the Extension:**

    - Click "Load unpacked" button
    - Navigate to this project folder (`edge-quicknotes`)
    - Select the folder and click "Select Folder"

3. **Pin the Extension:**
    - Click the puzzle piece icon in the Chrome toolbar
    - Find "Quick Notes" and click the pin icon to keep it visible

## Usage

1. **Adding Notes:**

    - Click the extension icon in your browser toolbar
    - Click "Add Note" button
    - Enter a title and content
    - Check "Mark as secret" to obfuscate the content in the list view
    - Click "Save Note"

2. **Managing Notes:**

    - Use the search bar to find specific notes
    - Click "Copy" to copy the note content to clipboard
    - Click "Edit" to modify an existing note
    - Click "Delete" to remove a note

3. **Secret Notes:**
    - Secret notes show "••••••••" instead of the actual content
    - The "SECRET" indicator appears in the note metadata
    - You can still copy the actual content by clicking the "Copy" button

## Development

### Prerequisites

-   Node.js and Yarn installed
-   TypeScript knowledge (optional, for modifications)

### Building from Source

```bash
# Install dependencies
yarn install

# Build the extension
yarn build

# Watch for changes during development
yarn watch
```

### File Structure

```
edge-quicknotes/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.css             # Styling
├── popup.js              # Compiled JavaScript (from TypeScript)
├── src/
│   └── popup.ts          # TypeScript source
├── icons/                # Extension icons (placeholder)
└── package.json          # Dependencies and scripts
```

## Permissions

This extension requires the following permissions:

-   `storage`: To save and retrieve your notes locally

No network permissions are required - all data is stored locally on your device.

## Privacy

-   All notes are stored locally in your browser
-   No data is sent to external servers
-   No tracking or analytics
-   Your notes remain private and secure

