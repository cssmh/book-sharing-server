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
      "https://open-rest.surge.sh",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
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
    client.connect();

    const bookCollection = client.db("bookHaven").collection("books");
    const bookingCollection = client.db("bookHaven").collection("bookings");
    const usersCollection = client.db("bookHaven").collection("emails");

    app.post("/jwt", async (req, res) => {
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
    });

    app.post("/logout", async (req, res) => {
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
    });

    app.get("/all-books", async (req, res) => {
      try {
        const page = parseInt(req.query?.page);
        const limit = parseInt(req.query?.limit);
        const searchTerm = req.query?.search || "";
        const skipIndex = (page - 1) * limit;

        const query = {
          $or: [
            { book_name: { $regex: searchTerm, $options: "i" } },
            { provider_name: { $regex: searchTerm, $options: "i" } },
          ],
        };
        const totalBooks = (await bookCollection.countDocuments(query)) || 0;
        const totalPages = Math.ceil(totalBooks / limit) || 0;

        const cursor = bookCollection.find(query).skip(skipIndex).limit(limit);
        const result = await cursor.toArray();
        res.send({ totalPages, totalBooks, result });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/my-books", async (req, res) => {
      try {
        let query = {};
        if (req.query?.email) {
          query = { provider_email: req.query.email };
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

    app.get("/my-bookings", verifyToken, async (req, res) => {
      try {
        // console.log(req.cookies);
        if (req.decodedUser?.email !== req.query?.email) {
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

    app.get("/my-pending", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser.email !== req.query?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { provider_email: req.query.email };
        }
        const cursor = bookingCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/emails", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // used only in home page count component
    app.get("/total-bookings", async (req, res) => {
      try {
        const result = await bookingCollection.countDocuments();
        res.send({ result });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/unavailable-ids", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.query?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const query = {
          book_status: "Unavailable",
          provider_email: req.query?.email,
        };
        const options = {
          projection: { _id: 1 },
        };
        const cursor = bookCollection.find(query, options);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/user-analytics", verifyToken, async (req, res) => {
      try {
        const getUser = req.query?.email;
        let query = {};
        let queryBooking = {};
        if (getUser) {
          query = { provider_email: getUser };
          queryBooking = { user_email: getUser };
        }

        const myBooks = await bookCollection.countDocuments(query);
        const totalBooks = await bookCollection.countDocuments();
        const myBookings = await bookingCollection.countDocuments(queryBooking);
        const totalBooking = await bookingCollection.countDocuments();

        const myProgress = await bookingCollection.countDocuments({
          ...queryBooking,
          status: "Progress",
        });
        const myCompleted = await bookingCollection.countDocuments({
          ...queryBooking,
          status: "Completed",
        });

        res.send({
          totalBooks,
          myBooks,
          totalBooking,
          myBookings,
          myProgress,
          myCompleted,
        });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/book-providers", async (req, res) => {
      try {
        const pipeline = [
          {
            $group: {
              _id: "$provider_email",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              email: "$_id",
              count: 1,
              _id: 0,
            },
          },
          {
            $sort: { email: 1 },
            // Sorts by email in ascending order
          },
        ];
        const result = await bookCollection.aggregate(pipeline).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/monthly-stats", async (req, res) => {
      try {
        const userEmail = req.query?.email;
        const query = userEmail ? { provider_email: userEmail } : {};

        const allBooks = await bookCollection.find(query).toArray();

        const monthCounts = {};
        allBooks.forEach((book) => {
          const month = book.added_time.split(" ")[0];
          if (monthCounts[month]) {
            monthCounts[month]++;
          } else {
            monthCounts[month] = 1;
          }
        });

        const result = Object.keys(monthCounts).map((month) => ({
          month: month,
          count: monthCounts[month],
        }));

        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/book", async (req, res) => {
      try {
        const bookData = req.body;
        const result = await bookCollection.insertOne(bookData);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/add-booking", async (req, res) => {
      try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.post("/email", async (req, res) => {
      try {
        const email = req.body;
        const result = await usersCollection.insertOne(email);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/book/:id/:email", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const filter = { _id: new ObjectId(req.params?.id) };
        const options = { upsert: true };
        const updatedDocs = {
          $set: {
            book_name: req.body?.book_name,
            book_image: req.body?.book_image,
            provider_phone: req.body?.provider_phone,
            provider_location: req.body?.provider_location,
            description: req.body?.description,
          },
        };
        const result = await bookCollection.updateOne(
          filter,
          updatedDocs,
          options
        );
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // book status update (available or not)
    app.put("/book-status/:id/:email", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const filter = { _id: new ObjectId(req.params?.id) };
        const options = { upsert: true };
        const updated = {
          $set: {
            book_status: req.body?.bookStatus,
          },
        };
        const result = await bookCollection.updateOne(filter, updated, options);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // update booking status by provider
    app.put("/booking-status/:id/:email", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const filter = { _id: new ObjectId(req.params?.id) };
        const options = { upsert: true };
        const updated = {
          $set: {
            status: req.body?.updatedPendingStatus,
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

    // send completed time to booking data while completed
    app.put("/add-time/:id/:email", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const filter = { _id: new ObjectId(req.params?.id) };
        const options = { upsert: true };
        const updated = {
          $set: {
            completed_at: req.body.todayDateTime,
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

    // update user name and photo from profile will update all his book
    // his photo and name also
    app.put("/my-all-books/:email", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const filter = {
          provider_email: req.params?.email,
        };
        const updatedDocs = {
          $set: {
            provider_name: req.body.name,
            provider_image: req.body.photo,
          },
        };
        const result = await bookCollection.updateMany(filter, updatedDocs);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.patch("/add-review/:id", verifyToken, async (req, res) => {
      try {
        const query = { _id: new ObjectId(req.params?.id) };
        const updated = {
          $set: {
            user_name: req.body.name,
            user_review: req.body.review,
          },
        };
        const result = await bookCollection.updateOne(query, updated);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/book/:id/:email", verifyToken, async (req, res) => {
      try {
        if (
          req.decodedUser?.email !== "admin@admin.com" &&
          req.decodedUser?.email !== req.params?.email
        ) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await bookCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/booking/:id/:email", verifyToken, async (req, res) => {
      try {
        if (
          req.decodedUser?.email !== req.params?.email &&
          req.decodedUser?.email !== "admin@admin.com"
        ) {
          return res.status(403).send({ message: "admin authorized only" });
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    // admin special use here
    app.get("/all-bookings", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }
        const filter = req.query?.filter;
        let query = {};

        if (filter && filter !== "All") {
          query = {
            status: filter,
          };
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/available-all-books", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }
        const options = { upsert: true };
        const updated = {
          $set: {
            book_status: "available",
          },
          //unset means delete that field
          $unset: {
            user_name: 1,
            user_review: 1,
          },
        };
        const result = await bookCollection.updateMany({}, updated, options);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/update-to-pending", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }
        const filter = { status: { $in: ["Completed", "Progress"] } };
        const update = {
          $set: {
            status: "Pending",
          },
          $unset: {
            completed_at: "",
            // MongoDB uses an empty string to indicate removal of the field
          },
        };
        const result = await bookingCollection.updateMany(filter, update);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/all-bookings", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }
        const result = await bookingCollection.deleteMany();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/email/:id", verifyToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== "admin@admin.com") {
          return res.status(403).send({ message: "admin authorized only" });
        }
        if (req.params?.id === "all") {
          const resultAll = await usersCollection.deleteMany();
          return res.send(resultAll);
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await usersCollection.deleteOne(query);

        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    // admin special use here end

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BOOKS ARE YOURS");
});

app.listen(port, () => {
  console.log(`SERVER RUNNING ON PORT ${port}`);
});
