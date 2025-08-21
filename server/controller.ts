import { NextFunction, Request, Response } from "express";
import { generateSessionToken, getUserIdFromToken, hashPassword, verifyPassword } from "./auth";
import db, { createUser, getDevicesForUser, getUserByUsername } from "./db";
import { User } from "../shared/types";

type AuthenticatedRequest = Request & { userId?: string };

export async function validateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction){
    const cookieHeader = req.headers.cookie;
	if (cookieHeader) {
		const match = cookieHeader.match(/(?:^|; )authToken=([^;]*)/);
		if (match) {
			const token = decodeURIComponent(match[1]);
            let userId = getUserIdFromToken(token);
            if(!userId){
                return res.status(500).json("User ID not found");
            }
            req.userId = userId;
            return next();
		}
	}
	return res.status(401).json("User is not authenticated");
}


/**
 * POST /signup
 * Registers a new user with the provided credentials
 * 
 * Request Body:
 *  - username: string - Username for new user
 *  - password: string - Password for new user
 * 
 * Response Body:
 *  - On Success: Session token as a string
 *  - On Failure: Error message as a string
 */
export async function signUpUser(req: Request, res: Response){
	const { username, password } = req?.body;

	// Check if username already exists
	const userExists = getUserByUsername(username) as User;
	if (userExists) {
		return res.status(400).json('Username already taken');
	}

	// Hash the password and save the user
	const passwordHash = await hashPassword(password);
	createUser(username, passwordHash);

	// Generate a session token
	const token = generateSessionToken(username);
	return res.status(200).json(token);
}


/**
 * POST /login
 * Logs in the user matching the provided credentials
 * 
 * Request Body:
 *  - username: string - Username
 *  - password: string - Password
 * 
 * Response Body:
 *  - On Success: Session token as a string
 *  - On Failure: Error message as a string
 */
export async function loginUser(req: Request, res: Response){
	const { username, password } = req?.body;

	// Check if the user exists
	const user = getUserByUsername(username) as User;
	if (!user) {
		return res.status(401).json('Invalid credentials');
	}

	// Verify the password
	const validPassword = await verifyPassword(password, user.password_hash);
	if (!validPassword) {
		return res.status(401).json('Invalid credentials');
	}

	// Generate a session token
	const token = generateSessionToken(username);
	return res.status(200).json(token);
}

/**
 * GET /devices
 * Returns the list of devices registered to the authenticated user
 * 
 * Response Body:
 * 	- List of devices registered to this user
 */
export async function getUserDevices(req: AuthenticatedRequest, res: Response){
	return res.status(200).json(getDevicesForUser(req.userId!))
}


/**
 * GET /deviceUsers
 * Returns the list of users associated with this device
 * 
 * Request Params:
 *  - deviceId: string - The ID of the device to query for
 * 
 * Response Body:
 *  - On Success: List of users who have the given device registered
 *  - On Failure:
 *      - error: String - error message
 */
// export async function getUsersForDevice(req: AuthenticatedRequest, res: Response){
//     const userId = req.userId;
//     const deviceId = req.params.deviceId;
//     if(!deviceId){
//         return res.status(400).json({error: "Device ID is required"});
//     }

//     // Check if the device is registered to the user
// 	const device = db.prepare(
// 		'SELECT 1 FROM devices WHERE id = ? AND id IN (SELECT device_id FROM user_devices WHERE user_id = ?)'
// 	).get(deviceId, userId);

// 	if (!device) {
// 		return res.status(200).json({ error: 'Device not found' });
// 	}

// 	// Get the list of users who have the device registered
// 	const users = db.prepare(
// 		'SELECT u.username FROM users u JOIN user_devices ud ON u.username = ud.user_id WHERE ud.device_id = ?'
// 	).all(deviceId);

// 	return res.status(200).json(users);
// }