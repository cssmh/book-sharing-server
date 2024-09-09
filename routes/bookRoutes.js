// routes/bookRoutes.js
const express = require("express");
const {
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
} = require("../controllers/getBooks");
const { addJwt, getLogout } = require("../controllers/jwt");
const { addBook, addBooking, addEmail } = require("../controllers/postBooks");
const { addUser, getRole } = require("../controllers/userGateway");
const {
  updateBook,
  updateBookStatus,
  updateBookingStatus,
  addTime,
  updateAllBooks,
  addReview,
} = require("../controllers/putBooks");
const {
  deleteBook,
  deleteBooking,
  getTotalAdmin,
  getAllUsers,
  deleteUser,
  getAllBookings,
  updateRole,
  deleteAllBookings,
  deleteEmails,
} = require("../controllers/adminGateway");
const { isToken, isAdmin } = require("../middlewares/auth");

const router = express.Router();

// jwt
router.post("/jwt", addJwt);
router.get("/logout", getLogout);
// get routes
router.get("/all-books", getAllBooks);
router.get("/latest-books", getLatestBooks);
router.get("/providers-books", getProviderBooks);
router.get("/book/:id", getBook);
router.get("/my-bookings", isToken, getBookings);
router.get("/my-pending", isToken, getPending);
router.get("/unavailable-ids", isToken, getUnavailableIds);
router.get("/user-analytics", isToken, getUserAnalytics);
router.get("/emails", getEmails);
// both admin and user use
router.get("/monthly-stats", isToken, getMonthlyStats);
router.get("/book-providers", getBookProviders);
// post gateway here
router.post("/book", addBook);
router.post("/add-booking", addBooking);
router.post("/email", addEmail);
// user gateway here
router.put("/add-user", addUser);
router.get("/role/:email", isToken, getRole);
// put books gateway here
router.put("/book/:id/:email", isToken, updateBook);
router.put("/book-status/:id/:email", isToken, updateBookStatus);
router.put("/booking-status/:id/:email", isToken, updateBookingStatus);
router.put("/add-time/:id/:email", isToken, addTime);
router.put("/my-all-books/:email", isToken, updateAllBooks);
router.patch("/add-review/:id", isToken, addReview);
// admin and user gateway
router.delete("/book/:id/:email", isToken, deleteBook);
router.delete("/booking/:id/:email", isToken, deleteBooking);
// admin special gateway
router.get("/total-admin", isToken, getTotalAdmin);
router.get("/users", isToken, getAllUsers);
router.get("/all-bookings", isToken, isAdmin, getAllBookings);
router.patch("/user-update/:email", isToken, isAdmin, updateRole);
router.delete("/user/:id", isToken, isAdmin, deleteUser);
router.delete("/all-bookings", isToken, isAdmin, deleteAllBookings);
router.delete("/email/:id", isToken, isAdmin, deleteEmails);

module.exports = router;
