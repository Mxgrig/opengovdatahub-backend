const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello Railway!', 
    status: 'working',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    message: 'Super simple server is running'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});