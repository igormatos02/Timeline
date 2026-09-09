import { Router } from 'express';
import { authService } from '../../../application/services/AuthService.js';

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

// POST /api/auth/google
authRouter.post('/google', async (req, res) => {
  try {
    const { googleId, google_id, email, name, avatarUrl, avatar_url } = req.body;
    const gId = googleId || google_id;
    const user = await authService.loginOrRegisterWithGoogle({
      googleId: gId,
      email,
      name,
      avatarUrl: avatarUrl || avatar_url
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
