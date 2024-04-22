import Keyv from "keyv";
import pTimeout from "./pTimeout.js";
import QuickLRU from "./quick-lru.js";
import { v4 as uuidv4 } from "uuid";
import { get_encoding } from "@dqbd/tiktoken";
import { createParser } from "eventsource-parser";

const tokenizer = get_encoding("cl100k_base");

function encode(input) {
  return tokenizer.encode(input);
}
const ChatGPTError = class extends Error {};
const fetch = globalThis.fetch;

async function* streamAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
async function fetchSSE(url, options, fetch2 = fetch) {
  const { onMessage, onError, ...fetchOptions } = options;
  const res = await fetch2(url, fetchOptions);
  if (!res.ok) {
    let reason;
    try {
      reason = await res.text();
    } catch (err) {
      reason = res.statusText;
    }
    const msg = `Coze error ${res.status}: ${reason}`;
    const error = new ChatGPTError(msg, { cause: res });
    error.statusCode = res.status;
    error.statusText = res.statusText;
    throw error;
  }
  const parser = createParser((event) => {
    if (event.type === "event") {
      onMessage(event.data);
    }
  });
  const feed = (chunk) => {
    let _a;
    let response = null;
    try {
      response = JSON.parse(chunk);
    } catch {
    }
    if (((_a = response == null ? void 0 : response.detail) == null ? void 0 : _a.type) === "invalid_request_error") {
      const msg = `Coze error ${response?.detail.message}: ${response?.detail.code} (${response?.detail.type})`;
      const error = new ChatGPTError(msg, { cause: response });
      error.statusCode = response?.detail.code;
      error.statusText = response?.detail.message;
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
      return;
    }
    parser.feed(chunk);
  };
  if (!res.body.getReader) {
    const body = res.body;
    if (!body.on || !body.read) {
      throw new ChatGPTError("unsupported \"fetch\" implementation");
    }
    body.on("readable", () => {
      let chunk;
      while (null !== (chunk = body.read())) {
        feed(chunk.toString());
      }
    });
  } else {
    for await (const chunk of streamAsyncIterable(res.body)) {
      const str = new TextDecoder().decode(chunk);
      feed(str);
    }
  }
}

let CozeAPI = class {
  constructor(opts) {
    const {
      apiKey,
      apiBaseUrl = "https://api.coze.com/open_api/v2",
      debug = false,
      messageStore,
      systemMessage,
      getMessageById,
      upsertMessage,
      botId,
      fetch: fetch2 = fetch
    } = opts;
    this._apiKey = apiKey;
    this._apiBaseUrl = apiBaseUrl;
    this._debug = !!debug;
    this._fetch = fetch2;
    this._completionParams = {
      bot_id: botId
    };
    this._systemMessage = systemMessage;
    if (this._systemMessage === void 0) {
      const currentDate = new Date().toISOString().split("T")[0];
      this._systemMessage = `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.
Knowledge cutoff: 2023-12-31
Current date: ${currentDate}`;
    }

    this._getMessageById = getMessageById ?? this._defaultGetMessageById;
    this._upsertMessage = upsertMessage ?? this._defaultUpsertMessage;
    if (messageStore) {
      this._messageStore = messageStore;
    } else {
      this._messageStore = new Keyv({
        store: new QuickLRU({ maxSize: 1e4 })
      });
    }
    if (!this._apiKey) {
      throw new Error("Coze missing required PERSONAL_ACCESS_TOKEN");
    }
    if (!this._fetch) {
      throw new Error("Invalid environment; fetch is not defined");
    }
    if (typeof this._fetch !== "function") {
      throw new Error("Invalid \"fetch\" is not a function");
    }
  }

  async sendMessage(text, opts = {}) {
    const {
      parentMessageId,
      messageId = uuidv4(),
      timeoutMs,
      onProgress,
      stream = !!onProgress,
      user,
      conversationId,
    } = opts;
    let { abortSignal } = opts;
    let abortController = null;
    if (timeoutMs && !abortSignal) {
      abortController = new AbortController();
      abortSignal = abortController.signal;
    }
    const latestQuestion = {
      role: "user",
      id: messageId,
      conversationId,
      parentMessageId,
      text,
      user
    };
    const { messages } = await this._buildMessages(
      text,
      opts
    );
    const result = {
      role: "assistant",
      id: uuidv4(),
      conversationId,
      parentMessageId: messageId,
      text: "",
      suggestions: [],
      user
    };
    const responseP = new Promise(
      async (resolve, reject) => {
        let _a, _b;
        const url = `${this._apiBaseUrl}/chat`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`
        };
        const body = {
          query: text,
          stream,
          conversation_id: conversationId,
          ...this._completionParams,
          user,
          chat_history: messages,
        };

        if (this._debug) {
          console.log(`Coze send body`, body);
        }
        try {
          const res = await this._fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: abortSignal
          });
          if (!res.ok) {
            const reason = await res.text();
            const msg = `Coze error ${res.status || res.statusText}: ${reason}`;
            const error = new ChatGPTError(msg, { cause: res });
            error.statusCode = res.status;
            error.statusText = res.statusText;
            return reject(error);
          }
          const response = await res.json();

          if (this._debug) {
            console.log(response);
          }


          console.log('response', response)
          if (response.code === 0 && response.msg === "success") {
            result.id = uuidv4();
            const messages = response.messages;
            const message2 = messages.find(
              (message) =>
                message.role === "assistant" && message.type === "answer"
            );

            result.text = message2.content;
            if (message2.role) {
              result.role = message2.role;
            }
            result.suggestions = messages.filter(
              (message) =>
                message.role === "assistant" && message.type === "follow_up"
            );
          } else {
            return reject(
              new Error(
                `Coze error: ${response.msg}`
              )
            );
          }
          result.detail = response;
          return resolve(result);
        } catch (err) {
          return reject(err);
        }
      }
    ).then(async (message2) => {
      return Promise.all([
        this._upsertMessage(latestQuestion),
        this._upsertMessage(message2)
      ]).then(() => message2);
    });
    if (timeoutMs) {
      if (abortController) {
        responseP.cancel = () => {
          abortController.abort();
        };
      }
      return pTimeout(responseP, {
        milliseconds: timeoutMs,
        message: "Coze timed out waiting for response"
      });
    } else {
      return responseP;
    }
  }

  get apiKey() {
    return this._apiKey;
  }

  set apiKey(apiKey) {
    this._apiKey = apiKey;
  }

  async _buildMessages(opts) {
    const { systemMessage = this._systemMessage } = opts;
    let { parentMessageId } = opts;
    let messages = [];
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage,
        content_type: "text"
      });
    }
    const systemMessageOffset = messages.length;
    let nextMessages = messages;
    do {
      messages = nextMessages;

      if (!parentMessageId) {
        break;
      }
      const parentMessage = await this._getMessageById(parentMessageId);
      if (!parentMessage) {
        break;
      }
      const parentMessageRole = parentMessage.role || "user";
      nextMessages = nextMessages.slice(0, systemMessageOffset).concat([
        {
          role: parentMessageRole,
          content: parentMessage.text,
          type: parentMessage.type,
        },
        ...nextMessages.slice(systemMessageOffset)
      ]);
      parentMessageId = parentMessage.parentMessageId;
    } while (true);

    return { messages };
  }

  async _defaultGetMessageById(id) {
    return await this._messageStore.get(id);
  }

  async _defaultUpsertMessage(message) {
    await this._messageStore.set(message.id, message);
  }
};

export {
  CozeAPI
};
