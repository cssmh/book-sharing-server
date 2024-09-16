const { ObjectId } = require("mongodb");
const client = require("../config/db");
const bookCollection = client.db("bookHaven").collection("books");
const bookingCollection = client.db("bookHaven").collection("bookings");
const emailCollection = client.db("bookHaven").collection("emails");

const getAllBooks = async (req, res) => {
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
};

const getLatestBooks = async (req, res) => {
  try {
    const cursor = bookCollection.find().sort({ _id: -1 }).limit(6);
    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getProviderBooks = async (req, res) => {
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
};

const getBook = async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await bookCollection.findOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};

const getBookings = async (req, res) => {
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
    const totalProgress = await bookingCollection.countDocuments({
      ...query,
      status: "Progress",
    });
    const cursor = bookingCollection.find(query);
    const result = await cursor.toArray();

    res.send({ totalCart, totalProgress, result });
  } catch (err) {
    console.log(err);
  }
};

const getPending = async (req, res) => {
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
};

const getUnavailableIds = async (req, res) => {
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
};

const getUserAnalytics = async (req, res) => {
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
};

// both admin and user use
const getMonthlyStats = async (req, res) => {
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
};

const getBookProviders = async (req, res) => {
  try {
    const pipeline = [
      // Group by provider email and 
      // count the number of books
      {
        $group: {
          _id: "$provider_email",
          count: { $sum: 1 },
        },
      },
      // Look up the first book 
      // for each provider email
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "provider_email",
          as: "books",
        },
      },
      {
        $addFields: {
          firstBookId: { $arrayElemAt: ["$books._id", 0] },
        },
      },
      // Project only the necessary fields
      {
        $project: {
          email: "$_id",
          count: 1,
          firstBookId: 1,
          _id: 0,
        },
      },
      // Sort by email in ascending order
      {
        $sort: { email: 1 },
      },
    ];

    const result = await bookCollection.aggregate(pipeline).toArray();
    const totalBookings = await bookingCollection.countDocuments();
    res.send({ totalBookings, result });
  } catch (err) {
    console.log(err);
  }
};

const getEmails = async (req, res) => {
  try {
    const result = await emailCollection.find().toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
};


module.exports = {
  getAllBooks,
  getLatestBooks,
  getProviderBooks,
  getBook,
  getBookings,
  getPending,
  getUnavailableIds,
  getUserAnalytics,
  getMonthlyStats,
  getBookProviders,
  getEmails,
};
