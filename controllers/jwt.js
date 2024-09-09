const jwt = require("jsonwebtoken");
const client = require("../config/db");

const addJwt = async (req, res) => {
  try {
    const userEmail = req?.body;
    // console.log("user for token", userEmail);
    const getToken = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
      expiresIn: "5d",
    });
    res
      .cookie("token", getToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({ success: true });
  } catch (err) {
    console.log(err);
  }
};

const getLogout = async (req, res) => {
  try {
    // const user = req.body;
    // console.log(user);
    res
      .clearCookie("token", {
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({ success: true });
  } catch (err) {
    console.log(err);
  }
};

module.exports = { addJwt, getLogout };
