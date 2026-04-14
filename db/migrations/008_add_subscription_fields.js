/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    -- Step 1: User subscription fields
    ALTER TABLE users
      ADD COLUMN plan TEXT NOT NULL DEFAULT 'free',
      ADD COLUMN plan_expires_at TIMESTAMPTZ,
      ADD COLUMN balance INTEGER NOT NULL DEFAULT 0
        CHECK (balance >= 0);

    -- Step 2: Payments table
    CREATE TABLE payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      abacatepay_id TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      credits_to_debit INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_payments_user_id ON payments(user_id);
    CREATE INDEX idx_payments_abacatepay_id ON payments(abacatepay_id);
    CREATE UNIQUE INDEX idx_one_pending_payment ON payments(user_id) WHERE status = 'pending';

    -- Step 3: Daily usage table
    CREATE TABLE daily_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      weighted_tokens BIGINT NOT NULL DEFAULT 0,
      UNIQUE(user_id, usage_date)
    );
    CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
  `);
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS daily_usage;
    DROP TABLE IF EXISTS payments;
    ALTER TABLE users
      DROP COLUMN IF EXISTS balance,
      DROP COLUMN IF EXISTS plan_expires_at,
      DROP COLUMN IF EXISTS plan;
  `);
};
