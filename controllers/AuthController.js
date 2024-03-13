const redisClient = require("../utils/redis");
const dbClient = require("../utils/db");
const { v4: uuidv4 } = require("uuid");
const sha1 = require("sha1");

class AuthController {
  static async getConnect(req, res) {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const base64Credentials = authorizationHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "ascii"
    );
    const [email, password] = credentials.split(":");
    const hashedPassword = sha1(password);

    // Find user in the database
    const user = await dbClient.findUserByEmailAndPassword(
      email,
      hashedPassword
    );
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Generate token and store it in Redis
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

module.exports = AuthController;
