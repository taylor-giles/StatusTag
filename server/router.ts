import * as express from 'express';
import * as Controller from './controller';
import multer from 'multer';

const router = express.Router();

router.get("/device", Controller.authenticate, Controller.ensureId, Controller.getDeviceDetails);
router.get("/devices", Controller.authenticate, Controller.getUserDevices);
router.get("/images", Controller.authenticate, Controller.getUserImages);
router.post("/setImage", Controller.authenticate, Controller.setDeviceImage);
router.post("/addImage", Controller.authenticate, multer().single('image'), Controller.addNewImage);
router.post("/registerDevice", Controller.authenticate, Controller.registerDevice);
router.post("/login", Controller.loginUser);
router.post("/signup", Controller.signUpUser);

export {router};