import express from 'express';
import cors from 'cors';
import { timeboardsRouter } from './interfaces/http/routes/timeboardsRoutes.js';
import { timelinesRouter } from './interfaces/http/routes/timelinesRoutes.js';
import { eventsRouter } from './interfaces/http/routes/eventsRoutes.js';
import { loansRouter } from './interfaces/http/routes/loansRoutes.js';
import { personsRouter } from './interfaces/http/routes/personsRoutes.js';
import { authRouter } from './interfaces/http/routes/authRoutes.js';
import { todoRouter } from './interfaces/http/routes/todoRoutes.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/timeboards', timeboardsRouter);
app.use('/api/timelines', timelinesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/persons', personsRouter);
app.use('/api/todos', todoRouter);

// Dynamic version endpoint reading package.json on demand
app.get('/api/version', (req, res) => {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    const fs = req.app.get('fs') || import('node:fs');
    import('node:fs').then(({ readFileSync }) => {
      const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'));
      res.json({ version: pkg.version });
    }).catch(() => {
      res.json({ version: '0.1.3' });
    });
  } catch {
    res.json({ version: '0.1.3' });
  }
});

import { pingSupabase } from './infrastructure/database/supabase/supabaseHealthService.js';

// Health check endpoint with Supabase keep-alive ping
app.get('/api/health', async (req, res) => {
  const checkSupabase = req.query.skipDb !== 'true';
  let supabaseResult = null;

  if (checkSupabase) {
    supabaseResult = await pingSupabase();
  }

  const isHealthy = !supabaseResult || supabaseResult.success;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    supabase: supabaseResult
  });
});

// Dedicated lightweight ping endpoint for external cron jobs
app.get('/api/health/ping', async (req, res) => {
  const result = await pingSupabase();
  res.status(result.success ? 200 : 503).json(result);
});
