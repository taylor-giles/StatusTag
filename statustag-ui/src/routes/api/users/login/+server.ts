import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '$lib/types';

export async function POST({ request }: { request: Request }) {
	const { username, password } = await request.json();

	// Check if the user exists
	const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User;
	if (!user) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// Verify the password
	const validPassword = await bcrypt.compare(password, user.password_hash);
	if (!validPassword) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// Generate a session token
	const token = uuidv4();
	db.prepare('INSERT INTO sessions (token, username) VALUES (?, ?)').run(token, username);

	return json({ token });
}