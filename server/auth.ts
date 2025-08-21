import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

/**
 * Hashes a password using bcrypt.
 * @param password - The plain text password.
 * @returns The hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

/**
 * Verifies a password against a hashed password.
 * @param password - The plain text password.
 * @param hash - The hashed password.
 * @returns True if the password matches, false otherwise.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

/**
 * Generates a new session token and saves it to the database.
 * @param username - The username for the session.
 * @returns The generated token.
 */
export function generateSessionToken(username: string): string {
	const token = uuidv4();
	db.prepare('INSERT INTO sessions (token, username) VALUES (?, ?)').run(token, username);
	return token;
}

/**
 * Retrieves the user ID (username) associated with a session token.
 * @param token - The session token.
 * @returns The username if the token is valid, otherwise null.
 */
export function getUserIdFromToken(token: string): string | null {
	const session = db.prepare('SELECT username FROM sessions WHERE token = ?').get(token) as { username: string } | undefined;
	return session ? session.username : null;
}

/**
 * Validates the request by extracting and verifying the token from the authToken cookie.
 * @param request - The incoming HTTP request.
 * @returns The userId if the token is valid, otherwise null.
 */
export function validateRequest(request: Request): string | null {
	const cookieHeader = request.headers.get('cookie');
	if (cookieHeader) {
		const match = cookieHeader.match(/(?:^|; )authToken=([^;]*)/);
		if (match) {
			const token = decodeURIComponent(match[1]);
			return getUserIdFromToken(token);
		}
	}
	return null;
}