# 🧪 Local Testing Guide - Privacy Tools Lab

## 🎯 Test Locally Before Deploying

This guide will help you test the Privacy Tools Lab on your local machine.

---

## 📋 Prerequisites

- Node.js installed (you already have this)
- Netlify CLI installed (we'll install if needed)
- OpenAI API key (or we can mock it for testing)
- Val.town API key (or we can mock it for testing)

---

## ⚡ Quick Start (2 Minutes)

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

Or if already installed:
```bash
netlify --version
```

---

### Step 2: Create Local Environment File

Create a `.env` file in your project root:

```bash
# Create .env file
echo "OPENAI_API_KEY=sk-test-mock-key-for-local-testing" > .env
echo "VALTOWN_API_KEY=vt-test-mock-key-for-local-testing" >> .env
echo "SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "SUPABASE_KEY=your-anon-key" >> .env
```

**Note:** For initial testing, you can use mock keys. Functions will fail but you can see the UI.

---

### Step 3: Start Local Dev Server

```bash
netlify dev
```

This will:
- ✅ Start local server on http://localhost:8888
- ✅ Enable Netlify Functions at `/.netlify/functions/*`
- ✅ Load environment variables from `.env`
- ✅ Hot reload on file changes

---

### Step 4: View Privacy Tools Section

Open your browser to: http://localhost:8888

Then navigate to the Privacy Tools section (or open `privacy-tools-section.html` directly).

---

## 🎨 Testing Without API Keys (UI Only)

If you don't have API keys yet, you can still test the UI:

### Create a Mock Test Page

Create `test-privacy-tools.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Tools Lab - Test</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-slate-900">
  
  <!-- Privacy Tools Section -->
  <div id="privacy-tools-section"></div>

  <!-- Include the component -->
  <script type="text/babel">
    // Mock API for local testing without backend
    const MOCK_MODE = true;
    
    const MOCK_TOOLS = [
      {
        id: '1',
        val_id: 'test-1',
        description: 'A secure password generator with entropy calculation and visual strength meter',
        category: 'Password',
        creator_wallet: 'MockWallet123...',
        url: 'https://example.com',
        code: '// Mock code',
        status: 'approved',
        upvotes: 45,
        downvotes: 2,
        views: 120,
        featured: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        val_id: 'test-2',
        description: 'Email address obfuscator that prevents scraping while keeping emails readable',
        category: 'Anonymous',
        creator_wallet: 'MockWallet456...',
        url: 'https://example.com',
        code: '// Mock code',
        status: 'approved',
        upvotes: 32,
        downvotes: 1,
        views: 98,
        featured: false,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        val_id: 'test-3',
        description: 'Client-side file encryption tool using AES-256-GCM with no data uploaded',
        category: 'Encryption',
        creator_wallet: 'MockWallet789...',
        url: 'https://example.com',
        code: '// Mock code',
        status: 'approved',
        upvotes: 28,
        downvotes: 0,
        views: 75,
        featured: false,
        created_at: new Date().toISOString()
      }
    ];

    // Paste your PrivacyToolsSection component here
    // (from privacy-tools-section.html)
    
    // For now, here's a simplified version that shows the UI works:
    const PrivacyToolsSection = () => {
      const [activeTab, setActiveTab] = React.useState('gallery');
      const [tools, setTools] = React.useState(MOCK_TOOLS);

      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-20">
          <div className="max-w-7xl mx-auto px-4">
            
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
                🛠️ Privacy Tools Lab (LOCAL TEST)
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                Testing the UI locally - API integration will work once deployed!
              </p>
              
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">{tools.length}</div>
                  <div className="text-sm text-gray-400">Mock Tools</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">$500</div>
                  <div className="text-sm text-gray-400">Monthly Prize</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">Free</div>
                  <div className="text-sm text-gray-400">No Code Needed</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'gallery'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                📚 Tool Gallery
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                ✨ Create Tool
              </button>
            </div>

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                  <div
                    key={tool.id}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 hover:border-cyan-400 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-slate-700 text-cyan-400 rounded-full text-sm">
                        {tool.category}
                      </span>
                      {tool.featured && (
                        <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-sm">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 mb-4">{tool.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <div className="flex gap-4">
                        <span>⬆️ {tool.upvotes}</span>
                        <span>⬇️ {tool.downvotes}</span>
                        <span>👁️ {tool.views}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-lg bg-slate-700 text-gray-400 hover:bg-slate-600 transition-all">
                        ⬆️ Upvote
                      </button>
                      <button className="flex-1 py-2 rounded-lg bg-slate-700 text-gray-400 hover:bg-slate-600 transition-all">
                        👁️ View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Tab */}
            {activeTab === 'create' && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
                  <h2 className="text-3xl font-bold text-white mb-6">
                    ✨ Create Your Privacy Tool with AI
                  </h2>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <p className="text-yellow-200 text-sm">
                      ⚠️ <strong>Local Test Mode:</strong> This is a UI demo. Once you add API keys and deploy, 
                      the AI will actually generate working tools!
                    </p>
                  </div>
                  <textarea
                    placeholder="Example: A password strength checker that shows entropy, suggests improvements, and displays visual feedback..."
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-cyan-400 focus:outline-none min-h-[150px] mb-4"
                  />
                  <button className="w-full py-4 bg-gradient-to-r from-green-500 to-cyan-500 text-white rounded-xl font-bold text-lg">
                    🚀 Create Tool with AI (Demo)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      );
    };

    // Render
    const root = ReactDOM.createRoot(document.getElementById('privacy-tools-section'));
    root.render(<PrivacyToolsSection />);
  </script>
</body>
</html>
```

Now open: http://localhost:8888/test-privacy-tools.html

---

## 🔑 Testing With Real API Keys

If you want to test the full AI functionality locally:

### 1. Get API Keys

**Quick Test Keys (Cheapest):**

**OpenAI:**
- Go to https://platform.openai.com/api-keys
- Create key
- Add just $5 credit (enough for 5-10 tools)

**Val.town:**
- Go to https://val.town
- Can use free tier for testing (limited to 10 vals)
- Or upgrade to Pro later

### 2. Update .env

```bash
# Real keys for testing
OPENAI_API_KEY=sk-proj-YOUR-REAL-KEY-HERE
VALTOWN_API_KEY=vt-YOUR-REAL-KEY-HERE
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 3. Run Supabase SQL

Before testing with real backend, run the SQL schema from `QUICK-START-PRIVACY-TOOLS.md` in your Supabase dashboard.

### 4. Test Full Flow

```bash
# Start server with real keys
netlify dev

# Open browser
open http://localhost:8888

# Try creating a tool:
1. Navigate to Privacy Tools section
2. Click "Create Tool"
3. Enter: "A simple password generator with copy button"
4. Click "Create Tool with AI"
5. Wait 30-60 seconds
6. Should see success message!
```

---

## 🧪 Test Scenarios

### Test 1: UI Only (No API)
✅ View gallery  
✅ See mock tools  
✅ Test navigation  
✅ Test responsive design  

### Test 2: With Mock Backend
✅ Test API endpoints with mock data  
✅ Test voting (no actual DB)  
✅ Test form validation  

### Test 3: Full Integration
✅ Create real tool with AI  
✅ Tool deploys to Val.town  
✅ Saves to Supabase  
✅ Appears in gallery  
✅ Voting works  

---

## 🎯 What to Test

### UI Tests:
- [ ] Privacy Tools section loads
- [ ] Tabs switch correctly
- [ ] Gallery displays tools
- [ ] Create form validates input
- [ ] Responsive on mobile
- [ ] Filters work
- [ ] Sort works
- [ ] Modal opens/closes

### API Tests (with real keys):
- [ ] Create tool succeeds
- [ ] Tool appears in Supabase
- [ ] Tool URL works (opens Val.town page)
- [ ] Voting increments count
- [ ] View count increments
- [ ] Filters return correct data

---

## 🐛 Common Local Testing Issues

### Port Already in Use
```bash
# Kill existing process
npx kill-port 8888

# Or use different port
netlify dev --port 9000
```

### Environment Variables Not Loading
```bash
# Check .env exists
cat .env

# Restart netlify dev
# Ctrl+C to stop, then:
netlify dev
```

### Functions Not Working
```bash
# Check functions directory
ls netlify/functions

# Test function directly
curl http://localhost:8888/.netlify/functions/get-privacy-tools
```

### Supabase Connection Error
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check Supabase project is active
- Run SQL schema if not already done

---

## 📊 Test Data

Want to add more mock tools for testing? Add to `MOCK_TOOLS` array:

```javascript
const MOCK_TOOLS = [
  {
    id: '4',
    description: 'Your new tool description',
    category: 'Encryption',
    upvotes: 15,
    downvotes: 1,
    views: 45,
    featured: false,
    // ... etc
  }
];
```

---

## 🎨 Try Creating a Test Website

Want to test the AI actually creating a tool? Here's what to describe:

**Easy Test Tool Ideas:**
1. "A random password generator with adjustable length and character types"
2. "A simple text encryptor using Caesar cipher for learning"
3. "A privacy-focused QR code generator that works offline"
4. "A secure note creator that encrypts text before copying to clipboard"
5. "A burner email generator that shows temporary email addresses"

**Try it:**
```
1. Start netlify dev
2. Go to Create Tool tab
3. Paste one of the ideas above
4. Click Create Tool with AI
5. Watch it generate!
```

---

## 🚀 When You're Ready to Deploy

Once local testing works:

```bash
# Stop local server (Ctrl+C)

# Add real API keys to Netlify (not just .env)
# Then commit and push:
git add .
git commit -m "Add Privacy Tools Lab"
git push origin main
```

---

## 💡 Pro Tips

**Speed up testing:**
- Use mock mode for UI changes (instant)
- Use real API only when testing full flow
- Keep Supabase dashboard open to see data

**Save costs:**
- Start with small OpenAI credit ($5)
- Use Val.town free tier for testing
- Upgrade only when ready to launch

**Debug faster:**
- Check browser console for errors
- Check Netlify function logs
- Use `console.log()` liberally

---

## 📞 Need Help?

**Check these first:**
- Browser console (F12)
- Terminal output (where `netlify dev` is running)
- Netlify function logs (in terminal)
- Supabase logs (dashboard)

**Common solutions:**
- Restart `netlify dev`
- Clear browser cache
- Check API keys are correct
- Verify Supabase SQL ran

---

## ✅ Ready to Test!

You now have everything you need to test locally:
1. ✅ Mock UI for quick testing
2. ✅ Full integration for real testing
3. ✅ Troubleshooting guide
4. ✅ Test scenarios

**Let's start with the simple test!** 🚀


