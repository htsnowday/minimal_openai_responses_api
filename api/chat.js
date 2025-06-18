// /api/chat.js  – serverless function for Vercel / Next.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { message } = req.body ?? {};
    if (!message) throw new Error("Missing 'message' in request body.");

    const vectorStoreId = process.env.VECTOR_STORE_ID;
    if (!vectorStoreId) {
      throw new Error(
        "VECTOR_STORE_ID env var missing – create a vector store in the " +
        "OpenAI dashboard and add its ID to your environment variables."
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4o",              // Orchestrator model that can use tools
      input: message,               // single-turn question from the user
      instruction: "You are a helpful assistant.",
      tools: [
        { type: "file_search", vector_store_ids: [vectorStoreId] }
      ],
      stream: false                 // set true if you later implement SSE
    });

    res.status(200).json({ answer: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
