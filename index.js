const express = require("express");
const cors = require("cors");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ChangeStream,
} = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const admin = require("firebase-admin");

const serviceAccount = require("./admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware/auth.js

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken; // You can access user info like uid, email, etc.
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token from catch" });
  }
};

let eventsCollection; // <-- blood_donation/collection1
let districtsCollection; // <-- bangladesh-geocode/districts
async function run() {
  try {
    await client.connect();
    // const db = client.db("blood_donation");
    // const events = db.collection("collection1");
    // Connect to blood_donation DB
    const bloodDonationDB = client.db("blood_donation");
    eventsCollection = bloodDonationDB.collection("collection1");

    // Connect to bangladesh-geocode DB
    const bdGeoDB = client.db("bangladesh-geocode");
    districtsCollection = bdGeoDB.collection("districts");
    upazillasCollection = bdGeoDB.collection("upazillas");

    // console.log(
    //   "MongoDB connected: blood_donation & bangladesh-geocode ready!"
    // );
  } finally {
  }
}

run().catch(console.dir);

// Root route

app.get("/", verifyFirebaseToken, async (req, res) => {
  console.log(req.firebaseUser);

  res.send("Server is running!");
});

// Fetch all bd code

app.get("/districts", async (req, res) => {
  try {
    const districts = await districtsCollection.find().toArray();
    res.json(districts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch districts", error });
  }
});
app.get("/upazillas", async (req, res) => {
  try {
    const upazillas = await upazillasCollection.find().toArray();
    res.json(upazillas);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch upazillas", error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
