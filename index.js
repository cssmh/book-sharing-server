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

// JWT Authentication Middleware
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

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.URI, {
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
    const userCollection = client.db("bookHaven").collection("users");
    const emailCollection = client.db("bookHaven").collection("emails");

    // middleware
    // use verify admin after isToken
    const isAdmin = async (req, res, next) => {
      const email = req.decodedUser.email.toLowerCase();
      const user = await userCollection.findOne({ email });
      if (!user || user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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

    app.get("/logout", async (req, res) => {
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
            { provider_location: { $regex: searchTerm, $options: "i" } },
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

    app.get("/latest-books", async (req, res) => {
      try {
        const cursor = bookCollection.find().sort({ _id: -1 }).limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/providers-books", async (req, res) => {
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

    app.get("/my-bookings", isToken, async (req, res) => {
      try {
        // console.log(req.cookies);
        if (req.decodedUser?.email !== req.query?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        let query = {};
        if (req.query?.email) {
          query = { user_email: req.query.email };
        }
        const totalCart = await bookingCollection.countDocuments(query);
        const cursor = bookingCollection.find(query);
        const result = await cursor.toArray();

        res.send({ result, totalCart });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/my-pending", isToken, async (req, res) => {
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

    // used only in home page count component
    app.get("/total-bookings", async (req, res) => {
      try {
        const result = await bookingCollection.countDocuments();
        res.send({ result });
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/unavailable-ids", isToken, async (req, res) => {
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

        const result = await bookCollection.find(query, options).toArray();
        if (!result) {
          return res.send({ message: "No unavailable books found" });
        }
        const unavailableIds = result.map((book) => book._id);
        res.send(unavailableIds);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/user-analytics", isToken, async (req, res) => {
      try {
        if (req.decodedUser?.email !== req.query?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
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

    // both admin and user use
    app.get("/monthly-stats", isToken, async (req, res) => {
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
        const result = await emailCollection.insertOne(email);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.put("/book/:id/:email", isToken, async (req, res) => {
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
    app.put("/book-status/:id/:email", isToken, async (req, res) => {
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
    app.put("/booking-status/:id/:email", isToken, async (req, res) => {
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
    app.put("/add-time/:id/:email", isToken, async (req, res) => {
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
    app.put("/my-all-books/:email", isToken, async (req, res) => {
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

    app.patch("/add-review/:id", isToken, async (req, res) => {
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

    // user and admin special use here
    app.delete("/book/:id/:email", isToken, async (req, res) => {
      try {
        const email = req.decodedUser?.email;
        const user = await userCollection.findOne({ email });
        const isAdmin = user?.role === "admin";
        if (!isAdmin && email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await bookCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/booking/:id/:email", isToken, async (req, res) => {
      try {
        const email = req.decodedUser?.email;
        const user = await userCollection.findOne({ email });
        const isAdmin = user?.role === "admin";
        if (!isAdmin && email !== req.params?.email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.get("/all-bookings", isToken, isAdmin, async (req, res) => {
      try {
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

    app.patch("/user-update/:email", isToken, isAdmin, async (req, res) => {
      try {
        const email = req.params.email.toLowerCase();
        const query = { email };
        const updateDoc = {
          $set: { role: req.body.role },
        };
        const result = await userCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/all-bookings", isToken, isAdmin, async (req, res) => {
      try {
        const result = await bookingCollection.deleteMany();
        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });

    app.delete("/email/:id", isToken, isAdmin, async (req, res) => {
      try {
        if (req.params?.id === "all") {
          const resultAll = await emailCollection.deleteMany();
          return res.send(resultAll);
        }
        const query = { _id: new ObjectId(req.params?.id) };
        const result = await emailCollection.deleteOne(query);

        res.send(result);
      } catch (err) {
        console.log(err);
      }
    });
    // admin special use here end

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
