import axios from "axios";
import { getPuppetEol } from '../../const/puppet-type.js'

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

export async function imageGenerations(text, config) {
  const dallConfig = config.dallConfig || {}
  const data = {
    model: dallConfig.model,
    prompt: text,
    n: dallConfig.model === 'dall-e-3' ? 1: config.number,
    response_format: dallConfig.responseType || 'url',
    size: dallConfig.size || '1024x1024'
  }
  if(dallConfig.quality) {
    data.quality = dallConfig.quality
  }
  if(dallConfig.style) {
    data.style = dallConfig.style
  }

  if (config.debug) {
    console.log("生图请求参数：", data);
  }

  const res = await sendRequest({
    apiKey: dallConfig.apiKey,
    debug: config.debug,
    baseUrl: dallConfig.baseUrl || BASE_URL,
    method: routes.createDellImage.method,
    endpoint: routes.createDellImage.url(),
    data,
    stream: false,
    timeoutMs: dallConfig.timeoutMs * 1000
  });

  if (res.status !== 200) {
    if (config.debug) {
      console.log("生图接口报错：", res.data);
    }
    const reason = JSON.stringify(res.data);
    const msg = `DallE3 error ${res.status}: ${reason}`;
    const error = new GPT4VError(msg, { cause: res });
    error.statusCode = res.status;
    error.statusText = JSON.stringify(res.data);
    return Promise.reject(res.message);
  }

  const response = res.data;
  const replys = []
  if(dallConfig.showPrompt) {
    const eol = await getPuppetEol();
    replys.push({type: 1, content: `以下是为你生成的图片，你的 prompt: ${text}`})
  }
  response.data.forEach(item=> {
    replys.push({ type: 2, url: item.url })
  })

  return replys;
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
