// import { ChatOpenAI } from "@langchain/openai";
// import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import initAgent from "./agent";
import { initGraph } from "../graph";
import { sleep } from "@/utils";

// tag::call[]
export async function call(input: string, sessionId: string): Promise<string> {
  const llm = new ChatMistralAI({
    apiKey: process.env.MISTRAL_API_KEY,
    temperature: 0,
    modelName: "mistral-large-latest"
  });

  const embeddings = new MistralAIEmbeddings({
    apiKey: process.env.MISTRAL_API_KEY as string,
  });
  
  // Get Graph Singleton
  const graph = await initGraph();
  
  const agent = await initAgent(llm, embeddings, graph);
  const res = await agent.invoke({ input }, { configurable: { sessionId } });

  return res;
}
// end::call[]
