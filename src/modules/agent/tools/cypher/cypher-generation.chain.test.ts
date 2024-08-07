// import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI } from "@langchain/mistralai";
import { config } from "dotenv";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnableSequence } from "@langchain/core/runnables";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import initCypherGenerationChain from "./cypher-generation.chain";
import { extractIds } from "../../../../utils";
import { close } from "../../../graph";

describe("Cypher Generation Chain", () => {
  let graph: Neo4jGraph;
  let llm: BaseChatModel | any;
  let chain: RunnableSequence<string, string>;

  beforeAll(async () => {
    config({ path: ".env.local" });

    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI as string,
      username: process.env.NEO4J_USERNAME as string,
      password: process.env.NEO4J_PASSWORD as string,
      database: process.env.NEO4J_DATABASE as string | undefined,
    });

    llm = new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      temperature: 0,
    });

    chain = await initCypherGenerationChain(graph, llm);
  });

  afterAll(async () => {
    await graph.close();
    await close();
  });

  it("should generate a simple count query", async () => {
    const output = await chain.invoke("How many movies are in the database?");
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(output.toLowerCase()).toContain("match (");
    expect(output).toContain(":Movie");
    expect(output.toLowerCase()).toContain("return");
    expect(output.toLowerCase()).toContain("count(");
  });

  it("should generate a Cypher statement with a relationship", async () => {
    const output = await chain.invoke("Who directed The Matrix?");
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(output.toLowerCase()).toContain("match (");
    expect(output).toContain(":Movie");
    expect(output).toContain(":DIRECTED]");
    expect(output.toLowerCase()).toContain("return");
    expect(output.toLowerCase()).toContain("_id");
  });

  it("should extract IDs", () => {
    const ids = extractIds([
      {
        _id: "1",
        name: "Micheal Ward",
        roles: [
          {
            _id: "2",
            name: "Stephen",
            movie: { _id: "3", title: "Empire of Light" },
          },
          {
            _id: "4",
            name: "Marco",
            movie: { _id: "99", title: "Blue Story" },
          },
        ],
      },
      { _id: "100" },
    ]);

    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).toContain("4");
    expect(ids).toContain("99");
    expect(ids).toContain("100");
  });
});
