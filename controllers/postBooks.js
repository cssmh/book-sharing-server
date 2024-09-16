const client = require("../config/db");
const bookCollection = client.db("bookHaven").collection("books");
const bookingCollection = client.db("bookHaven").collection("bookings");
const emailCollection = client.db("bookHaven").collection("emails");

const addBook = async (req, res) => {
  try {
    const bookData = req.body;
    const result = await bookCollection.insertOne(bookData);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const addBooking = async (req, res) => {
  try {
    const booking = req.body;
    const result = await bookingCollection.insertOne(booking);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const addEmail = async (req, res) => {
  try {
    const email = req.body;
    const result = await emailCollection.insertOne(email);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { addBook, addBooking, addEmail };
