// import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import initTools from ".";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
// import { OpenAIEmbeddings } from "@langchain/openai";

describe("Tool Chain", () => {
  it("should return two tools", async () => {
    const graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
      database: process.env.NEO4J_DATABASE as string | undefined,
    });

    const llm = new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      temperature: 0,
    });

    const embeddings = new MistralAIEmbeddings({
      apiKey: process.env.MISTRAL_API_KEY as string,
    });

    const tools = await initTools(llm, embeddings, graph);

    expect(tools).toBeDefined();
    expect(tools.length).toBeGreaterThanOrEqual(2);

    await graph.close();
  });
});
