// import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI } from "@langchain/mistralai";
import { config } from "dotenv";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnableSequence } from "@langchain/core/runnables";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import initCypherEvaluationChain from "./cypher-evaluation.chain";

describe("Cypher Evaluation Chain", () => {
  let graph: Neo4jGraph;
  let llm: BaseChatModel | any;
  let chain: RunnableSequence;

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

    chain = await initCypherEvaluationChain(llm);
  });

  afterAll(async () => {
    await graph.close();
  });

  it("should fix a non-existent label", async () => {
    const input = {
      question: "How many movies are in the database?",
      cypher: "MATCH (m:Muvee) RETURN count(m) AS count",
      schema: graph.getSchema(),
      errors: ["Label Muvee does not exist"],
    };

    const { cypher, errors } = await chain.invoke(input);
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(cypher).toContain("MATCH (m:Movie) RETURN count(m) AS count");

    expect(errors.length).toBe(1);

    let found = false;

    for (const error of errors) {
      if (error.toLowerCase().includes("label muvee does not exist")) {
        found = true;
      }
    }

    expect(found).toBe(true);
  });

  it("should fix a non-existent relationship", async () => {
    const input = {
      question: "Who acted in the matrix?",
      cypher:
        'MATCH (m:Muvee)-[:ACTS_IN]->(a:Person) WHERE m.name = "The Matrix" RETURN a.name AS actor',
      schema: graph.getSchema(),
      errors: [
        "Label Muvee does not exist",
        "Relationship type ACTS_IN does not exist",
      ],
    };

    const { cypher, errors } = await chain.invoke(input);
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(cypher).toContain("MATCH (m:Movie");
    expect(cypher).toContain(":ACTED_IN");

    expect(errors.length).toBeGreaterThanOrEqual(2);

    let found = false;

    for (const error of errors) {
      if (error.includes("ACTS_IN")) {
        found = true;
      }
    }

    expect(found).toBe(true);
  });

  it("should return no errors if the query is fine", async () => {
    const cypher = "MATCH (m:Movie) RETURN count(m) AS count";
    const input = {
      question: "How many movies are in the database?",
      cypher,
      schema: graph.getSchema(),
      errors: ["Label Muvee does not exist"],
    };

    const { cypher: updatedCypher, errors } = await chain.invoke(input);
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(updatedCypher).toContain(cypher);
    expect(errors.length).toBe(0);
  });

  it("should keep variables in relationship", async () => {
    const cypher =
      "MATCH (a:Actor {name: 'Emil Eifrem'})-[r:ACTED_IN]->" +
      "(m:Movie {title: 'Neo4j - Into the Graph'}) RETURN r.role AS Role";
    const input = {
      question: "What role did Emil Eifrem play in Neo4j - Into the Graph",
      cypher,
      schema: graph.getSchema(),
      errors: [],
    };

    const { cypher: updatedCypher, errors } = await chain.invoke(input);
    await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

    expect(updatedCypher).toContain(cypher);
    expect(errors.length).toBe(0);
  });
});
