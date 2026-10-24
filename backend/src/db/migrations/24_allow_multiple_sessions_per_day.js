/**
 * Migration 24 — Allow a doctor to open a new session after closing one
 *
 * The original UNIQUE (doctor_id, session_date) constraint counted CLOSED
 * sessions too, so once a doctor closed today's session they could never
 * open another one the same day (Postgres 23505 → "session already exists").
 *
 * Replace it with a partial unique index: at most ONE active ('open' or
 * 'break') session per doctor per day. Closed sessions no longer block.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_sessions
      DROP CONSTRAINT IF EXISTS unique_doctor_session_per_day;

    CREATE UNIQUE INDEX IF NOT EXISTS unique_active_doctor_session_per_day
      ON queue_sessions (doctor_id, session_date)
      WHERE status <> 'closed';
  `);
};

export const down = (pgm) => {
  // NOTE: this will fail if a doctor already has more than one session on
  // the same date. Remove the extra rows first if you need to roll back.
  pgm.sql(`
    DROP INDEX IF EXISTS unique_active_doctor_session_per_day;

    ALTER TABLE queue_sessions
      ADD CONSTRAINT unique_doctor_session_per_day
      UNIQUE (doctor_id, session_date);
  `);
};
