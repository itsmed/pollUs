'use strict';

const pool = require('../db');

const DEV_USER_EMAIL = 'dev@local.dev';
const COOKIE_NAME = 'votr_user_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * In development: auto-sets a cookie for the seeded dev user if none exists.
 * Attaches the user row to req.user on every request.
 * In production: reads the cookie and attaches req.user (real OAuth will set this cookie).
 */
async function authMiddleware(req, res, next) {
  try {
    let userId = req.cookies[COOKIE_NAME];

    if (!userId && process.env.NODE_ENV !== 'production') {
      // Auto-login as the dev user
      const { rows } = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [DEV_USER_EMAIL]
      );
      if (rows.length === 0) {
        // Migration hasn't run yet — skip silently
        return next();
      }
      userId = rows[0].id;
      res.cookie(COOKIE_NAME, userId, {
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }

    if (userId) {
      const { rows } = await pool.query(
        'SELECT id, name, email, address, preferences, senator_ids, congress_member_ids FROM users WHERE id = $1',
        [userId]
      );
      if (rows.length > 0) {
        req.user = rows[0];
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
