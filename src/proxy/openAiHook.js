import { allConfig } from "../db/configDb.js";
import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";
import { ChatGPTUnofficialProxyAPI }  from '../lib/chatGPT.js'

let chatGPT = null
let chatOption = {};

export async function initChatGPTHook() {
  const config = await allConfig()
  if (!config.openaiAccessToken) {
    console.log('请到智能微秘书平台配置Openai accessToken参数方可使用')
    return [{ type: 1, content: '请到平台配置Openai accessToken参数方可使用' }]
  }
  const baseOptions = {
    accessToken: config.openaiAccessToken,
    debug: config.openaiDebug,
    apiReverseProxyUrl: 'https://bypass.churchless.tech/api/conversation'
  }

  if(config.proxyUrl) {
    console.log(`启用代理请求:${config.proxyUrl}`);
    chatGPT = new ChatGPTUnofficialProxyAPI({
      ...baseOptions,
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
    return
  } else if(config.proxyPassUrl) {
    console.log(`启用反向代理:${config.proxyPassUrl}`);
    baseOptions.apiReverseProxyUrl = config.proxyPassUrl
  }

  chatGPT = new ChatGPTUnofficialProxyAPI({
    ...baseOptions,
    fetch: (url, options = {}) => {
      const mergedOptions = {
        ...options,
      };
      return nodeFetch(url, mergedOptions);
    },
  });
}

/**
 * 重置apikey
 * @return {Promise<void>}
 */
export function initGptHook() {
  chatGPT = null
}

export async function geGPTHookReply(content, uid) {
  try {
    const config = await allConfig()
    if (!config.openaiAccessToken) {
      console.log('请到智能微秘书平台配置Openai openaiAccessToken参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai openaiAccessToken参数方可使用' }]
    }
    if(!chatGPT) {
      console.log('看到此消息说明已启用chatGPT 网页hook版');
      await initChatGPTHook()
    }

    const { conversationId, text, id } = await chatGPT.sendMessage(content, { ...chatOption[uid],  timeoutMs: config.timeoutMs * 1000 });
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