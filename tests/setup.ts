import dotenv from 'dotenv';
import path from 'path';

// Load .env.test BEFORE any other imports that use process.env
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
