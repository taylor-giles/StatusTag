import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data', 'app.db');
const db = new Database(dbPath);

// Initialize tables if they don't exist
const initScript = `
CREATE TABLE IF NOT EXISTS users (
	username TEXT PRIMARY KEY,
	password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
	id TEXT PRIMARY KEY,
	active_image INTEGER,
	FOREIGN KEY (active_image) REFERENCES images (id)
);

CREATE TABLE IF NOT EXISTS images (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT,
	image_data BLOB,
	FOREIGN KEY (user_id) REFERENCES users (username)
);

CREATE TABLE IF NOT EXISTS user_devices (
	user_id TEXT,
	device_id TEXT,
	PRIMARY KEY (user_id, device_id),
	FOREIGN KEY (user_id) REFERENCES users (username),
	FOREIGN KEY (device_id) REFERENCES devices (id)
);

CREATE TABLE IF NOT EXISTS sessions (
	token TEXT PRIMARY KEY,
	username TEXT,
	expiry TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (username) REFERENCES users (username)
);
`;

db.exec(initScript);
console.log('Database initialized and tables created if they did not exist.');

export default db;