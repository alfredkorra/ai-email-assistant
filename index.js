const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { getAuthUrl, getTokensFromCode } = require("./auth");
const { getRecentEmails } = require("./gmail");
const { summarizeEmail } = require("./openai");
const { generateReply } = require("./openai");
const { sendEmail } = require("./gmail");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const mongoose = require("mongoose");
const UserToken = require("./models/UserToken");
const axios = require("axios");

const app = express();


const corsOptions = {
  origin: "http://localhost:5173", // React app URL
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("AI Email Assistant Backend is running");
});

// 🔐 Redirect to Google
app.get("/auth/google", (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    console.error("❌ Missing code in callback");
    return res.status(400).send("Missing code");
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Get user email using access token
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const { email, name, picture } = userInfo.data;


    // Save or update tokens in MongoDB
    await UserToken.findOneAndUpdate(
      { email },
      {
        email,
        name,
        picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      { upsert: true, new: true }
    );

    const saved = await UserToken.findOne({ email });

    // 🔐 Generate JWT and set as secure, httpOnly cookie
    const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
      sameSite: "lax", // "strict" or "none" depending on cross-domain use
      maxAge: 3600000, // 1 hour
    });

    // ✅ Redirect to frontend WITHOUT email in query
    res.redirect(process.env.FRONTEND_REDIRECT);
  } catch (error) {
    console.error("❌ Failed to get tokens:", error);
    res.status(500).send("Failed to authenticate with Google");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.post("/gmail/read", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Missing email in request body");
    }

    const userToken = await UserToken.findOne({ email });

    if (!userToken) {
      return res.status(404).send("No token found for this user");
    }

    const tokenPayload = {
      access_token: userToken.access_token,
      refresh_token: userToken.refresh_token,
      expiry_date: userToken.expiry_date,
    };

    const emails = await getRecentEmails(tokenPayload);
    res.json(emails);
  } catch (err) {
    console.error("❌ Error in /gmail/read:", err);
    res.status(500).send("Failed to fetch emails");
  }
});

app.post("/summarize-emails", async (req, res) => {
  const emails = req.body.emails; // Array of { subject, snippet }

  if (!emails || !Array.isArray(emails)) {
    return res.status(400).send("Missing or invalid email array.");
  }

  try {
    const summaries = await Promise.all(
      emails.map(async (email) => ({
        subject: email.subject,
        summary: await summarizeEmail(email),
      }))
    );

    res.json(summaries);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to summarize emails");
  }
});

app.post("/suggest-reply", async (req, res) => {
  const { subject, snippet } = req.body;

  if (!subject || !snippet) {
    return res.status(400).json({ error: "Missing subject or snippet" });
  }

  try {
    const reply = await generateReply({ subject, snippet });
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate reply" });
  }
});

function createEncodedEmail(to, subject, message) {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    message,
  ];

  return Buffer.from(emailLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

app.post("/send-email", async (req, res) => {
  const { to, subject, message, threadId, email } = req.body;


  try {
    const user = await UserToken.findOne({ email });
    if (!user) {
      console.error("❌ No tokens found in DB for:", email);
      return res.status(404).json({ error: "User not found in token DB" });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const encodedMessage = createEncodedEmail(to, subject, message);

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        ...(threadId ? { threadId } : {}),
      },
    });

    res.json({ success: true, result: result.data });
  } catch (err) {
    if (err.response?.data) {
      console.error("❌ Gmail API error response:", err.response.data);
    } else {
      console.error("❌ Unexpected error:", err);
    }

    res
      .status(500)
      .json({ error: "Failed to send email", details: err.message });
  }
});

app.get("/me", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserToken.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check token expiry (expiry_date stored in DB in milliseconds)
    if (user.expiry_date && user.expiry_date <= Date.now()) {
      console.warn("🔒 Token expired for:", user.email);
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }

    res.json({ email: user.email });
  } catch (err) {
    console.error("❌ Token validation error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.sendStatus(200);
});

app.get("/user-profile", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const user = await UserToken.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      email: user.email,
      name: user.name || "Google User",
      picture: user.picture || "",
    });
  } catch (err) {
    console.error("❌ Failed to fetch user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

