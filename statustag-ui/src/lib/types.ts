export type User = {
	username: string;
	password_hash: string;
};

export type Device = {
	id: string;
	active_image: number | null;
};

export type Image = {
	id: number;
	user_id: string;
	image_data: Buffer;
};

export type UserDevice = {
	user_id: string;
	device_id: string;
};