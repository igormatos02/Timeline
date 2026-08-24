import express from 'express';
import cors from 'cors';
import { timeboardsRouter } from './routes/timeboardsRoutes.js';
import { timelinesRouter } from './routes/timelinesRoutes.js';
import { eventsRouter } from './routes/eventsRoutes.js';
import { loansRouter } from './routes/loansRoutes.js';
import { runSeed } from './scripts/seedData.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/timeboards', timeboardsRouter);
app.use('/api/timelines', timelinesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/loans', loansRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auto-seed if db files don't exist
async function ensureDatabase() {
  const dbFile = path.resolve(__dirname, 'data/db/timelines.json');
  try {
    await fs.access(dbFile);
  } catch {
    console.log('Database files not found. Initializing seed...');
    await runSeed();
  }
}

ensureDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Chrono Timeline Backend Server running on http://localhost:${PORT}`);
    console.log(`📁 Data Store: server/data/db/*.json`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
});
