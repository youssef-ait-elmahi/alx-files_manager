const express = require("express");
const router = express.Router();
const AppController = require("../controllers/AppController");
const UserController = require("../controllers/UsersController");
import AuthController from "../controllers/AuthController";
const FilesController = require("../controllers/FilesController");

router.get("/files/:id/data", FilesController.getFile);
router.put("/files/:id/publish", FilesController.putPublish);
router.put("/files/:id/unpublish", FilesController.putUnpublish);
router.get("/files/:id", FilesController.getShow);
router.get("/files", FilesController.getIndex);
router.post("/files", FilesController.postUpload);
router.get("/connect", AuthController.getConnect);
router.get("/disconnect", AuthController.getDisconnect);
router.get("/users/me", UserController.getMe);
router.get("/status", AppController.getStatus);
router.get("/stats", AppController.getStats);

module.exports = router;
