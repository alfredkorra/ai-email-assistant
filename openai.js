const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function summarizeEmail({ subject, snippet }) {
  const prompt = `Summarize the following email in one sentence:\nSubject: ${subject}\nBody: ${snippet}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

async function generateReply({ subject, snippet }) {
    const prompt = `Write a polite, friendly email reply to the following message:\nSubject: ${subject}\nContent: ${snippet}`;
  
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
  
    return response.choices[0].message.content.trim();
  }
  
  module.exports = { summarizeEmail, generateReply };
  
