import pool from '../db';

interface GetVotesOptions {
  limit?: number;
  offset?: number;
  chamber?: string;
}

async function getVotes(
  { limit = 50, offset = 0, chamber }: GetVotesOptions = {}
): Promise<{ votes: unknown[]; total: number }> {
  const rowsParams = chamber ? [limit, offset, chamber] : [limit, offset];
  const rowsWhere  = chamber ? 'WHERE chamber = $3' : '';

  const countParams = chamber ? [chamber] : [];
  const countWhere  = chamber ? 'WHERE chamber = $1' : '';

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM congressional_votes
       ${rowsWhere}
       ORDER BY date DESC
       LIMIT $1 OFFSET $2`,
      rowsParams
    ),
    pool.query(
      `SELECT COUNT(*)::integer AS total FROM congressional_votes ${countWhere}`,
      countParams
    ),
  ]);

  return {
    votes: rowsResult.rows,
    total: (countResult.rows[0] as { total: number }).total,
  };
}

async function getVoteDetail(
  voteId: string,
  chamber?: string
): Promise<{
  vote: unknown;
  positions: Record<string, unknown[]>;
  prev_vote_id: string | null;
  next_vote_id: string | null;
} | null> {
  const voteResult = await pool.query(
    'SELECT * FROM congressional_votes WHERE vote_id = $1',
    [voteId]
  );

  if (voteResult.rows.length === 0) return null;

  const vote = voteResult.rows[0] as Record<string, unknown>;

  const chamberFilter = chamber ? `AND chamber = '${chamber === 'h' ? 'h' : 's'}'` : '';

  const [positionsResult, adjacentResult] = await Promise.all([
    pool.query(
      `SELECT position, legislator_id, display_name,
              first_name, last_name, party, state
       FROM vote_positions
       WHERE vote_id = $1
       ORDER BY position, last_name, display_name`,
      [vote.id]
    ),
    pool.query(
      `SELECT prev_vote_id, next_vote_id FROM (
         SELECT
           vote_id,
           LAG(vote_id)  OVER (ORDER BY date DESC) AS next_vote_id,
           LEAD(vote_id) OVER (ORDER BY date DESC) AS prev_vote_id
         FROM congressional_votes
         WHERE 1=1 ${chamberFilter}
       ) sub
       WHERE vote_id = $1`,
      [voteId]
    ),
  ]);

  const positions: Record<string, unknown[]> = {};
  for (const row of positionsResult.rows as Array<{ position: string } & Record<string, unknown>>) {
    const { position, ...legislator } = row;
    if (!positions[position]) positions[position] = [];
    positions[position].push(legislator);
  }

  const adjacent = (adjacentResult.rows[0] as Record<string, string | null> | undefined) ?? {};

  return {
    vote,
    positions,
    prev_vote_id: adjacent.prev_vote_id ?? null,
    next_vote_id: adjacent.next_vote_id ?? null,
  };
}

export { getVotes, getVoteDetail };
