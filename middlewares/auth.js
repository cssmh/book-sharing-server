// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const client = require("../config/db");
const demoAdmin = process.env.DEMO_ADMIN;
const userCollection = client.db("bookHaven").collection("users");

const isToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "unauthorized access" });
    } else {
      req.decodedUser = decoded;
      next();
    }
  });
};

const isAdmin = async (req, res, next) => {
  const email = req.decodedUser.email;
  const user = await userCollection.findOne({ email });

  if (email === demoAdmin) {
    // Restrict the demo admin to read-only access
    req.demoAdmin = true;
    return next();
  }
  if (!user || user?.role !== "admin") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

module.exports = {
  isToken,
  isAdmin,
};
