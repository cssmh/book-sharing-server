const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT;
const router = require("./routes/bookRoutes");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bookshare-c1817.web.app",
      "https://bookhaven1.netlify.app",
      "https://bookhaven.surge.sh",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(router);

app.get("/", (req, res) => {
  res.send("Share Your Favorite Books");
});

app.listen(port, () => {
  console.log(`SERVER RUNNING ON PORT ${port}`);
});
