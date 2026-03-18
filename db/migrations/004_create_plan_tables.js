/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE plan_drafts (
      id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
      section_id UUID      NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      plan_json  JSONB     NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE INDEX plan_drafts_section_created_idx ON plan_drafts(section_id, created_at);
  `);
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS plan_drafts;
  `);
};
