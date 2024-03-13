const Queue = require("bull");
const imageThumbnail = require("image-thumbnail");
const dbClient = require("./utils/db");
const fs = require("fs");
const path = require("path");

const fileQueue = new Queue("fileQueue");

fileQueue.process(async (job) => {
  if (!job.data.fileId || !job.data.userId) {
    throw new Error("Missing fileId or userId");
  }

  const file = await dbClient.getFileByIdAndUserId(
    job.data.fileId,
    job.data.userId
  );
  if (!file) {
    throw new Error("File not found");
  }

  const sizes = [500, 250, 100];
  sizes.forEach(async (size) => {
    const thumbnail = await imageThumbnail(
      { uri: file.localPath },
      { width: size }
    );
    const thumbnailPath = `${file.localPath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  });
});

// Start the worker
fileQueue.on("completed", (job, result) => {
  console.log(`Job completed with result ${result}`);
});
