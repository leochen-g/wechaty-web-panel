import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";
import {ChatGPTAPI} from "./sdk/chatGPT.js";
import { addAichatRecord } from "../db/aichatDb.js";
import { getPromotInfo } from "../proxy/aibotk.js";
import { ContentCensor } from "../lib/contentCensor.js";
import { getPuppetEol, isWindowsPlatform } from '../const/puppet-type.js'
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import { extractImageLinks } from '../lib/index.js'
import {getText2Speech} from "../proxy/multimodal.js";
let chatGPT = null


class OfficialOpenAi {
  constructor(config = {
    temperature: 0.8,
    top_p: 1,
    presence_penalty: 1,
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
    this.iswindows = false;
  }


  async init() {
    this.eol = await getPuppetEol();
    this.iswindows = await isWindowsPlatform()
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
      completionParams: { model: this.config.model, temperature: this.config?.temperature || 0.8, top_p: this.config?.top_p || 1, presence_penalty: this.config?.presence_penalty || 1 },
      debug: this.config.debug,
      systemMessage: this.config.systemMessage || '',
    }
    // increase max token limit if use gpt-4
    if (this.config.model.toLowerCase().includes('gpt-4')) {
      // if use 32k model
      if (this.config.model.toLowerCase().includes('32k')) {
        baseOptions.maxModelTokens = 32768
        baseOptions.maxResponseTokens = 8192
      }// if use GPT-4 Turbo preview 4o
      else if (this.config.model.toLowerCase().includes('-preview') || this.config.model.toLowerCase().includes('-turbo') || this.config.model.toLowerCase().includes('gpt-4o')) {
        baseOptions.maxModelTokens = 128000
        baseOptions.maxResponseTokens = 4096
      } else {
        baseOptions.maxModelTokens = 8192
        baseOptions.maxResponseTokens = 4096
      }
    }
    if (this.config.model.toLowerCase().includes('gpt-3.5')) {
      if (this.config.model.toLowerCase() === 'gpt-3.5-turbo' || this.config.model.toLowerCase().includes('16k') || this.config.model.toLowerCase().includes('turbo-1106') || this.config.model.toLowerCase().includes('turbo-0125')) {
        baseOptions.maxModelTokens = 16385
        baseOptions.maxResponseTokens = 4096
      } else {
        baseOptions.maxModelTokens = 4096
        baseOptions.maxResponseTokens = 1024
      }
    }

    if (this.config?.modelMaxToken) {
      baseOptions.maxModelTokens = this.config.modelMaxToken;
    }

    if (this.config?.maxToken) {
      baseOptions.maxResponseTokens = this.config.maxToken;
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


  async getReply(content, uid, adminId = '', systemMessage = '', isFastGPT, variables) {
    try {
      if(!this.chatGPT) {
        console.log(isFastGPT ? '看到此消息说明启用了FastGPT' : '看到此消息说明已启用ChatGPT');
        await this.init()
      }
      if(this.config.filter) {
        const censor = await this.contentCensor.checkText(content)
        if(!censor) {
          console.log(`问题:${content},包含违规词，已拦截`);
          return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
        }
      }
      const resetWord = ['reset', '重置', '重置对话', '忽略上下文', '重置上下文', '重新开始', '清除对话', '清除上下文']
      if(systemMessage || resetWord.includes(content)) {
        console.log('重新更新上下文对话');
        this.chatOption[uid] = null
        if(content === 'reset' || content === '重置') {
          return [{type: 1, content: '上下文已重置'}]
        }
      }

      if(isFastGPT && !this.chatOption[uid]) {
        this.chatOption[uid] = {
          chatId: uuidv4()
        }
      }


      const sendParams = { ...this.chatOption[uid], timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000 }
      if(systemMessage) {
        sendParams.systemMessage = systemMessage;
      }

      if(isFastGPT && variables) {
        sendParams.variables = variables
      }

      const { conversationId, text, id } = await this.chatGPT.sendMessage(content, sendParams);

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
      if(isFastGPT) {
        this.chatOption[uid] = {
          chatId: this.chatOption[uid].chatId
        }
      } else {
        this.chatOption[uid] = {
            conversationId,
            parentMessageId: id,
        };
      }

      let replys = []
      if(this.config?.openTTS) {
        replys = await getText2Speech(text, this.config.ttsConfig)
        if(replys.length) {
          return replys
        }
      }
      let message;
      if(this.config.showQuestion) {
        message = `${content}${this.eol}-----------${this.eol}` + (this.iswindows ? text.replaceAll('\n', this.eol) : text);
      } else {
        message = this.iswindows ? text.replaceAll('\n', this.eol): text;
      }
      const imgs = extractImageLinks(message)
      console.log('imgs', imgs)
      while (message.length > 1500) {
        replys.push(message.slice(0, 1500));
        message = message.slice(1500);
      }
      replys.push(message);
      replys = replys.map(item=> {
        return {
          type: 1,
          content: item.trim()
        }
      })
      if(imgs.length) {
        console.log('提取到内容中的图片', imgs)
        replys = replys.concat(imgs)
      }
      return replys
    } catch (e) {
      console.log('chat gpt报错：'+ e);
      return []
    }
  }
}

export default OfficialOpenAi;
