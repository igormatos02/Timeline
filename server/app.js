import express from 'express';
import cors from 'cors';
import { timeboardsRouter } from './interfaces/http/routes/timeboardsRoutes.js';
import { timelinesRouter } from './interfaces/http/routes/timelinesRoutes.js';
import { eventsRouter } from './interfaces/http/routes/eventsRoutes.js';
import { loansRouter } from './interfaces/http/routes/loansRoutes.js';

export const app = express();

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
