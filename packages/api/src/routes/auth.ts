import { Router } from 'express';
import { register, login, refreshSession, revokeSession, getCurrentUser } from '@pulse/auth';
import { requireAuth } from '../middleware/auth';

export const authRouter: Router = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const ip = req.ip || null;
    const userAgent = req.headers['user-agent'] || null;
    
    const result = await register(email, password, name, ip, userAgent);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await login(email, password, ip, userAgent);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const session = await refreshSession(refreshToken);
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await revokeSession(sessionId);
    }
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await getCurrentUser(userId);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});
