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
    console.log("🚀 ~ verifyFirebaseToken ~ decodedToken:", decodedToken);
    req.firebaseUser = decodedToken; // You can access user info like uid, email, etc.
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token from catch" });
  }
};

async function run() {
  try {
    await client.connect();
    // Connect to blood_donation DB
    const bloodDonationDB = client.db("blood_donation");
    const usersCollection = bloodDonationDB.collection("users");

    const verifyAdmin = async (req, res, next) => {
      const user = await usersCollection.findOne({
        email: req.firebaseUser.email,
      });

      if (user.role === "admin") {
        next();
      } else {
        res.status(403).send({ msg: "unauthorized" });
      }
    };
    app.post("/add-user", async (req, res) => {
      const userData = req.body;
      const find_result = await usersCollection.findOne({
        email: userData.email,
      });

      if (find_result) {
        usersCollection.updateOne(
          { email: userData.email },
          {
            $inc: { loginCount: 1 },
          }
        );
        res.send({ msg: "user already exist" });
      } else {
        const result = await usersCollection.insertOne(userData);
        res.send(result);
      }
    });

    app.get("/get-user-role", verifyFirebaseToken, async (req, res) => {
      const user = await usersCollection.findOne({
        email: req.firebaseUser.email,
      });
      res.send({ msg: "ok", role: user.role, status: "active" });
    });

    app.get(
      "/get-users",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const users = await usersCollection
          .find({ email: { $ne: req.firebaseUser.email } })
          .toArray();
        res.send(users);
      }
    );

    app.patch(
      "/update-role",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const { email, role } = req.body;
        const result = await usersCollection.updateOne(
          { email: email },
          {
            $set: { role },
          }
        );

        res.send(result);
      }
    );

    // Connect to bangladesh-geocode DB

    const bdGeoDB = client.db("bangladesh-geocode");
    const districtsCollection = bdGeoDB.collection("districts");
    const upazilasCollection = bdGeoDB.collection("upazilas");
    // Fetch all districts
    app.get("/districts", async (req, res) => {
      try {
        const districts = await districtsCollection.find().toArray();
        res.json(districts);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch districts", error });
      }
    });

    // Fetch upazilas (with optional district filter)
    app.get("/upazilas", async (req, res) => {
      try {
        const { district_id } = req.query; // e.g., /upazilas?district_id=1
        let query = {};

        if (district_id) {
          query = { district_id: district_id };
        }

        const upazilas = await upazilasCollection.find(query).toArray();
        res.json(upazilas);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch upazilas", error });
      }
    });
    // console.log(
    //   "MongoDB connected: blood_donation & bangladesh-geocode ready!"
    // );
  } finally {
  }
}

run().catch(console.dir);

// Root route

app.get("/", async (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
