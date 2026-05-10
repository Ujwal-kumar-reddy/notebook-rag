import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

import fs from "fs";
import path from "path";

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

    const tempPath = path.join(process.cwd(), "temp.pdf");

    fs.writeFileSync(tempPath, buffer);

    const loader = new PDFLoader(tempPath);

    const rawDocs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.splitDocuments(rawDocs);

    // FREE HUGGINGFACE EMBEDDINGS
    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    const testEmbedding =
      await embeddings.embedQuery("hello");

    console.log(
      "TEST EMBEDDING LENGTH:",
      testEmbedding.length
    );

    await PGVectorStore.fromDocuments(
      docs,
      embeddings,
      {
        postgresConnectionOptions: {
          connectionString: process.env.DATABASE_URL!,
        },

        tableName: "documents",
      }
    );

    fs.unlinkSync(tempPath);

    return NextResponse.json({
      success: true,
      message: "Document Processed Successfully",
    });

  } catch (error: any) {
    console.error("INGEST_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}