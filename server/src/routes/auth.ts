import { Router } from 'express';
import { db } from '../db';
import { hashPassword, comparePassword, generateToken, authenticate, AuthRequest } from '../auth';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password is too long' });
    }

    if (username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: 'Username must be between 3 and 32 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existing = await db.findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser(username, passwordHash);
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || password.length > 128) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
