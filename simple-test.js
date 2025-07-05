// Ultra-simple test server for Railway debugging
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Simple test server working!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Basic server running on Railway'
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

module.exports = app;