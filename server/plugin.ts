import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";
import { answerBuddy, BuddyInputError } from "./buddy.ts";

type MiddlewareStack = {
  use: (handler: (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void) => void;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > 20_000) {
        rejected = true;
        reject(new BuddyInputError("Send a shorter question."));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (error) => {
      if (!rejected) reject(error);
    });
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function mount(middlewares: MiddlewareStack, mode: string, root: string) {
  const env = loadEnv(mode, root, "");
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

  middlewares.use((req, res, next) => {
    const url = req.url?.split("?")[0];
    if (url !== "/api/buddy") {
      next();
      return;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Use POST for Buddy." });
      return;
    }

    void (async () => {
      try {
        const raw = await readBody(req);
        const body = raw ? (JSON.parse(raw) as unknown) : null;
        const result = await answerBuddy(body, { apiKey, model });
        sendJson(res, 200, result);
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJson(res, 400, { error: "Send valid JSON." });
          return;
        }
        if (error instanceof BuddyInputError) {
          sendJson(res, 400, { error: error.message });
          return;
        }
        console.error("Buddy endpoint failed.");
        sendJson(res, 500, { error: "Buddy could not answer just now." });
      }
    })();
  });
}

export function buddyApiPlugin(): Plugin {
  return {
    name: "lekhetho-buddy-api",
    configureServer(server) {
      mount(server.middlewares, server.config.mode, server.config.root);
    },
    configurePreviewServer(server) {
      mount(server.middlewares, server.config.mode, server.config.root);
    },
  };
}
