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
	screen_length INTEGER NOT NULL,
	screen_height INTEGER NOT NULL,
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
console.log('Database initialized.');

// User-related DB functions
export function getUserByUsername(username: string) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}
export function createUser(username: string, password_hash: string) {
    return db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);
}

// Device-related DB functions
export function getDevicesForUser(userId: string) {
    return db.prepare(`
        SELECT d.* 
        FROM devices d
        JOIN user_devices ud ON d.id = ud.device_id
        WHERE ud.user_id = ?
    `).all(userId);
}
export function deviceExists(deviceId: string) {
    return db.prepare('SELECT 1 FROM devices WHERE id = ?').get(deviceId);
}
export function insertDevice(deviceId: string, screen_length: number, screen_height: number) {
	if (!deviceExists(deviceId)) {
    	return db.prepare('INSERT INTO devices (id, active_image, screen_length, screen_height) VALUES (?, NULL, ?, ?)')
        	.run(deviceId, screen_length, screen_height);
	}
}
export function registerDevice(userId: string, deviceId: string) {
	if(deviceExists(deviceId)){
		return db.prepare('INSERT OR IGNORE INTO user_devices (user_id, device_id) VALUES (?, ?)').run(userId, deviceId);
	} else {
		return null;
	}
    
}
export function getDeviceForUser(deviceId: string, userId: string) {
    return db.prepare('SELECT * FROM devices WHERE id = ? AND id IN (SELECT device_id FROM user_devices WHERE user_id = ?)')
        .get(deviceId, userId);
}
export function getActiveImageForDevice(deviceId: string) {
    const row = db.prepare('SELECT images.id as image_id, images.image_data FROM devices JOIN images ON devices.active_image = images.id WHERE devices.id = ?').get(deviceId) as { image_id?: number, image_data?: Buffer } | undefined;
    return row && row.image_id && row.image_data ? { id: row.image_id, data: row.image_data } : null;
}
export function setActiveImageForUserDevice(deviceId: string, imageId: string, userId: string){
	return db.prepare(
		'UPDATE devices SET active_image = ? WHERE id = ? AND id IN (SELECT device_id FROM user_devices WHERE user_id = ?)'
	).run(imageId, deviceId, userId).changes > 0;
}

// Image-related DB functions
export function getImagesForUser(userId: string) {
    return db.prepare('SELECT * FROM images WHERE user_id = ?').all(userId);
}
export function insertImage(userId: string, imageBuffer: Buffer) {
    return db.prepare('INSERT INTO images (user_id, image_data) VALUES (?, ?)').run(userId, imageBuffer);
}
export function getImageByIdForUser(imageId: string, userId: string) {
    return db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(imageId, userId);
}

export default db;