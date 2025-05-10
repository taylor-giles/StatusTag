import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '$lib/types';

export async function POST({ request }: { request: Request }) {
	const { username, password } = await request.json();

	// Check if username already exists
	const userExists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username) as User;
	if (userExists) {
		return json({ error: 'Username already taken' }, { status: 400 });
	}

	// Hash the password
	const passwordHash = await bcrypt.hash(password, 10);

	// Insert the new user
	db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

	// Generate a session token
	const token = uuidv4();
	db.prepare('INSERT INTO sessions (token, username) VALUES (?, ?)').run(token, username);

	return json({ token });
}