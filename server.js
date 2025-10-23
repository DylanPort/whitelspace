const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static('.'));

// Route for the howto page
app.get('/howto', (req, res) => {
    res.sendFile(path.join(__dirname, 'howto.html'));
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📖 How It Works page: http://localhost:${PORT}/howto`);
    console.log(`🏠 Main app: http://localhost:${PORT}`);
});