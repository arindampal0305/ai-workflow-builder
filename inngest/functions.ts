import { inngest } from "./client";
import OpenAI from "openai";
import { setResult } from "@/lib/workflow-store";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "AI Decision Flow",
  }
});

export const executeDecision = inngest.createFunction(
  {
    id: "execute-decision",
    triggers: {
      event: "workflow/decision",
    },
    retries: 2,
  },
  async ({ event, step }) => {
    const result = await step.run(
      "ask-ai",
      async () => {
        const response =
          await openai.chat.completions.create({
            model:
              process.env.OPENROUTER_MODEL ||
              "openrouter/free",
            messages: [
              {
                role: "system",
                content:
                  "You are a binary decision engine. You must answer the user's question with exactly one word: YES or NO. Never explain your answer.",
              },
              {
                role: "user",
                content: event.data.prompt,
              },
            ],
            temperature: 0,
            max_tokens: 10,
          });

        const choice = response.choices?.[0];

        console.log(
          "AI RESPONSE:",
          JSON.stringify(response, null, 2)
        );

        const content =
          choice?.message?.content?.trim();

        if (!content) {
          throw new Error(
            "AI returned an empty response"
          );
        }

        const cleanText = content.toUpperCase().trim();
        let answer: "YES" | "NO" | null = null;

        // Match YES or NO as whole words
        if (/\bYES\b/i.test(cleanText)) {
          answer = "YES";
        } else if (/\bNO\b/i.test(cleanText)) {
          answer = "NO";
        }

        if (!answer) {
          throw new Error(
            `Invalid AI response: ${content}`
          );
        }

        return answer;
      }
    );

    setResult(
      event.data.eventId,
      result
    );

    return {
      nodeId: event.data.nodeId,
      decision: result,
    };
  }
);