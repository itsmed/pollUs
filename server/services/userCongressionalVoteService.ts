import pool from '../db';

interface HttpError extends Error {
  status: number;
}

async function upsertUserCongressionalVote(
  userId: number,
  voteId: string,
  position: string
): Promise<Record<string, unknown>> {
  const voteResult = await pool.query(
    'SELECT id FROM congressional_votes WHERE vote_id = $1',
    [voteId]
  );
  if (voteResult.rows.length === 0) {
    const err = Object.assign(new Error('Vote not found'), { status: 404 }) as HttpError;
    throw err;
  }

  const congressionalVoteId = voteResult.rows[0].id as number;

  const { rows } = await pool.query(
    `INSERT INTO user_congressional_votes (user_id, congressional_vote_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, congressional_vote_id) DO UPDATE
       SET position = EXCLUDED.position, updated_at = NOW()
     RETURNING *`,
    [userId, congressionalVoteId, position]
  );

  return rows[0] as Record<string, unknown>;
}

async function getUserCongressionalVote(
  userId: number,
  voteId: string
): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(
    `SELECT ucv.*
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
      WHERE ucv.user_id = $1 AND cv.vote_id = $2`,
    [userId, voteId]
  );
  return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export { upsertUserCongressionalVote, getUserCongressionalVote };
