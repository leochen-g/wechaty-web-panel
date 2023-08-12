import proxy from "https-proxy-agent";
import nodeFetch from "node-fetch";
import { ChatGPTUnofficialProxyAPI }  from './sdk/chatGPT.js'
import { addAichatRecord } from "../db/aichatDb.js";
import dayjs from "dayjs";
import { getPromotInfo } from "../proxy/aibotk.js";
import { getPuppetEol } from "../const/puppet-type.js";

class UnOfficialOpenAi {
  constructor(config = {
    token: '', // token
    debug: true,  // 开启调试
    proxyPass: '', // 反向代理地址
    proxyUrl: '', // 代理地址
    showQuestion: false, // 显示原文
    systemMessage: '', // 预设promotion
    timeoutMs: 60 // 超时时间 s
  }) {
    this.chatGPT = null;
    this.config = config
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
    const baseOptions = {
      accessToken: this.config.token,
      debug: this.config.debug,
      apiReverseProxyUrl: 'https://bypass.churchless.tech/api/conversation'
    }

    if(this.config.proxyUrl) {
      console.log(`启用代理请求:${this.config.proxyUrl}`);
      this.chatGPT = new ChatGPTUnofficialProxyAPI({
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
      return
    } else if(this.config.proxyPass) {
      console.log(`启用反向代理:${this.config.proxyPass}`);
      baseOptions.apiReverseProxyUrl = this.config.proxyPass
    }

    this.chatGPT = new ChatGPTUnofficialProxyAPI({
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
   * 重置实例
   * @return {Promise<void>}
   */
  reset() {
    this.chatGPT = null
  }

  async getReply(content, uid, adminId = '', systemMessage =  '') {
    try {
      if(!this.chatGPT) {
        console.log('看到此消息说明已启用chatGPT 网页hook版');
        await this.init()
      }
      let question = this.config.systemMessage ? this.config.systemMessage + content : content;
      if(systemMessage || content === 'reset' || content === '重置') {
        question = systemMessage + content
        console.log('重新更新上下文对话');
        this.chatOption[uid] = {}
      }

      const { conversationId, text, id } = systemMessage ? await this.chatGPT.sendMessage(question, { ...this.chatOption[uid], systemMessage, timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000 }):await this.chatGPT.sendMessage(question, { ...this.chatOption[uid], timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000 });
      if(this.config.record) {
        void addAichatRecord({
          contactId: uid,
          adminId,
          input: content,
          output: text,
          time: dayjs().format('YYYY-MM-DD HH:mm:ss')
        })
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
        message = `${content}${this.eol}----------${this.eol}` + text.replaceAll('\n', this.eol);
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

export default UnOfficialOpenAi;

