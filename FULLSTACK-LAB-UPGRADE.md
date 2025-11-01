# Full-Stack Privacy Tools Lab Upgrade

## Overview
Upgrade Privacy Tools Lab from single-file HTML generation to full-stack multi-file projects with backend functionality.

## Backend Changes ✅

### New Function: `create-fullstack-tool.js`
**Features:**
- ✅ Generates project structure (JSON with file list)
- ✅ AI generates each file individually  
- ✅ Supports frontend + backend files
- ✅ Creates Express APIs, routes, middleware
- ✅ Generates package.json, README.md
- ✅ Deploy to CodeSandbox
- ✅ Save to Supabase

**AI Flow:**
1. **Step 1**: Generate project structure (file tree)
2. **Step 2**: Generate code for each file
3. **Step 3**: Deploy and create preview
4. **Step 4**: Save to database

## Frontend Changes (TODO)

### 1. File State Management
```javascript
const [files, setFiles] = React.useState([]);
const [activeFile, setActiveFile] = React.useState(null);
const [projectStructure, setProjectStructure] = React.useState(null);
```

### 2. File Tree UI Component
```
📁 my-privacy-tool/
├── 📄 index.html
├── 📁 api/
│   ├── 📄 server.js
│   ├── 📁 routes/
│   │   ├── 📄 auth.js
│   │   └── 📄 user.js
│   └── 📁 middleware/
│       └── 📄 auth.js
├── 📄 package.json
└── 📄 README.md
```

### 3. Multi-File Editor
- File tabs at top
- Click to switch files
- Syntax highlighting per file type
- Edit any file

### 4. ZIP Download
- Bundle all files
- Create folder structure
- Download as `.zip`

### 5. Updated API Call
```javascript
// Old (single HTML)
POST /create-privacy-tool
{ description, category }
→ { html: "..." }

// New (multi-file)
POST /create-fullstack-tool
{ description, category, includeBackend: true }
→ { 
  files: [
    { path: "index.html", content: "...", type: "frontend" },
    { path: "api/server.js", content: "...", type: "backend" }
  ],
  projectStructure: { ... }
}
```

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Chat Panel (Left)                                  │
│  - Whistle AI conversation                          │
│  - Generate button                                  │
└─────────────────────────────────────────────────────┘
                      ⋮
┌─────────────────────────────────────────────────────┐
│  Code Editor (Right)                                │
│  ┌─────────────────────────────────────────────┐   │
│  │  File Tree   │  Editor  │  Preview          │   │
│  │  ───────────────────────────────────────    │   │
│  │  📁 project  │  code    │  [iframe]         │   │
│  │  ├─ index    │          │                   │   │
│  │  ├─ api/     │          │                   │   │
│  │  │  └─ *.js  │          │                   │   │
│  │  └─ README   │          │                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Implementation Steps

1. ✅ Create `create-fullstack-tool.js` function
2. ⏳ Add file state to PrivacyToolsLab component
3. ⏳ Build FileTree component
4. ⏳ Update editor to show active file
5. ⏳ Add file tabs/switching
6. ⏳ Implement ZIP download with JSZip
7. ⏳ Update API call to new endpoint
8. ⏳ Add toggle for "Include Backend" checkbox

## Tech Stack Additions

- **JSZip**: For creating downloadable ZIP files
- **File icons**: Visual indicators for file types
- **Folder expand/collapse**: Tree navigation
- **Syntax highlighting**: Different colors per language

## User Flow

1. User describes tool in chat
2. User clicks "⚙️ Generate"
3. AI generates full project structure
4. User sees file tree on left
5. User clicks files to view/edit
6. User can download as ZIP
7. User can deploy/share

## Benefits

✅ Real backend functionality (APIs, databases)  
✅ Professional project structure  
✅ Learn from generated code  
✅ Export and run locally  
✅ More valuable tools ($500 bounty)  
✅ True full-stack development  

## Next: Frontend Implementation

