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
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "unauthorized access" });
    } else {
      req.decodedUser = decoded;
      // console.log("jjj", req.decodedUser.email);
      next();
    }
  });
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
      try {
        const userEmail = req.body;
        // console.log("user for token", userEmail);
        const getToken = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        res
          .cookie("token", getToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
          })
          .send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/logout", async (req, res) => {
      try {
        // const user = req.body;
        // console.log(user);
        res.clearCookie("token", { maxAge: 0 }).send({ success: true });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/allBooks", async (req, res) => {
      try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skipIndex = (page - 1) * limit;

        const cursor = bookCollection.find().skip(skipIndex).limit(limit);
        const result = await cursor.toArray();
        const totalBooks = await bookCollection.countDocuments();
        res.send({ totalBooks, result });
      } catch (err) {
        console.log(err);
      }
    });

    // only token verification to show a user booking to him
    // also to others in Others Booking of this user page
    app.get("/myBooks", verifyTokenFirst, async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { book_provider_email: req.query.email };
        }
        const result = await bookCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/book/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/bookings", verifyTokenFirst, async (req, res) => {
      try {
        // console.log(req.cookies);
        // console.log(req.decodedUser.email);
        if (req.decodedUser.email !== req.query.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { user_email: req.query.email };
        }

        const cursor = bookingCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/pending", verifyTokenFirst, async (req, res) => {
      try {
        if (req.decodedUser.email !== req.query.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { book_provider_email: req.query.email };
        }

        const cursor = bookingCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/books", async (req, res) => {
      try {
        const bookData = req.body;
        const result = await bookCollection.insertOne(bookData);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/bookings", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/books/:id", async (req, res) => {
      try {
        const getParamsId = req.params.id;
        const filter = { _id: new ObjectId(getParamsId) };
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
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/bookings/:id", async (req, res) => {
      try {
        const getParamsId = req.params.id;
        const filter = { _id: new ObjectId(getParamsId) };
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
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/books/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // for admin get all bookings with token
    app.get("/allBookings", verifyTokenFirst, async (req, res) => {
      try {
        if (req.decodedUser.email !== req.query.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        if (req.query.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }

        const result = await bookingCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/allBookings", async (req, res) => {
      try {
        const result = await bookingCollection.deleteMany();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    // for admin get all bookings with token end

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
