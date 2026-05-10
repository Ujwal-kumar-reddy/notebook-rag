import { NextRequest, NextResponse } from "next/server";

import { ChatGroq } from "@langchain/groq";

import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

import {
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    const vectorStore =
      await PGVectorStore.initialize(
        embeddings,
        {
          postgresConnectionOptions: {
            connectionString:
              process.env.DATABASE_URL!,
          },

          tableName: "documents",
        }
      );

    const retriever = vectorStore.asRetriever({
      k: 3,
    });

    const searchedChunks =
      await retriever.invoke(question);

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
       model: "llama-3.3-70b-versatile",
    });

    const systemPrompt = `
You are an AI assistant.

Answer ONLY using the provided PDF context.

If answer is not found,
say:
"I could not find this information in the uploaded PDF."

Context:
${JSON.stringify(searchedChunks)}
`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(question),
    ]);

    return NextResponse.json({
      success: true,
      answer: response.content,
    });

  } catch (error: any) {
    console.error("CHAT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}