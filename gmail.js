const { google } = require("googleapis");
require("dotenv").config();

async function getRecentEmails(tokens) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth });

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
    q: "is:inbox",
  });

  const messages = response.data.messages || [];

  const results = [];

  for (const msg of messages) {
    const msgDetails = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });

    const snippet = msgDetails.data.snippet;

    const headers = msgDetails.data.payload.headers;

    const subjectHeader = headers.find((h) => h.name === "Subject");
    const fromHeader = headers.find((h) => h.name === "From");

    const senderEmail =
      fromHeader?.value.match(/<(.+?)>/)?.[1] || fromHeader?.value;

    results.push({
      id: msg.id,
      subject: subjectHeader ? subjectHeader.value : "(No Subject)",
      snippet,
      threadId: msgDetails.data.threadId,
      sender: senderEmail,
    });
  }

  return results;
}

async function sendEmail({ to, subject, message, tokens, threadId }) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  
    auth.setCredentials(tokens);
  
    const gmail = google.gmail({ version: "v1", auth });
  
    // Construct MIME-compliant email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      message.trim(), // Ensure there's no leading/trailing empty space
    ];
  
    const rawMessage = emailLines.join("\r\n");
  
    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  
    const requestBody = {
      raw: encodedMessage,
    };
  
    if (threadId) {
      requestBody.threadId = threadId;
    }
  
    try {
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody,
      });
  
      return res.data;
    } catch (error) {
      if (error.response) {
        console.error("❌ Gmail API response error:", {
          status: error.response.status,
          data: error.response.data,
        });
      } else {
        console.error("❌ Unknown Gmail API error:", error);
      }
      throw error;
    }
  }

module.exports = {
  getRecentEmails,
  sendEmail,
};
