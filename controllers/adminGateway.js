const { ObjectId } = require("mongodb");
const client = require("../config/db");
const demoAdmin = process.env.DEMO_ADMIN;
const bookCollection = client.db("bookHaven").collection("books");
const bookingCollection = client.db("bookHaven").collection("bookings");
const userCollection = client.db("bookHaven").collection("users");
const emailCollection = client.db("bookHaven").collection("emails");

// user and admin special use here
const deleteBook = async (req, res) => {
  try {
    const email = req.decodedUser?.email;
    if (email === demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo Admin has read-only access" });
    }
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
};

const deleteBooking = async (req, res) => {
  try {
    const email = req.decodedUser?.email;
    if (email === demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo Admin has read-only access" });
    }
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
};

// admin special use here
const getTotalAdmin = async (req, res) => {
  try {
    const email = req.decodedUser.email.toLowerCase();
    const user = await userCollection.findOne({ email });
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.send({ message: "forbidden access" });
    }
    const query = { role: "admin" };
    const totalAdmin = (await userCollection.countDocuments(query)) || 0;
    res.send({ totalAdmin });
  } catch (err) {
    console.log(err);
  }
};

// isAdmin is not used because of interceptor logout
const getAllUsers = async (req, res) => {
  try {
    const email = req.decodedUser.email;
    const user = await userCollection.findOne({ email });
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.send({ message: "forbidden access" });
    }
    const result = await userCollection.find().toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

// there is no all name status in database
const getAllBookings = async (req, res) => {
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
};

const updateRole = async (req, res) => {
  try {
    if (req.demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo Admin has read-only access" });
    }
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
};

const deleteUser = async (req, res) => {
  try {
    if (req.demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo admin cannot delete users" });
    }
    const query = { _id: new ObjectId(req.params?.id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteAllBookings = async (req, res) => {
  try {
    if (req.demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo Admin has read-only access" });
    }
    const result = await bookingCollection.deleteMany();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const deleteEmails = async (req, res) => {
  try {
    if (req.demoAdmin) {
      return res
        .status(402)
        .send({ message: "Demo Admin has read-only access" });
    }
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
};

module.exports = {
  deleteBook,
  deleteBooking,
  getTotalAdmin,
  getAllUsers,
  getAllBookings,
  updateRole,
  deleteUser,
  deleteAllBookings,
  deleteEmails,
};
