const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000,
});

client.connect((err) => {
  if (err) {
    console.error("Failed to connect to MongoDB", err);
  } else {
    console.log("Connected to MongoDB");
  }
});

module.exports = client;
