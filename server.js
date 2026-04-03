const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment Variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://developmentunfazed_db_user:XI80GQyuLlp2vGDA@n8n.opfxf8q.mongodb.net';
const DB_NAME = process.env.DB_NAME || 'leadgen_apollo';
const COLLECTION = process.env.COLLECTION || 'leadgen_apollo';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://n8n.cognigenai.in/webhook/c9580b80-a5c1-4110-94e1-61128aabac22';

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('MongoDB connected');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await db
      .collection(COLLECTION)
      .find({})
      .sort({ sourced_at: -1 })
      .toArray();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/today', async (req, res) => {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const leads = await db
      .collection(COLLECTION)
      .find({ sourced_at: { $gte: start.toISOString(), $lte: end.toISOString() } })
      .sort({ sourced_at: -1 })
      .toArray();

    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/source-leads', async (req, res) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    // n8n webhooks might return success but no body
    if (response.ok) {
      res.json({ success: true });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText || 'Webhook failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
