import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { hashPassword, generateSessionToken } from '$lib/server/auth';
import type { User } from '$lib/types';

export async function POST({ request }: { request: Request }) {
	const { username, password } = await request.json();

	// Check if username already exists
	const userExists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username) as User;
	if (userExists) {
		return json({ error: 'Username already taken' }, { status: 400 });
	}

	// Hash the password and save the user
	const passwordHash = await hashPassword(password);
	db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

	// Generate a session token
	const token = generateSessionToken(username);

	return json({ token });
}