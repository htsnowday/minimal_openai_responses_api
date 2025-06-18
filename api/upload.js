import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";

/*
 * Disable the default body-parser so Formidable can handle multipart/form-data
 */
export const config = {
  api: { bodyParser: false },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/upload
 * Accepts one or more files, uploads each to OpenAI, and attaches them to the
 * existing vector-store whose id is supplied in the env var VECTOR_STORE_ID.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const form = formidable({ multiples: true });

  form.parse(req, async (err, _fields, filesObj) => {
    if (err) return res.status(500).json({ error: "Could not parse form data" });

    try {
      if (!process.env.VECTOR_STORE_ID)
        throw new Error(
          "VECTOR_STORE_ID env var is missing – create a vector store on the " +
            "OpenAI Dashboard and set its ID before uploading."
        );

      const fileArray = Array.isArray(filesObj.files)
        ? filesObj.files
        : [filesObj.files];

      const uploadedIds = [];

      for (const file of fileArray) {
        // 1) Upload raw file
        const up = await openai.files.create({
          file: fs.createReadStream(file.filepath),
          purpose: "assistants", // required purpose for retrieval
        });

        // 2) Attach to vector store so file_search can see it
        await openai.vectorStores.files.create(process.env.VECTOR_STORE_ID, {
          file_id: up.id,
        });

        uploadedIds.push(up.id);
      }

      res.status(200).json({ uploadedIds });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
