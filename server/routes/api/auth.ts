import express, { type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import AppleStrategy from 'passport-apple';
// eslint-disable-next-line n/no-missing-import
import pool from '../../db';

const router = express.Router();

const COOKIE_NAME = 'votr_user_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

async function findOrCreateUser({ email, name }: { email: string; name: string }): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [email, name]
  );
  return rows[0].id as number;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: `${process.env.API_URL ?? 'http://localhost:4000'}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Google'));
        const id = await findOrCreateUser({ email, name: profile.displayName });
        done(null, id as unknown as Express.User);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY,
      callbackURL: `${process.env.API_URL ?? 'http://localhost:4000'}/api/auth/apple/callback`,
      passReqToCallback: false,
    },
    async (_accessToken, _refreshToken, _idToken, profile, done) => {
      try {
        const email = profile.email;
        if (!email) return done(new Error('No email returned from Apple'));
        const name = profile.name
          ? `${profile.name.firstName ?? ''} ${profile.name.lastName ?? ''}`.trim()
          : email;
        const id = await findOrCreateUser({ email, name });
        done(null, id);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.serializeUser((id, done) => done(null, id));
passport.deserializeUser((id, done) => done(null, id as Express.User));

function oauthCallback(req: Request, res: Response, next: NextFunction, provider: string): void {
  passport.authenticate(provider, { session: false }, (err: Error | null, userId: number | false) => {
    if (err || !userId) {
      res.redirect(`${CLIENT_URL}/?auth_error=1`);
      return;
    }
    res.cookie(COOKIE_NAME, userId, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.redirect(`${CLIENT_URL}/profile`);
  })(req, res, next);
}

router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }));

router.get('/google/callback', (req, res, next) => oauthCallback(req, res, next, 'google'));

router.get('/apple', passport.authenticate('apple', { session: false }));

router.post('/apple/callback', (req, res, next) => oauthCallback(req, res, next, 'apple'));

router.post('/logout', (_req, res) => {
  res.clearCookie('votr_user_id');
  res.json({ ok: true });
});

// Dev-only: seed the dev user and set auth cookie (used by e2e tests)
router.post('/dev-login', async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    const id = await findOrCreateUser({ email: 'dev@local.dev', name: 'Dev User' });
    res.cookie(COOKIE_NAME, String(id), {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: false,
    });
    res.json({ ok: true, userId: id });
  } catch (error) {
    next(error);
  }
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.user });
});

router.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  const { address, preferences, senator_api_ids, congress_member_api_ids } = req.body as {
    address?: string;
    preferences?: Record<string, unknown>;
    senator_api_ids?: string[];
    congress_member_api_ids?: string[];
  };

  const hasAddress = Object.prototype.hasOwnProperty.call(req.body, 'address');
  const hasPreferences = Object.prototype.hasOwnProperty.call(req.body, 'preferences');
  const hasSenators = Array.isArray(senator_api_ids);
  const hasReps = Array.isArray(congress_member_api_ids);

  try {
    let senatorIds: number[] = req.user.senator_ids ?? [];
    let repIds: number[] = req.user.congress_member_ids ?? [];

    if (hasSenators) {
      if (senator_api_ids!.length === 0) {
        senatorIds = [];
      } else {
        const { rows } = await pool.query(
          'SELECT id FROM members WHERE api_id = ANY($1)',
          [senator_api_ids]
        );
        senatorIds = rows.map((r: { id: number }) => r.id);
      }
    }

    if (hasReps) {
      if (congress_member_api_ids!.length === 0) {
        repIds = [];
      } else {
        const { rows } = await pool.query(
          'SELECT id FROM members WHERE api_id = ANY($1)',
          [congress_member_api_ids]
        );
        repIds = rows.map((r: { id: number }) => r.id);
      }
    }

    const { rows } = await pool.query(
      `UPDATE users
          SET address             = CASE WHEN $1 THEN $2::text  ELSE address             END,
              preferences         = CASE WHEN $3 THEN $4::jsonb ELSE preferences         END,
              senator_ids         = $5,
              congress_member_ids = $6
        WHERE id = $7
    RETURNING id, name, email, address, preferences, senator_ids, congress_member_ids`,
      [
        hasAddress, address ?? null,
        hasPreferences, preferences ? JSON.stringify(preferences) : null,
        senatorIds, repIds, req.user.id,
      ]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/me/reps', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const senatorIds = req.user.senator_ids ?? [];
    const repIds = req.user.congress_member_ids ?? [];
    const allIds = [...senatorIds, ...repIds];

    if (allIds.length === 0) return res.json({ senators: [], representatives: [] });

    const { rows } = await pool.query(
      'SELECT * FROM members WHERE id = ANY($1) ORDER BY name',
      [allIds]
    );

    const senators = rows.filter((m: { id: number }) => senatorIds.includes(m.id));
    const representatives = rows.filter((m: { id: number }) => repIds.includes(m.id));

    res.json({ senators, representatives });
  } catch (error) {
    next(error);
  }
});

router.get('/me/saved-members', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { rows } = await pool.query(
      `SELECT m.* FROM members m
         JOIN user_saved_members usm ON usm.member_id = m.id
        WHERE usm.user_id = $1
        ORDER BY m.name`,
      [req.user.id]
    );
    res.json({ members: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/me/saved-members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    await pool.query(
      `INSERT INTO user_saved_members (user_id, member_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.memberId]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/me/saved-members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    await pool.query(
      'DELETE FROM user_saved_members WHERE user_id = $1 AND member_id = $2',
      [req.user.id, req.params.memberId]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
