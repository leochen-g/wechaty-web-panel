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



async function sendRequest({ method, endpoint, data, params, stream = false, timeoutMs = 180 * 1000, apiKey, baseUrl, debug }) {
  const headers = {
    "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json"
  };

  const url = `${baseUrl}${endpoint}`;
  let response;
  if (debug) {
    console.log("gpt4v request", url, { data, headers, params });
  }
  response = await axios({
      method,
      url,
      data: data || null,
      params: params || null,
      headers,
      timeout: timeoutMs,
      responseType: stream ? "stream" : "json"
    });

  return response;
}


export async function getImageVision(images, question, config) {
  const data = {
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: question || "Please describe the content of the image in Chinese. If it contains any prohibited content, please refrain from describing it."
          }
        ]
      }
    ],
    max_tokens: 300,
    ...config.completionParams
  };
  for(let item of images) {
    data.messages[0].content.push({
      type: "image_url",
      image_url: {
        url: item
      }
    })
  }


  if (config.debug) {
    console.log("request data", data);
  }
  const res = await sendRequest({
    apiKey: config.apiKey,
    debug: config.debug,
    baseUrl: config.baseUrl || BASE_URL,
    method: routes.createVisionPreviewMessage.method,
    endpoint: routes.createVisionPreviewMessage.url(),
    data,
    stream: false,
    timeoutMs: config.timeoutMs * 1000
  });

  if (res.status !== 200) {
    if (config.debug) {
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
