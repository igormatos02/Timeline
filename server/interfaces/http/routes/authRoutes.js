import { Router } from 'express';
import { authService } from '../../../application/services/AuthService.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await authService.registerWithEmail({ name, email, password });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginWithEmail({ email, password });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/google  { accessToken } — Supabase session of a Google sign-in (web OAuth or native Android)
authRouter.post('/google', async (req, res) => {
  try {
    const { accessToken, access_token } = req.body;
    const user = await authService.loginWithSupabaseAccessToken(accessToken || access_token);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/auth/me — current user of the session token (used to restore the session)
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await authService.getSessionUser(req.user.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/account — deletes the logged-in user's account
authRouter.delete('/account', requireAuth, async (req, res) => {
  try {
    res.json(await authService.deleteAccount(req.user.id));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});
