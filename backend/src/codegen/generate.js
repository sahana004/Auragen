// The Code-Gen pipeline: build messages -> LLM -> text -> clean code.
// Providers: groq (hosted Llama), ollama (local), openai (GPT-4o).

require("dotenv").config();
const { ChatOpenAI } = require("@langchain/openai");
const { ChatOllama } = require("@langchain/ollama");
const { RunnableLambda, RunnableSequence } = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { buildMessages } = require("./prompt");

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function pickProvider() {
  const wanted = (process.env.LLM_PROVIDER || "").toLowerCase();
  const groqKey = process.env.GROQ_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  if (wanted === "groq") {
    if (!groqKey.startsWith("gsk_")) {
      throw new Error("LLM_PROVIDER=groq but GROQ_API_KEY is missing or invalid in backend/.env (it should start with gsk_)");
    }
    return "groq";
  }
  if (wanted === "openai") {
    if (!openaiKey.startsWith("sk-")) {
      throw new Error("LLM_PROVIDER=openai but OPENAI_API_KEY is missing in backend/.env");
    }
    return "openai";
  }
  if (wanted === "ollama") return "ollama";

  // Nothing chosen: use whatever key exists, otherwise local Ollama.
  if (groqKey.startsWith("gsk_")) return "groq";
  if (openaiKey.startsWith("sk-")) return "openai";
  return "ollama";
}

function createModel() {
  const provider = pickProvider();

  if (provider === "groq") {
    const name = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    return {
      provider,
      name,
      model: new ChatOpenAI({
        model: name,
        temperature: 0.2,
        maxTokens: 4096,
        apiKey: process.env.GROQ_API_KEY,
        configuration: { baseURL: GROQ_BASE_URL },
        ...(name.includes("gpt-oss") ? { modelKwargs: { reasoning_effort: "low" } } : {}),
      }),
    };
  }

  if (provider === "openai") {
    const name = process.env.OPENAI_MODEL || "gpt-4o";
    return {
      provider,
      name,
      model: new ChatOpenAI({ model: name, temperature: 0.2, apiKey: process.env.OPENAI_API_KEY }),
    };
  }

  const name = process.env.OLLAMA_MODEL || "llama3.1";
  return {
    provider,
    name,
    model: new ChatOllama({
      model: name,
      temperature: 0.2,
      numCtx: 8192,
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    }),
  };
}

// Models sometimes wrap code in ``` fences even when told not to.
function extractCode(text) {
  const fenced = text.match(/```(?:jsx|javascript|js|tsx)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

function createCodegenChain(model) {
  return RunnableSequence.from([
    RunnableLambda.from((input) => buildMessages(input)),
    model,
    new StringOutputParser(),
    RunnableLambda.from((text) => extractCode(text)),
  ]);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// input = { schema, values, friction }
async function generateWizard(input) {
  const { provider, name, model } = createModel();
  const chain = createCodegenChain(model);
  const started = Date.now();
  const MAX_ATTEMPTS = 4;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const code = await chain.invoke(input);
      return { code, provider, model: name, ms: Date.now() - started, attempts: attempt };
    } catch (err) {
      const message = String(err.message || "");
      const rateLimited = err.status === 429 || /rate limit/i.test(message);
      if (!rateLimited || attempt === MAX_ATTEMPTS) throw err;

      // Groq says how long to wait: "Please try again in 24.75s"
      const match = /try again in ([\d.]+)s/i.exec(message);
      const waitMs = Math.ceil((match ? parseFloat(match[1]) : 30) * 1000) + 2000;
      console.log(`Rate limited. Waiting ${Math.round(waitMs / 1000)}s, then retrying (${attempt}/${MAX_ATTEMPTS - 1})...`);
      await sleep(waitMs);
    }
  }
}

module.exports = { generateWizard, createCodegenChain, createModel, extractCode };