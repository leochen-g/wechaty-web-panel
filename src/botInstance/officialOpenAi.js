import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";
import {ChatGPTAPI} from "./sdk/chatGPT.js";
import { addAichatRecord } from "../db/aichatDb.js";
import { getPromotInfo } from "../proxy/aibotk.js";
import { ContentCensor } from "../lib/contentCensor.js";
import { getPuppetEol } from "../const/puppet-type.js";
import dayjs from "dayjs";
let chatGPT = null


class OfficialOpenAi {
  constructor(config = {
    token: '', // token
    debug: 0,  // 开启调试
    proxyPass: '', // 反向代理地址
    proxyUrl: '', // 代理地址
    showQuestion: true, // 显示原文
    timeoutMs: 60, // 超时时间 s
    model: '', // 模型
    promotId: '',
    systemMessage: '', // 预设promotion
  }) {
    this.chatGPT = null;
    this.config = config;
    this.contentCensor = null
    this.chatOption = {};
    this.eol = '\n'
  }


  async init() {
    this.eol = await getPuppetEol();
    if(this.config.promotId) {
      const promotInfo = await getPromotInfo(this.config.promotId)
      if(promotInfo) {
        this.config.systemMessage = promotInfo.promot
      }
    }
    if(this.config.filter) {
        this.contentCensor = new ContentCensor(this.config.filterConfig)
    }
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
    if (this.config.model.toLowerCase().includes('gpt-3.5-turbo-16k')) {
      baseOptions.maxModelTokens = 16384
      baseOptions.maxResponseTokens = 4096
    }

    if(this.config.proxyUrl) {
      console.log(`启用代理请求:${this.config.proxyUrl}`);
      this.chatGPT = new ChatGPTAPI({
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
      this.chatGPT = new ChatGPTAPI({
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
      this.chatGPT = new ChatGPTAPI({
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


  async getReply(content, uid, adminId = '', systemMessage = '') {
    try {
      if(!this.chatGPT) {
        console.log('看到此消息说明已启用最新版chat gpt 3.5 turbo模型');
        await this.init()
      }
      if(this.config.filter) {
        const censor = await this.contentCensor.checkText(content)
        if(!censor) {
          console.log(`问题:${content},包含违规词，已拦截`);
          return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
        }
      }
      if(systemMessage || content === 'reset' || content === '重置') {
        console.log('重新更新上下文对话');
        this.chatOption[uid] = {}
      }
      const { conversationId, text, id } = systemMessage ? await this.chatGPT.sendMessage(content, { ...this.chatOption[uid], systemMessage, timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000 }) : await this.chatGPT.sendMessage(content, { ...this.chatOption[uid], timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000 });
      if(this.config.filter) {
        const censor = await this.contentCensor.checkText(text)
        if(!censor) {
          console.log(`回复: ${text},包含违规词，已拦截`);
          return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
        }
      }
      if(this.config.record) {
        void addAichatRecord({ contactId: uid, adminId, input: content, output: text, time: dayjs().format('YYYY-MM-DD HH:mm:ss') })
      }
      this.chatOption = {
        [uid]: {
          conversationId,
          parentMessageId: id,
        },
      };
      let replys = []
      let message;
      if(this.config.showQuestion) {
        message = `${content}${this.eol}-----------${this.eol}` + text.replaceAll('\n', this.eol);
      } else {
        message = text.replaceAll('\n', this.eol);
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
