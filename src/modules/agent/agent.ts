/* eslint-disable indent */
import { Embeddings } from "@langchain/core/embeddings";
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import initRephraseChain, {
  RephraseQuestionInput,
} from "./chains/rephrase-question.chain";
import { BaseChatModel } from "langchain/chat_models/base";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { getHistory } from "./history";
import initTools from "./tools";
import { AgentExecutor, createOpenAIFunctionsAgent, createToolCallingAgent } from "langchain/agents";

// tag::function[]
export default async function initAgent(
  llm: BaseChatModel | any,
  embeddings: Embeddings | any,
  graph: Neo4jGraph
) {
  // Initiate tools
  const tools = await initTools(llm, embeddings, graph);

  // // Pull the prompt from the hub
  // const prompt = await pull<ChatPromptTemplate>(
  //   "hwchase17/openai-functions-agent"
  // );
  
  // // Create an agent
  // const agent = await createOpenAIFunctionsAgent({
  //   llm,
  //   tools,
  //   prompt,
  // });

  // js.langchain.com/v0.1/docs/modules/agents/agent_types/tool_calling
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant"],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  // Create an agent executor
  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true, // Verbose output logs the agents _thinking_
  });
  
  // Create a rephrase question chain
  const rephraseQuestionChain = initRephraseChain(llm);
  
  return (
    RunnablePassthrough.assign<{ input: string; sessionId: string }, any>({
      // Get Message History
      history: async (_input, options) => {
        const history = await getHistory(
          options?.config.configurable.sessionId
        );
        return history;
      },
    })
      .assign({
        // Use History to rephrase the question
        rephrasedQuestion: (input: RephraseQuestionInput, config: any) =>
          rephraseQuestionChain.invoke(input, config),
      })
      // Pass to the executor
      .pipe(executor)
      .pick("output")
  );
}
// end::function[]
