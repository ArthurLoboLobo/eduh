/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE sections DROP COLUMN description;
  `);
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE sections ADD COLUMN description TEXT;
  `);
};
