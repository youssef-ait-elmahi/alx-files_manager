const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime-types");
const dbClient = require("../utils/db");
const redisClient = require("../utils/redis");
const Queue = require("bull");
const fileQueue = new Queue("fileQueue");

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    if (!type || !["folder", "file", "image"].includes(type)) {
      return res.status(400).json({ error: "Missing type" });
    }

    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.getFileById(parentId);
      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" });
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" });
      }
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === "folder") {
      const newFile = await dbClient.createFile(fileData);
      return res.status(201).json(newFile);
    } else {
      const folderPath = process.env.FOLDER_PATH || "/tmp/files_manager";
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localPath = path.join(folderPath, uuidv4());
      fs.writeFileSync(localPath, Buffer.from(data, "base64"));

      fileData.localPath = localPath;
      const newFile = await dbClient.createFile(fileData);
      return res.status(201).json(newFile);
    }
  }
  static async getShow(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fileId = req.params.id;
    const file = await dbClient.getFileByIdAndUserId(fileId, userId);

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parentId = req.query.parentId || "0";
    const page = parseInt(req.query.page, 10) || 0;
    const filesPerPage = 20;

    const files = await dbClient.getFilesByParentIdAndUserId(
      parentId,
      userId,
      page,
      filesPerPage
    );

    return res.status(200).json(files);
  }
  static async putPublish(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fileId = req.params.id;
    const file = await dbClient.getFileByIdAndUserId(fileId, userId);

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    const updatedFile = await dbClient.updateFilePublicStatus(fileId, true);
    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fileId = req.params.id;
    const file = await dbClient.getFileByIdAndUserId(fileId, userId);

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    const updatedFile = await dbClient.updateFilePublicStatus(fileId, false);
    return res.status(200).json(updatedFile);
  }
  static async getFile(req, res) {
    const fileId = req.params.id;
    const token = req.headers["x-token"];
    let userId;

    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }

    const file = await dbClient.getFileById(fileId);

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    if (!file.isPublic && (!userId || userId !== file.userId)) {
      return res.status(404).json({ error: "Not found" });
    }

    if (file.type === "folder") {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: "Not found" });
    }

    const mimeType = mime.lookup(file.name) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    fs.createReadStream(file.localPath).pipe(res);
  }
}

module.exports = FilesController;
