const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://bookshare-c1817.web.app",
      "https://bookhaven1.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyTokenFirst = async (req, res, next) => {
  const token = req?.cookies?.token;
  //   console.log('token in m',token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "access forbidden" });
    }
    req.user = decoded;
    console.log("jjj", req.user.email);
    next();
  });
  // next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vkpbftc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //  await client.connect();

    const bookCollection = client.db("bookHaven").collection("books");
    const bookingCollection = client.db("bookHaven").collection("bookings");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      // const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/allBooks", async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });

    app.get("/books", verifyTokenFirst, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { book_provider_email: req.query.email };
      }

      const cursor = bookCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    app.post("/books", async (req, res) => {
      const bookData = req.body;
      const result = await bookCollection.insertOne(bookData);
      res.send(result);
    });

    app.put("/books/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedProduct = req.body;
      // console.log(updatedProduct);
      const updated = {
        $set: {
          book_name: updatedProduct.book_name,
          book_image: updatedProduct.book_image,
          description: updatedProduct.description,
          phone: updatedProduct.phone,
          location: updatedProduct.location,
        },
      };

      const result = await bookCollection.updateOne(filter, updated, options);
      res.send(result);
    });

    app.delete("/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/bookings", verifyTokenFirst, async (req, res) => {
      // console.log(req.cookies);
      // console.log(req.user.email);
      // console.log("cook cook", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden" });
      }

      let query = {};
      if (req.query?.email) {
        query = { user_email: req.query.email };
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.put("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateStatus = req.body;
      // console.log(updateStatus);
      const updated = {
        $set: {
          status: updateStatus.newStatus,
        },
      };
      const result = await bookingCollection.updateOne(
        filter,
        updated,
        options
      );
      res.send(result);
    });

    app.get("/works", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { book_provider_email: req.query.email };
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SERVER IS RUNNING");
});

app.listen(port, () => {
  console.log(`CRUD RUNNING ON PORT ${port}`);
});
