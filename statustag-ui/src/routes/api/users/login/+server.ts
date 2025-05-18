import { json } from '@sveltejs/kit';
import { getUserByUsername } from '$lib/server/db';
import { verifyPassword, generateSessionToken } from '$lib/server/auth';
import type { User } from '$lib/types';

export async function POST({ request }: { request: Request }) {
	const { username, password } = await request.json();

	// Check if the user exists
	const user = getUserByUsername(username) as User;
	if (!user) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// Verify the password
	const validPassword = await verifyPassword(password, user.password_hash);
	if (!validPassword) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	// Generate a session token
	const token = generateSessionToken(username);

	return json({ token });
}