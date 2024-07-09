import Keyv from "keyv";
import pTimeout from "./pTimeout.js";
import QuickLRU from "./quick-lru.js";
import { v4 as uuidv4 } from "uuid";
import { get_encoding } from "@dqbd/tiktoken";
import { createParser } from "eventsource-parser";

const tokenizer = get_encoding("cl100k_base");
let openai;
((openai2) => {
})(openai || (openai = {}));
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
    const msg = `ChatGPT error ${res.status}: ${reason}`;
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
      const msg = `ChatGPT error ${response?.detail.message}: ${response?.detail.code} (${response?.detail.type})`;
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

let CHATGPT_MODEL = "gpt-3.5-turbo";
let USER_LABEL_DEFAULT = "User";
let ASSISTANT_LABEL_DEFAULT = "ChatGPT";
let ChatGPTAPI = class {
  constructor(opts) {
    const {
      apiKey,
      apiOrg,
      apiBaseUrl = "https://api.openai.com/v1",
      debug = false,
      messageStore,
      completionParams,
      systemMessage,
      maxModelTokens = 4e3,
      maxResponseTokens = 1e3,
      getMessageById,
      upsertMessage,
      fetch: fetch2 = fetch
    } = opts;
    this._apiKey = apiKey;
    this._apiOrg = apiOrg;
    this._apiBaseUrl = apiBaseUrl;
    this._debug = !!debug;
    this._fetch = fetch2;
    this._completionParams = {
      model: CHATGPT_MODEL,
      temperature: 0.8,
      top_p: 1,
      presence_penalty: 1,
      ...completionParams
    };
    this._systemMessage = systemMessage;
//     if (!this._systemMessage) {
//       const currentDate = new Date().toISOString().split("T")[0];
//       this._systemMessage = `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.
// Current date: ${currentDate}`;
//     }
    this._maxModelTokens = maxModelTokens;
    this._maxResponseTokens = maxResponseTokens;
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
      throw new Error("OpenAI missing required apiKey");
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
      completionParams,
      conversationId,
      chatId,
      variables
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
      text
    };
    const { messages, maxTokens, numTokens } = await this._buildMessages(
      text,
      opts
    );
    const result = {
      role: "assistant",
      id: uuidv4(),
      conversationId,
      parentMessageId: messageId,
      text: ""
    };
    const responseP = new Promise(
      async (resolve, reject) => {
        let _a, _b;
        const url = `${this._apiBaseUrl}/chat/completions`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._apiKey}`
        };
        const body = {
          max_tokens: maxTokens,
          ...this._completionParams,
          ...completionParams,
          messages,
          stream
        };
        if(chatId) {
          body.chatId = chatId
        }
        if(variables) {
          body.variables = variables
        }
        if (this._apiOrg) {
          headers["OpenAI-Organization"] = this._apiOrg;
        }
        if (this._debug) {
          console.log(`sendMessage (${numTokens} tokens)`, body);
        }
        if (stream) {
          fetchSSE(
            url,
            {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal: abortSignal,
              onMessage: (data) => {
                let _a2;
                if (data === "[DONE]") {
                  result.text = result.text.trim();
                  return resolve(result);
                }
                if(data && isJsonString(data)) {
                  try {
                    const response = JSON.parse(data);
                    if (response.id) {
                      result.id = response.id;
                    }
                    if ((_a2 = response.choices) == null ? void 0 : _a2.length) {
                      const delta = response.choices[0].delta;
                      result.delta = delta.content;
                      if (delta.content)
                        result.text += delta.content;
                      if (delta.role) {
                        result.role = delta.role;
                      }
                      result.detail = response;
                      onProgress == null ? void 0 : onProgress(result);
                    }
                  } catch (err) {
                    console.warn("OpenAI stream SEE event unexpected error", err);
                    return reject(err);
                  }
                }
              }
            },
            this._fetch
          ).catch(reject);
        } else {
          try {
            const res = await this._fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal: abortSignal
            });
            if (!res.ok) {
              const reason = await res.text();
              const msg = `OpenAI error ${res.status || res.statusText}: ${reason}`;
              const error = new ChatGPTError(msg, { cause: res });
              error.statusCode = res.status;
              error.statusText = res.statusText;
              return reject(error);
            }
            const response = await res.json();
            if (this._debug) {
              console.log(response);
            }
            if (response == null ? void 0 : response.id) {
              result.id = response.id;
            }
            if ((_a = response == null ? void 0 : response.choices) == null ? void 0 : _a.length) {
              const message2 = response.choices[0].message;
              if(typeof message2.content === 'string') {
                result.text = message2.content;
              } else if(Array.isArray(message2.content)){
                const finalContent = message2.content.find(item=> item.type === 'text')
                if(finalContent) {
                  result.text = finalContent?.text?.content || ''
                }
              }

              if (message2.role) {
                result.role = message2.role;
              }
            } else {
              const res2 = response;
              return reject(
                new Error(
                  `OpenAI error: ${((_b = res2 == null ? void 0 : res2.detail) == null ? void 0 : _b.message) || (res2 == null ? void 0 : res2.detail) || "unknown"}`
                )
              );
            }
            result.detail = response;
            return resolve(result);
          } catch (err) {
            return reject(err);
          }
        }
      }
    ).then(async (message2) => {
      if (message2.detail && !message2.detail.usage) {
        try {
          const promptTokens = numTokens;
          const completionTokens = await this._getTokenCount(message2.text);
          message2.detail.usage = {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
            estimated: true
          };
        } catch (err) {
        }
      }
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
        message: "OpenAI timed out waiting for response"
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

  get apiOrg() {
    return this._apiOrg;
  }

  set apiOrg(apiOrg) {
    this._apiOrg = apiOrg;
  }

  async _buildMessages(text, opts) {
    const { systemMessage = this._systemMessage } = opts;
    let { parentMessageId } = opts;
    const userLabel = USER_LABEL_DEFAULT;
    const assistantLabel = ASSISTANT_LABEL_DEFAULT;
    const maxNumTokens = this._maxModelTokens - this._maxResponseTokens;
    let messages = [];
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    const systemMessageOffset = messages.length;
    let nextMessages = text ? messages.concat([
      {
        role: "user",
        content: text,
        name: opts.name
      }
    ]) : messages;
    let numTokens = 0;
    do {
      const prompt = nextMessages.reduce((prompt2, message) => {
        switch (message.role) {
          case "system":
            return prompt2.concat([`Instructions:
${message.content}`]);
          case "user":
            return prompt2.concat([`${userLabel}:
${message.content}`]);
          default:
            return prompt2.concat([`${assistantLabel}:
${message.content}`]);
        }
      }, []).join("\n\n");
      const nextNumTokensEstimate = await this._getTokenCount(prompt);
      const isValidPrompt = nextNumTokensEstimate <= maxNumTokens;
      if (prompt && !isValidPrompt) {
        break;
      }
      messages = nextMessages;
      numTokens = nextNumTokensEstimate;
      if (!isValidPrompt) {
        break;
      }
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
          name: parentMessage.name
        },
        ...nextMessages.slice(systemMessageOffset)
      ]);
      parentMessageId = parentMessage.parentMessageId;
    } while (true);
    const maxTokens = Math.max(
      1,
      Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens)
    );
    return { messages, maxTokens, numTokens };
  }

  async _getTokenCount(text) {
    text = text.replace(/<\|endoftext\|>/g, "");
    return encode(text).length;
  }

  async _defaultGetMessageById(id) {
    return await this._messageStore.get(id);
  }

  async _defaultUpsertMessage(message) {
    await this._messageStore.set(message.id, message);
  }
};

let uuidv4Re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUIDv4(str) {
  return str && uuidv4Re.test(str);
}

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

let ChatGPTUnofficialProxyAPI = class {
  /**
   * @param fetch - Optional override for the `fetch` implementation to use. Defaults to the global `fetch` function.
   */
  constructor(opts) {
    const {
      accessToken,
      apiReverseProxyUrl = "https://bypass.duti.tech/api/conversation",
      model = "text-davinci-002-render-sha",
      debug = false,
      headers,
      fetch: fetch2 = fetch
    } = opts;
    this._accessToken = accessToken;
    this._apiReverseProxyUrl = apiReverseProxyUrl;
    this._debug = !!debug;
    this._model = model;
    this._fetch = fetch2;
    this._headers = headers;
    if (!this._accessToken) {
      throw new Error("ChatGPT invalid accessToken");
    }
    if (!this._fetch) {
      throw new Error("Invalid environment; fetch is not defined");
    }
    if (typeof this._fetch !== "function") {
      throw new Error("Invalid \"fetch\" is not a function");
    }
  }

  get accessToken() {
    return this._accessToken;
  }

  set accessToken(value) {
    this._accessToken = value;
  }

  async sendMessage(text, opts = {}) {
    if (!!opts.conversationId !== !!opts.parentMessageId) {
      throw new Error(
        "ChatGPTUnofficialProxyAPI.sendMessage: conversationId and parentMessageId must both be set or both be undefined"
      );
    }
    if (opts.conversationId && !isValidUUIDv4(opts.conversationId)) {
      throw new Error(
        "ChatGPTUnofficialProxyAPI.sendMessage: conversationId is not a valid v4 UUID"
      );
    }
    if (opts.parentMessageId && !isValidUUIDv4(opts.parentMessageId)) {
      throw new Error(
        "ChatGPTUnofficialProxyAPI.sendMessage: parentMessageId is not a valid v4 UUID"
      );
    }
    if (opts.messageId && !isValidUUIDv4(opts.messageId)) {
      throw new Error(
        "ChatGPTUnofficialProxyAPI.sendMessage: messageId is not a valid v4 UUID"
      );
    }
    const {
      conversationId,
      parentMessageId = uuidv4(),
      messageId = uuidv4(),
      action = "next",
      timeoutMs,
      onProgress
    } = opts;
    let { abortSignal } = opts;
    let abortController = null;
    if (timeoutMs && !abortSignal) {
      abortController = new AbortController();
      abortSignal = abortController.signal;
    }
    const body = {
      action,
      messages: [
        {
          id: messageId,
          role: "user",
          content: {
            content_type: "text",
            parts: [text]
          }
        }
      ],
      model: this._model,
      parent_message_id: parentMessageId
    };
    if (conversationId) {
      body.conversation_id = conversationId;
    }
    const result = {
      role: "assistant",
      id: uuidv4(),
      parentMessageId: messageId,
      conversationId,
      text: ""
    };
    const responseP = new Promise((resolve, reject) => {
      const url = this._apiReverseProxyUrl;
      const headers = {
        ...this._headers,
        Authorization: `Bearer ${this._accessToken}`,
        Accept: "text/event-stream",
        "Content-Type": "application/json"
      };
      if (this._debug) {
        console.log("POST", url, { body, headers });
      }
      fetchSSE(
        url,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: abortSignal,
          onMessage: (data) => {
            let _a, _b, _c;

            if (data === "[DONE]") {
              return resolve(result);
            }
            if (data && isJsonString(data)) {
              try {
                const convoResponseEvent = JSON.parse(data);
                if (convoResponseEvent.conversation_id) {
                  result.conversationId = convoResponseEvent.conversation_id;
                }
                if ((_a = convoResponseEvent.message) == null ? void 0 : _a.id) {
                  result.id = convoResponseEvent.message.id;
                }
                const message = convoResponseEvent.message;
                if (message) {
                  let text2 = (_c = (_b = message.content) == null ? void 0 : _b.parts) == null ? void 0 : _c[0];
                  if (text2) {
                    result.text = text2;
                    if (onProgress) {
                      onProgress(result);
                    }
                  }
                }
              } catch (err) {
                reject(err);
              }
            }
          },
          onError: (err) => {
            reject(err);
          }
        },
        this._fetch
      ).catch((err) => {
        const errMessageL = err.toString().toLowerCase();
        if (result.text && (errMessageL === "error: typeerror: terminated" || errMessageL === "typeerror: terminated")) {
          return resolve(result);
        } else {
          return reject(err);
        }
      });
    });
    if (timeoutMs) {
      if (abortController) {
        responseP.cancel = () => {
          abortController.abort();
        };
      }
      return pTimeout(responseP, {
        milliseconds: timeoutMs,
        message: "ChatGPT timed out waiting for response"
      });
    } else {
      return responseP;
    }
  }
};
export {
  ChatGPTAPI,
  ChatGPTError,
  ChatGPTUnofficialProxyAPI,
  openai
};
