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
    const blogsCollection = bloodDonationDB.collection("blogs");
    const donorInfoCollection = bloodDonationDB.collection("donorInfo");
    const donationRequestCollection =
      bloodDonationDB.collection("donationRequest");

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
    app.post("/add-donor", async (req, res) => {
      const data = req.body;
      const result = await donorInfoCollection.insertOne(data);
      res.send(result);
    });
    app.get("/find-donor", verifyFirebaseToken, async (req, res) => {
      const { donationId } = req.query;
      const data = await donorInfoCollection.find({ donationId }).toArray();
      res.send(data);
    });
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
    app.get("/get-user-status", verifyFirebaseToken, async (req, res) => {
      const user = await usersCollection.findOne(
        { email: req.firebaseUser.email },
        { projection: { status: 1, _id: 0 } } // only get status field, exclude _id
      );
      res.send({ status: user.status });
    });
    // currently logged in user
    app.get("/get-user", verifyFirebaseToken, async (req, res) => {
      const user = await usersCollection.findOne({
        email: req.firebaseUser.email,
      });

      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user);
    });

    app.patch("/update-user/:id", verifyFirebaseToken, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      res.send(result);
    });

    // all users without currently logged in admin
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
    app.patch(
      "/update-status",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const { email, status } = req.body;

        const result = await usersCollection.updateOne(
          { email: email },
          {
            $set: { status },
          }
        );

        res.send(result);
      }
    );

    app.post("/create-donation-request", async (req, res) => {
      const data = req.body;
      const result = await donationRequestCollection.insertOne(data);
      res.send(result);
    });

    app.get("/my-donation-request", verifyFirebaseToken, async (req, res) => {
      const query = { requesterEmail: req.firebaseUser.email };
      const data = await donationRequestCollection.find(query).toArray();
      res.send(data);
    });
    app.get("/all-donation-requests", verifyFirebaseToken, async (req, res) => {
      const data = await donationRequestCollection.find().toArray();
      res.send(data);
    });
    app.get("/all-donation-requests-public", async (req, res) => {
      const data = await donationRequestCollection
        .find({ donationStatus: "pending" })
        .toArray();
      res.send(data);
    });
    app.get("/details/:id", verifyFirebaseToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const data = await donationRequestCollection.findOne(query);
      res.send(data);
    });

    app.patch("/donation-status", verifyFirebaseToken, async (req, res) => {
      const { id, donationStatus } = req.body;
      const result = await donationRequestCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { donationStatus } }
      );
      res.send(result);
    });
    app.get(
      "/get-donation-request/:ID",
      verifyFirebaseToken,
      async (req, res) => {
        const query = { _id: new ObjectId(req.params.ID) };
        const data = await donationRequestCollection.findOne(query);
        res.send(data);
      }
    );
    app.put(
      "/update-donation-request/:ID",
      verifyFirebaseToken,
      async (req, res) => {
        const { ID } = req.params;
        const updatedRequest = req.body;

        const filter = { _id: new ObjectId(ID) };
        const updateDoc = { $set: updatedRequest };

        const result = await donationRequestCollection.updateOne(
          filter,
          updateDoc
        );
        res.send(result);
      }
    );
    app.post("/add-blog", async (req, res) => {
      const data = req.body;
      const result = await blogsCollection.insertOne(data);
      res.send(result);
    });
    app.get("/get-blogs", verifyFirebaseToken, async (req, res) => {
      const data = await blogsCollection.find().toArray();
      res.send(data);
    });
    app.get("/blog-details/:ID", verifyFirebaseToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.ID) };
      const data = await blogsCollection.findOne(query);
      res.send(data);
    });

    app.get("/get-blogs-public", async (req, res) => {
      const data = await blogsCollection
        .find({ status: "published" })
        .toArray();
      res.send(data);
    });

    app.patch(
      "/update-blog-status",
      verifyFirebaseToken,
      verifyAdmin,
      async (req, res) => {
        const { id, status } = req.body;

        const result = await blogsCollection.updateOne(
          { _id: new ObjectId(id) }, // filter by _id
          { $set: { status } }
        );

        res.send(result);
      }
    );
    app.delete("/delete-blog/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid blog ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/delete-request/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid blog ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await donationRequestCollection.deleteOne(query);
      res.send(result);
    });

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
