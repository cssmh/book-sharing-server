const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = 5000;
// const client = require("./config/db");
const router = require("./routes/bookRoutes");

app.use(
  cors({
    origin: [
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

// async function run() {
//   try {
//     await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. Successfully connected to MongoDB!");
//   } finally {
//     // await client.close();
//   }
// }
// run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Share Your Favorite Books");
});

app.listen(port, () => {
  console.log(`SERVER RUNNING ON PORT ${port}`);
});
