import { allConfig } from "../db/configDb.js";
import { ChatGPTAPI } from 'chatgpt'
import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";

let chatGPT = null
let chatOption = {};

export async function initChatGPT() {
  const config = await allConfig()
  if (!config.gpttoken) {
    console.log('请到智能微秘书平台配置Openai apikey参数方可使用')
    return [{ type: 1, content: '请到平台配置Openai apikey参数方可使用' }]
  }
  console.log('config.gpttoken', config.gpttoken);
  if(config.proxyUrl) {
    console.log(`启用代理请求:${config.proxyUrl}`);
    chatGPT = new ChatGPTAPI({
      apiKey: config.gpttoken,
      fetch: (url, options = {}) => {
        const defaultOptions = {
          agent: proxy(config.proxyUrl),
        };

        const mergedOptions = {
          ...defaultOptions,
          ...options,
        };

        return nodeFetch(url, mergedOptions);
      },
    });
  } else if(config.proxyPassUrl) {
    console.log(`启用反向代理请求:${config.proxyPassUrl}`);
    chatGPT = new ChatGPTAPI({
      apiBaseUrl: config.proxyPassUrl,
      apiKey: config.gpttoken
    });
   } else {
    console.log('未启用代理请求，可能会失败');
    chatGPT = new ChatGPTAPI({
      apiKey: config.gpttoken,
    });
  }
}

/**
 * 重置apikey
 * @return {Promise<void>}
 */
export function initGpt() {
  chatGPT = null
}

async function geGPT3Reply(content, uid) {
  try {
    const config = await allConfig()
    if (!config.gpttoken) {
      console.log('请到智能微秘书平台配置Openai apikey参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai apikey参数方可使用' }]
    }
    if(!chatGPT) {
      console.log('看到此消息说明已启用最新版chat gpt 3.5 turbo模型');
      await initChatGPT()
    }
    const { conversationId, text, id } = await chatGPT.sendMessage(content, chatOption[uid]);
    chatOption = {
      [uid]: {
        conversationId,
        parentMessageId: id,
      },
    };
    let replys = []
    let message;
    if(config.showQuestion) {
      message = `${content}\n-----------\n` + text;
    } else {
      message = text;
    }
    while (message.length > 500) {
      replys.push(message.slice(0, 500));
      message = message.slice(500);
    }
    replys.push(message);
    replys = replys.map(item=> {
      return {
        type: 1,
        content: item.trim()
      }
    })
    return replys
  } catch (e) {
    console.log('chat gpt报错：'+ e);
    return [{ type: 1, content: ''}]
  }
}

export { geGPT3Reply }
export default {
  geGPT3Reply,
}
