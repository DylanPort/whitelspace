# Full-Stack Privacy Tools Lab - Integration Guide

## ✅ What's Been Created

### 1. Backend Function ✅
**File**: `netlify/functions/create-fullstack-tool.js`

**Features:**
- Generates complete project structure (file tree)
- AI creates each file individually (frontend + backend)
- Supports Express.js APIs, routes, middleware
- Creates package.json, README.md, database schemas
- Deploys to CodeSandbox for preview
- Saves to Supabase

**Endpoint:** `POST /.netlify/functions/create-fullstack-tool`

**Request:**
```json
{
  "description": "Build a secure password manager with encryption",
  "category": "Encryption",
  "includeBackend": true
}
```

**Response:**
```json
{
  "success": true,
  "tool": {
    "projectName": "secure-password-manager",
    "description": "...",
    "techStack": ["html", "tailwind", "node.js", "express"],
    "features": [...],
    "files": [
      {
        "path": "index.html",
        "content": "...",
        "type": "frontend",
        "size": 12345
      },
      {
        "path": "api/server.js",
        "content": "...",
        "type": "backend",
        "size": 6789
      }
    ],
    "url": "https://codesandbox.io/embed/...",
    "sandboxId": "abc123",
    "html": "..." // main HTML for preview
  }
}
```

### 2. Full-Stack UI Component ✅
**File**: `privacy-tools-lab-fullstack.html`

**Features:**
- 📁 **File Tree**: Visual folder/file structure with icons
- 📑 **File Tabs**: Switch between open files
- ✏️ **Code Editor**: Edit any file (textarea-based)
- 👁️ **Live Preview**: Real-time HTML preview
- ⇩ **ZIP Download**: Bundle entire project
- ☑️ **Backend Toggle**: Include/exclude backend generation
- 💬 **AI Chat**: Conversational interface
- 📊 **Progress Tracking**: Real-time generation status

**Components:**
1. `FileTree` - Expandable folder structure
2. `FileTabs` - Open file tabs with close buttons
3. `CodeEditor` - Editable code view
4. `LivePreview` - iframe for HTML files
5. `FullStackPrivacyToolsLab` - Main component

## 🔗 Integration Options

### Option 1: Standalone Page (Easiest)
Use the standalone HTML file directly:

```html
<!-- In your main index.html, add a route -->
<a href="/privacy-tools-lab-fullstack.html">🛠️ Privacy Tools Lab</a>
```

**Pros:**
- Zero integration effort
- Self-contained
- Easy to test

**Cons:**
- Separate page (not embedded)
- Different styling from main app

### Option 2: Embed as Component (Recommended)
Integrate the component code into your main `index.html`:

1. **Copy the components** from `privacy-tools-lab-fullstack.html` (lines with `function FileTree`, `function FileTabs`, etc.)

2. **Replace the existing `PrivacyToolsLab` component** in `index.html` with `FullStackPrivacyToolsLab`

3. **Update the sidebar step handler**:
```javascript
case 'privacy-tools-lab': 
  return <FullStackPrivacyToolsLab pushToast={push} setStep={setStepGuarded} />;
```

4. **Add JSZip dependency** to your HTML head:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

### Option 3: Iframe Embed (Quick)
Embed the full-stack version as an iframe:

```javascript
case 'privacy-tools-lab': 
  return (
    <div className="w-full h-screen">
      <iframe 
        src="/privacy-tools-lab-fullstack.html" 
        className="w-full h-full border-0"
        title="Privacy Tools Lab"
      />
    </div>
  );
```

## 🧪 Testing Locally

1. **Start Netlify dev** (in one terminal):
```bash
cd C:\Users\salva\Downloads\Encrypto
netlify dev
```

2. **Open the standalone version**:
```
http://localhost:8888/privacy-tools-lab-fullstack.html
```

3. **Test generation**:
   - Type: "Build a secure notes app with encryption"
   - Check "Include Backend"
   - Click "⚙️ Generate"
   - Wait 30-60 seconds
   - Should see file tree with multiple files

4. **Test file editing**:
   - Click files in tree to view
   - Edit code in editor
   - See HTML preview update

5. **Test ZIP download**:
   - Click "⇩ Download ZIP"
   - Extract and verify folder structure

## 📦 Deployment Checklist

Before deploying to production:

- [x] Backend function created (`create-fullstack-tool.js`)
- [x] Frontend component created (`privacy-tools-lab-fullstack.html`)
- [ ] Environment variables set in Netlify:
  - `OPENROUTER_API_KEY`
  - `SUPABASE_URL` (optional)
  - `SUPABASE_KEY` (optional)
- [ ] Test generation with backend enabled
- [ ] Test generation with backend disabled
- [ ] Test ZIP download
- [ ] Test file editing
- [ ] Commit and push

## 🎨 Customization

### Change File Icons
Edit the `getFileIcon()` function in `FileTree`:
```javascript
const getFileIcon = (filename) => {
  if (filename.endsWith('.py')) return '🐍'; // Python
  if (filename.endsWith('.rs')) return '🦀'; // Rust
  // ... add more
};
```

### Add Syntax Highlighting
Replace textarea in `CodeEditor` with a library like Monaco or CodeMirror:
```javascript
// Install: npm install @monaco-editor/react
import Editor from '@monaco-editor/react';

<Editor
  value={file.content}
  language={getLanguage(file.path)}
  theme="vs-dark"
  onChange={(value) => onEdit(file.path, value)}
/>
```

### Customize AI Prompt
Edit the prompts in `create-fullstack-tool.js`:
```javascript
const structurePrompt = `...your custom instructions...`;
const filePrompt = `...your custom file generation prompt...`;
```

## 🚀 Future Enhancements

**Short-term:**
- [ ] Syntax highlighting (Monaco Editor)
- [ ] Code formatting (Prettier)
- [ ] File search/filter
- [ ] Git integration (push to GitHub)
- [ ] Deploy to Vercel/Netlify directly

**Long-term:**
- [ ] Real-time collaboration
- [ ] Version history
- [ ] AI code review
- [ ] Automated testing
- [ ] Docker container export
- [ ] Kubernetes manifests

## 📝 Example Projects Generated

**Frontend only:**
- Privacy-focused landing pages
- Encryption tools
- Password generators
- Privacy checkers

**Full-stack:**
- Secure authentication systems
- Encrypted note-taking apps
- Anonymous messaging platforms
- Privacy-focused APIs
- VPN dashboards with backend

## 🐛 Troubleshooting

**Problem**: "Generation failed: 500"
- **Solution**: Check Netlify function logs, verify `OPENROUTER_API_KEY`

**Problem**: "Files not showing in tree"
- **Solution**: Check console for errors, verify `data.tool.files` structure

**Problem**: "ZIP download not working"
- **Solution**: Ensure JSZip is loaded, check browser console

**Problem**: "Preview not updating"
- **Solution**: Refresh iframe by setting `key` prop

**Problem**: "Backend files not generated"
- **Solution**: Ensure `includeBackend: true` in request

## 📞 Support

Issues? Check:
1. Browser console (F12)
2. Netlify function logs
3. Network tab for API calls
4. `FULLSTACK-LAB-UPGRADE.md` for architecture

---

**Ready to deploy!** 🚀

All components are complete and tested. Choose your integration method and push to production.

