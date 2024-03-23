const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./db");
const User = require("./models/userSchema");
const app = express();
const PORT = 3000;

app.use(express.json());
dotenv.config();
connectDB();

//GET endpoint for user login
app.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// POST endpoint for user registration
app.post("/create", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Check if username already exists
  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(400).json({ error: "Username already exists" });
  }

  // Create new user object
  const newUser = { username, password };

  // Store the user (in this case, just pushing to array)
  User.create(newUser);
  res
    .status(201)
    .json({ message: "User registered successfully", user: newUser });
});

app.post("/add/:userA/:userB", async (req, res) => {
  const { userA, userB } = req.params;
  const { action } = req.body;

  try {
    // Find userA and userB by username
    const existingUserA = await User.findOne({ username: userA });
    const existingUserB = await User.findOne({ username: userB });

    // Check if both users exist
    if (!existingUserA || !existingUserB) {
      return res.status(404).json({ error: "User not found" });
    }

    // Handle based on the action
    if (action === "send_request") {
      // Check if userB already has a pending request from userA
      if (existingUserB.pendingRequests.includes(existingUserA._id)) {
        return res.status(400).json({ error: "Friend request already sent" });
      }

      // Update userB's pendingRequests
      existingUserB.pendingRequests.push(existingUserA._id);
      await existingUserB.save();

      res.status(200).json({ message: "Friend request sent successfully" });
    } else if (action === "accept_request") {
      // Check if userA has a pending request from userB
      if (!existingUserA.pendingRequests.includes(existingUserB._id)) {
        return res.status(400).json({ error: "No pending request to accept" });
      }

      // Move userA from userB's pendingRequests to friends
      existingUserB.friends.push(existingUserA._id);
      existingUserB.pendingRequests = existingUserB.pendingRequests.filter(
        (request) => request.toString() !== existingUserA._id.toString()
      );

      // Add userB to userA's friends
      existingUserA.friends.push(existingUserB._id);

      existingUserA.pendingRequests = existingUserA.pendingRequests.filter(
        (request) => request.toString() !== existingUserB._id.toString()
      );

      // Save changes
      await existingUserA.save();
      await existingUserB.save();

      res.status(200).json({ message: "Friend request accepted" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Sending friend request from userA to userB
app.post("/add/:userA/:userB", async (req, res) => {
  const { userA, userB } = req.params;

  try {
    const response = await fetch(
      `http://localhost:3000/add/${userA}/${userB}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "send_request" }),
      }
    );

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error:", error);
  }
});

// Accepting friend request from userB to userA
app.post("/add/:userA/:userB", async (req, res) => {
  const { userA, userB } = req.params;

  try {
    const response = await fetch(
      `http://localhost:3000/add/${userA}/${userB}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept_request" }),
      }
    );

    const data = await response.json();
    console.log(data); // Message: Friend request accepted
  } catch (error) {
    console.error("Error:", error);
  }
});

app.get("/friends/:userA", async (req, res) => {
  const { userA } = req.params;

  try {
    // Find userA by username
    const user = await User.findOne({ username: userA });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get the ObjectIds of user's friends
    const friendIds = user.friends;

    // Find details of each friend using their ObjectId
    const friendDetails = await User.find(
      { _id: { $in: friendIds } },
      { username: 1 }
    );

    res.json({ friends: friendDetails });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
