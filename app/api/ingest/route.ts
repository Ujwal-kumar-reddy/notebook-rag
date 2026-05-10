import { NextRequest, NextResponse } from "next/server";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const pdf = require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const parsed = await pdf(buffer);

    const text = parsed.text;

    const splitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

    const docs =
      await splitter.createDocuments([text]);

    // FREE local embeddings
    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    // DEBUG
    const test =
      await embeddings.embedQuery("hello");

    console.log(
      "EMBEDDING LENGTH:",
      test.length
    );

    await PGVectorStore.fromDocuments(
      docs,
      embeddings,
      {
        postgresConnectionOptions: {
          connectionString:
            process.env.DATABASE_URL!,
        },

        tableName: "documents",
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Document indexed successfully",
    });

  } catch (error: any) {

    console.error(
      "INGEST_ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}