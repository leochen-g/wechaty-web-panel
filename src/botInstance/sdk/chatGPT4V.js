import axios from "axios";

export const BASE_URL = "https://api.openai.com/v1";
const GPT4VError = class extends Error {};
export const routes = {
  createVisionPreviewMessage: {
    method: "POST",
    url: () => '/chat/completions'
  },
  createDellImage: {
    method: "POST",
    url: () => '/images/generations'
  },
};

export class GPT4VClient {
  constructor({ apiKey, completionParams, baseUrl = BASE_URL, debug = false, systemMessage = null }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.debug = debug;
    this.completionParams = completionParams || {}
    this.systemMessage = systemMessage;
  }

  updateApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async sendRequest({ method, endpoint, data, params, stream = false, timeoutMs = 180 * 1000 }) {
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json"
    };

    const url = `${this.baseUrl}${endpoint}`;
    let response;
    if (this.debug) {
      console.log("gpt4v request", url, { data, headers, params });
    }
    if (!stream) {
      response = await axios({
        method,
        url,
        data: data || null,
        params: params || null,
        headers,
        timeout: timeoutMs,
        responseType: stream ? "stream" : "json"
      });
    } else {
      response = await fetch(url, {
        headers, method, body: JSON.stringify(data)
      });
    }

    return response;
  }
}

export class CompletionClient extends GPT4VClient {
  createGPT4VMessage(inputs, query, user, responseMode) {
    const data = {
      inputs, query, responseMode, user
    };
    return this.sendRequest({
      method: routes.createVisionPreviewMessage.method,
      endpoint: routes.createVisionPreviewMessage.url(),
      data,
      stream: responseMode === "streaming"
    });
  }
}

export class Chat4VClient extends GPT4VClient {
  async sendImage(base64, {
    systemMessage, responseMode = "json", timeoutMs = 180 * 1000
  }) {
    const data = {
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: systemMessage || this.systemMessage || "Please describe the content of the image in Chinese. If it contains any prohibited content, please refrain from describing it."
            },
            {
              type: "image_url",
              image_url: {
                url: base64
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      ...this.completionParams
    };
    if (this.debug) {
      console.log("request data", data);
    }
    const res = await this.sendRequest({
      method: routes.createVisionPreviewMessage.method,
      endpoint: routes.createVisionPreviewMessage.url(),
      data,
      stream: responseMode === "streaming",
      timeoutMs
    });

    if (res.status !== 200) {
      if (this.debug) {
        console.log("gpt4v request error", res.data);
      }
      const reason = JSON.stringify(res.data);
      const msg = `GPT4V error ${res.status}: ${reason}`;
      const error = new GPT4VError(msg, { cause: res });
      error.statusCode = res.status;
      error.statusText = JSON.stringify(res.data);
      return Promise.reject(res.message);
    }

    const response = res.data;
    return {
      text: response.choices[0].message.content
    };
  }
}
