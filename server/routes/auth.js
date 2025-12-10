const express = require('express');
const bcrypt = require('bcryptjs');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authenticateToken 
} = require('../middleware/auth');

function createAuthRoutes(pool) {
  const router = express.Router();

  // ========================================
  // Sign Up
  // ========================================
  router.post('/signup', async (req, res) => {
    try {
      const { email, username, password } = req.body;

      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if user already exists
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate user ID
      const userId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const now = Date.now();

      // Create user
      await pool.query(
        `INSERT INTO users (id, email, username, password_hash, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, email.toLowerCase(), username, passwordHash, now, now, now]
      );

      // Generate tokens
      const user = { id: userId, email: email.toLowerCase(), username };
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token in database
      const tokenExpiry = now + (7 * 24 * 60 * 60 * 1000); // 7 days
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [userId, refreshToken, tokenExpiry, now]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: userId,
          email: email.toLowerCase(),
          username
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // ========================================
  // Login
  // ========================================
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email.toLowerCase()]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login
      const now = Date.now();
      await pool.query(
        'UPDATE users SET last_login_at = ? WHERE id = ?',
        [now, user.id]
      );

      // Generate tokens
      const userPayload = { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      };
      const accessToken = generateAccessToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);

      // Store refresh token
      const tokenExpiry = now + (7 * 24 * 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [user.id, refreshToken, tokenExpiry, now]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ========================================
  // Refresh Token
  // ========================================
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Check if token exists and is not revoked
      const [tokens] = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = FALSE AND expires_at > ?',
        [refreshToken, Date.now()]
      );

      if (tokens.length === 0) {
        return res.status(403).json({ error: 'Refresh token expired or revoked' });
      }

      // Get user
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.status(403).json({ error: 'User not found' });
      }

      const user = users[0];
      const userPayload = { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      };

      // Generate new access token
      const newAccessToken = generateAccessToken(userPayload);

      res.json({
        accessToken: newAccessToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  // ========================================
  // Logout
  // ========================================
  router.post('/logout', authenticateToken, async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await pool.query(
          'UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?',
          [refreshToken]
        );
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // ========================================
  // Get Current User
  // ========================================
  router.get('/me', authenticateToken, async (req, res) => {
    try {
      const [users] = await pool.query(
        'SELECT id, email, username, created_at, last_login_at FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // ========================================
  // Update Profile
  // ========================================
  router.patch('/me', authenticateToken, async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const now = Date.now();
      await pool.query(
        'UPDATE users SET username = ?, updated_at = ? WHERE id = ?',
        [username, now, req.user.id]
      );

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ========================================
  // Change Password
  // ========================================
  router.post('/change-password', authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      // Get user
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      const now = Date.now();
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [newPasswordHash, now, req.user.id]
      );

      // Revoke all refresh tokens (force re-login on all devices)
      await pool.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
        [req.user.id]
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
