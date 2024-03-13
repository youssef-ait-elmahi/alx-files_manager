const dbClient = require("../utils/db");
const redisClient = require("../utils/redis");

class UserController {
  static async getMe(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await dbClient.findUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UserController;
