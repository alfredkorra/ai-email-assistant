const { google } = require("googleapis");
const UserToken = require("./models/UserToken");
const jwt = require("jsonwebtoken");

function getAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function getUserProfile(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserToken.findOne({ email: decoded.email });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      email: user.email,
      name: user.name || "Google User",
      picture: user.picture || "", // optional fields
    });
  } catch (err) {
    console.error("❌ Invalid token:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { getAuthUrl, getTokensFromCode, getUserProfile };
