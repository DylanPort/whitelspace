# Integrate Full-Stack Privacy Tools Lab into index.html

## Current Status
- ✅ Backend ready: `netlify/functions/create-fullstack-tool.js`
- ✅ Standalone UI ready: `privacy-tools-lab-fullstack.html`
- ❌ NOT integrated into main `index.html` yet

## What Needs to Be Done

### 1. Replace Old PrivacyToolsLab Component in index.html

**Location**: Around line 22796 in `index.html`

**Current**: Single-file HTML generator with chat
**New**: Multi-file full-stack project generator with file tree

### 2. Add New Components

**FileTree Component** (`privacy-tools-lab-fullstack.html` lines 22-122):
- Displays folder/file hierarchy
- Expandable folders
- File icons based on extension
- Click to select file

**FileTabs Component** (`privacy-tools-lab-fullstack.html` lines 127-156):
- Open file tabs at top
- Close button on each tab
- Active tab highlighting

**CodeEditor Component** (simple textarea with syntax highlighting look)

**LivePreview Component** (iframe for HTML files)

### 3. Update API Call

Change from:
```javascript
fetch(`${API_BASE}/create-privacy-tool`)  // Old single-file
```

To:
```javascript
fetch(`${API_BASE}/create-fullstack-tool`)  // New multi-file
```

### 4. Update State Management

**Old State**:
```javascript
const [preview, setPreview] = useState(null);  // Single URL
const [source, setSource] = useState('');      // Single HTML string
```

**New State**:
```javascript
const [files, setFiles] = useState([]);              // Array of {path, content, type, size}
const [activeFile, setActiveFile] = useState(null);  // Currently selected file
const [openTabs, setOpenTabs] = useState([]);        // Open file tabs
const [projectStructure, setProjectStructure] = useState(null);  // Full project metadata
```

### 5. Update UI Layout

**Old Layout**:
```
[ Chat Sidebar ] [ Code/Preview Toggle ]
```

**New Layout**:
```
[ Chat Sidebar ] [ FileTree | Editor/Tabs | Preview ]
```

### 6. Add Download as ZIP

Use JSZip to bundle all files:
```javascript
const handleDownloadZip = async () => {
  const zip = new JSZip();
  files.forEach(file => {
    zip.file(file.path, file.content);
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  // trigger download
};
```

## Quick Integration Steps

1. Read full `privacy-tools-lab-fullstack.html` lines 16-573
2. Extract `FileTree`, `FileTabs` components
3. Find `function PrivacyToolsLab` in `index.html` (line 22796)
4. Replace entire component with fullstack version
5. Add JSZip CDN to index.html if not present
6. Test locally

## Files to Modify
- `index.html` (main integration point)

## Files Already Ready
- `netlify/functions/create-fullstack-tool.js` ✅
- `privacy-tools-lab-fullstack.html` (reference) ✅

