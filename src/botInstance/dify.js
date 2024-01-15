import {ChatClient} from "./sdk/difyClient.js";
import { addAichatRecord } from "../db/aichatDb.js";
import { getPromotInfo } from "../proxy/aibotk.js";
import { ContentCensor } from "../lib/contentCensor.js";
import { getPuppetEol } from "../const/puppet-type.js";
import dayjs from "dayjs";
import { extractImageLinks } from '../lib/index.js'


class DifyAi {
  constructor(config = {
    token: '', // api 秘钥
    proxyPass: '', // 请求地址
    showQuestion: true, // 显示原文
    timeoutMs: 60, // 超时时间 s
    promotId: '',
    systemMessage: '', // 预设promotion
  }) {
    console.log('difyAi config', config);
    this.difyChat = null;
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
      debug: !!this.config.debug,
      systemMessage: this.config.systemMessage || '',
    }

      console.log(`api请求地址:${this.config.proxyPass}`);
      this.difyChat = new ChatClient({
        ...baseOptions,
        baseUrl: this.config.proxyPass,
      });
  }
  /**
   * 重置apikey
   * @return {Promise<void>}
   */
  reset () {
    this.difyChat = null
  }


  async getReply(content, uid, adminId = '', systemMessage = '') {
    try {
      if(!this.difyChat) {
        console.log('启用dify对话平台');
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
        if(content === 'reset' || content === '重置') {
          return [{type: 1, content: '上下文已重置'}]
        }
      }
      console.log('this.chatOption[uid]', this.chatOption[uid]);
      const { conversationId, text } = systemMessage ? await this.difyChat.sendMessage(content, { ...this.chatOption[uid], systemMessage, timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000, user: uid }) : await this.difyChat.sendMessage(content, { ...this.chatOption[uid], timeoutMs: this.config.timeoutMs * 1000 || 80 * 1000, user: uid });
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
      // 保存对话id 对于同一个用户的对话不更新conversationId
      if(!this.chatOption[uid]?.conversationId) {
        this.chatOption[uid] = {
            conversationId
        };
      }
      let replys = []
      let message;
      if(this.config.showQuestion) {
        message = `${content}${this.eol}-----------${this.eol}` + text.replaceAll('\n', this.eol);
      } else {
        message = text.replaceAll('\n', this.eol);
      }
      const imgs = extractImageLinks(message)

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
      console.log('dify 请求报错：'+ e);
      return []
    }
  }

}

export default DifyAi;
