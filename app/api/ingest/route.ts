import { NextRequest, NextResponse } from "next/server";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

import PDFParser from "pdf2json";

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    // Parse PDF
    const pdfParser = new PDFParser();

    const text: string = await new Promise(
      (resolve, reject) => {
        pdfParser.on(
          "pdfParser_dataError",
          (errData: any) =>
            reject(errData.parserError)
        );

        pdfParser.on(
          "pdfParser_dataReady",
          () => {
            const rawText =
              pdfParser.getRawTextContent();

            resolve(rawText);
          }
        );

        pdfParser.parseBuffer(buffer);
      }
    );

    // Split into chunks
    const splitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

    const docs =
      await splitter.createDocuments([text]);

    // Embeddings
    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    // Store vectors
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