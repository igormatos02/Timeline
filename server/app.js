import express from 'express';
import cors from 'cors';
import { timeboardsRouter } from './interfaces/http/routes/timeboardsRoutes.js';
import { timelinesRouter } from './interfaces/http/routes/timelinesRoutes.js';
import { eventsRouter } from './interfaces/http/routes/eventsRoutes.js';
import { loansRouter } from './interfaces/http/routes/loansRoutes.js';
import { personsRouter } from './interfaces/http/routes/personsRoutes.js';
import { authRouter } from './interfaces/http/routes/authRoutes.js';
import { todoRouter } from './interfaces/http/routes/todoRoutes.js';
import { followupRouter } from './interfaces/http/routes/followupRoutes.js';
import { pocketRouter } from './interfaces/http/routes/pocketRoutes.js';
import { invitationsRouter } from './interfaces/http/routes/invitationsRoutes.js';
import { meRouter } from './interfaces/http/routes/meRoutes.js';
import { requireAuth } from './interfaces/http/middleware/requireAuth.js';
import { timeboardAccessFromRequest } from './interfaces/http/middleware/timeboardAccess.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Public routes: authentication and invitation code lookup (version / health below are public too)
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationsRouter);

// Protected routes: a valid session token, and access to the timeboard the request targets
const protectedRoute = [requireAuth, timeboardAccessFromRequest];
app.use('/api/me', requireAuth, meRouter);
app.use('/api/timeboards', protectedRoute, timeboardsRouter);
app.use('/api/timelines', protectedRoute, timelinesRouter);
app.use('/api/events', protectedRoute, eventsRouter);
app.use('/api/loans', protectedRoute, loansRouter);
app.use('/api/persons', protectedRoute, personsRouter);
app.use('/api/todos', protectedRoute, todoRouter);
app.use('/api/followups', protectedRoute, followupRouter);
app.use('/api/pockets', protectedRoute, pocketRouter);

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
