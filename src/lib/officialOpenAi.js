import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";
import {ChatGPTAPI} from "./chatGPT.js";

let chatGPT = null
let chatOption = {};


class OfficialOpenAi {
  constructor(config = {
    token: '', // token
    debug: 0,  // 开启调试
    proxyPass: '', // 反向代理地址
    proxyUrl: '', // 代理地址
    showQuestion: true, // 显示原文
    timeoutMs: 60, // 超时时间 s
    model: '', // 模型
    systemMessage: '', // 预设promotion
  }) {
    this.chatGPT = null;
    this.config = config
    this.chatOption = {};
  }


  async init() {
    const baseOptions = {
      apiKey: this.config.token,
      completionParams: { model: this.config.model },
      debug: this.config.debug,
      systemMessage: this.config.systemMessage || '',
    }
    // increase max token limit if use gpt-4
    if (this.config.model.toLowerCase().includes('gpt-4')) {
      // if use 32k model
      if (this.config.model.toLowerCase().includes('32k')) {
        baseOptions.maxModelTokens = 32768
        baseOptions.maxResponseTokens = 8192
      }
      else {
        baseOptions.maxModelTokens = 8192
        baseOptions.maxResponseTokens = 2048
      }
    }

    if(this.config.proxyUrl) {
      console.log(`启用代理请求:${this.config.proxyUrl}`);
      chatGPT = new ChatGPTAPI({
        ...baseOptions,
        fetch: (url, options = {}) => {
          const defaultOptions = {
            agent: proxy(this.config.proxyUrl),
          };

          const mergedOptions = {
            ...defaultOptions,
            ...options,
          };
          return nodeFetch(url, mergedOptions);
        },
      });
    } else if(this.config.proxyPass) {
      console.log(`启用反向代理请求:${this.config.proxyPass}`);
      chatGPT = new ChatGPTAPI({
        ...baseOptions,
        apiBaseUrl: this.config.proxyPass,
        fetch: (url, options = {}) => {
          const mergedOptions = {
            ...options,
          };
          return nodeFetch(url, mergedOptions);
        },
      });
    } else {
      console.log('未启用代理请求，可能会失败');
      chatGPT = new ChatGPTAPI({
        ...baseOptions,
        fetch: (url, options = {}) => {
          const mergedOptions = {
            ...options,
          };
          return nodeFetch(url, mergedOptions);
        },
      });
    }
  }
  /**
   * 重置apikey
   * @return {Promise<void>}
   */
  reset () {
    this.chatGPT = null
  }


  async getReply(content, uid) {
    try {
      if(!chatGPT) {
        console.log('看到此消息说明已启用最新版chat gpt 3.5 turbo模型');
        await this.init()
      }
      const { conversationId, text, id } = await this.chatGPT.sendMessage(content, { ...this.chatOption[uid],  timeoutMs: this.config.timeoutMs * 1000 });
      this.chatOption = {
        [uid]: {
          conversationId,
          parentMessageId: id,
        },
      };
      let replys = []
      let message;
      if(this.config.showQuestion) {
        message = `${content}\r-----------\r` + text.replaceAll('\n', '\r');
      } else {
        message = text.replaceAll('\n', '\r');
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
      return []
    }
  }

}

export default OfficialOpenAi;