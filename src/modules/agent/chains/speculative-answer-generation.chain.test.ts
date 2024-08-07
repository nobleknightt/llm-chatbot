import { config } from "dotenv";
import initGenerateAnswerChain from "./answer-generation.chain";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnableSequence } from "@langchain/core/runnables";
// import { ChatOpenAI } from "@langchain/openai";
import { ChatMistralAI } from "@langchain/mistralai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

describe("Speculative Answer Generation Chain", () => {
  let llm: BaseChatModel | any;
  let chain: RunnableSequence;
  let evalChain: RunnableSequence<any, any>;

  beforeAll(async () => {
    config({ path: ".env.local" });

    llm = new ChatMistralAI({
      apiKey: process.env.MISTRAL_API_KEY,
      temperature: 0,
    });

    chain = initGenerateAnswerChain(llm);

    // tag::evalchain[]
    evalChain = RunnableSequence.from([
      PromptTemplate.fromTemplate(`
        Does the following response answer the question provided?

        Question: {question}
        Response: {response}

        Respond simply with "yes" or "no".
      `),
      llm,
      new StringOutputParser(),
    ]);
    // end::evalchain[]
  });

  describe("Simple RAG", () => {
    it("should use context to answer the question", async () => {
      const question = "Who directed the matrix?";
      const response = await chain.invoke({
        question,
        context: '[{"name": "Lana Wachowski"}, {"name": "Lilly Wachowski"}]',
      });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      // tag::eval[]
      const evaluation = await evalChain.invoke({ question, response });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      expect(`${evaluation.toLowerCase()} - ${response}`).toContain("yes");
      // end::eval[]
    });

    it("should refuse to answer if information is not in context", async () => {
      const question = "Who directed the matrix?";
      const response = await chain.invoke({
        question,
        context:
          "The Matrix is a 1999 science fiction action film starring Keanu Reeves",
      });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      const evaluation = await evalChain.invoke({ question, response });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      expect(`${evaluation.toLowerCase()} - ${response}`).toContain("no");
    });

    it("should answer this one??", async () => {
      const role = "The Chief";

      const question = "What was Emil Eifrems role in Neo4j The Movie??";
      const response = await chain.invoke({
        question,
        context: `{"Role":"${role}"}`,
      });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      expect(response).toContain(role);

      const evaluation = await evalChain.invoke({ question, response });
      await new Promise((r) => setTimeout(r, 1000)); // add delay of 1 second

      expect(`${evaluation.toLowerCase()} - ${response}`).toContain("yes");
    });
  });
});
