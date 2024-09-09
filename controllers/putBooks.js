const { ObjectId } = require("mongodb");
const client = require("../config/db");
const bookCollection = client.db("bookHaven").collection("books");
const bookingCollection = client.db("bookHaven").collection("bookings");

const updateBook = async (req, res) => {
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
    const result = await bookCollection.updateOne(filter, updatedDocs, options);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

// book status update (available or not)
const updateBookStatus = async (req, res) => {
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
};

// update booking status by provider
const updateBookingStatus = async (req, res) => {
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
     const result = await bookingCollection.updateOne(filter, updated, options);
     res.send(result);
   } catch (err) {
     console.log(err);
   }
};

// send completed time to booking data while completed
const addTime = async (req, res) => {
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
     const result = await bookingCollection.updateOne(filter, updated, options);
     res.send(result);
   } catch (err) {
     console.log(err);
   }
};

// update user name and photo from profile will update all his book
// his photo and name also
const updateAllBooks = async (req, res) => {
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
};

const addReview = async (req, res) => {
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
};

module.exports = {
  updateBook,
  updateBookStatus,
  updateBookingStatus,
  addTime,
  updateAllBooks,
  addReview
};