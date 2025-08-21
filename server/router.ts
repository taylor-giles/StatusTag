import * as express from 'express';
import * as Controller from './controller';
const router = express.Router();

router.get("/devices", Controller.validateRequest, Controller.getUserDevices);
router.post("/login", Controller.loginUser);
router.post("/signup", Controller.signUpUser);

export {router};