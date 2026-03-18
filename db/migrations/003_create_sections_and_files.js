/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE sections (
      id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT      NOT NULL,
      description TEXT,
      status      TEXT      NOT NULL DEFAULT 'uploading',
      created_at  TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE INDEX sections_user_id_idx ON sections(user_id);

    CREATE TABLE files (
      id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
      section_id     UUID      NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      blob_url       TEXT      NOT NULL,
      original_name  TEXT      NOT NULL,
      file_type      TEXT      NOT NULL,
      size_bytes     INTEGER   NOT NULL,
      status         TEXT      NOT NULL DEFAULT 'uploading',
      extracted_text TEXT,
      created_at     TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE INDEX files_section_id_idx ON files(section_id);
  `);
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS sections;
  `);
};
