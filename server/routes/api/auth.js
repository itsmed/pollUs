'use strict';

const express = require('express');
const pool = require('../../db');

const router = express.Router();

// POST /api/auth/logout — clears the session cookie
router.post('/logout', (req, res) => {
  res.clearCookie('pollus_user_id');
  res.json({ ok: true });
});

// GET /api/auth/me — returns the current user
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// PATCH /api/auth/me — update address or preferences
router.patch('/me', async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { address, preferences } = req.body;
  // Use explicit key presence to distinguish "omitted" from "set to null"
  const hasAddress = Object.prototype.hasOwnProperty.call(req.body, 'address');
  const hasPreferences = Object.prototype.hasOwnProperty.call(req.body, 'preferences');
  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET address     = CASE WHEN $1 THEN $2::text    ELSE address     END,
              preferences = CASE WHEN $3 THEN $4::jsonb   ELSE preferences END
        WHERE id = $5
    RETURNING id, name, email, address, preferences`,
      [hasAddress, address ?? null, hasPreferences, preferences ? JSON.stringify(preferences) : null, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me/saved-members
router.get('/me/saved-members', async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT m.* FROM members m
         JOIN user_saved_members usm ON usm.member_id = m.id
        WHERE usm.user_id = $1
        ORDER BY m.name`,
      [req.user.id]
    );
    res.json({ members: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/me/saved-members/:memberId
router.post('/me/saved-members/:memberId', async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    await pool.query(
      `INSERT INTO user_saved_members (user_id, member_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.memberId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me/saved-members/:memberId
router.delete('/me/saved-members/:memberId', async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    await pool.query(
      'DELETE FROM user_saved_members WHERE user_id = $1 AND member_id = $2',
      [req.user.id, req.params.memberId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
