import { QAnyApi } from './sdk/qanything.js'
import { addAichatRecord } from '../db/aichatDb.js'
import { ContentCensor } from '../lib/contentCensor.js'
import { getPuppetEol, isWindowsPlatform } from '../const/puppet-type.js'
import dayjs from 'dayjs'
import { extractImageLinks } from '../lib/index.js'
import {getText2Speech} from "../proxy/multimodal.js";

class QAnyAi {
  constructor(config = {
    token: '', // api 秘钥
    botId: '', // botId
    proxyPass: '', // 请求地址
    showQuestion: true, // 显示原文
    showSuggestions: false, // 显示建议问题
    timeoutMs: 180, // 超时时间 s
    promotId: '',
    systemMessage: '' // 预设promotion
  }) {
    this.qanyChat = null
    this.config = { ...config }
    this.contentCensor = null
    this.chatOption = {}
    this.eol = '\n'
    this.iswindows = false
  }


  async init() {
    this.eol = await getPuppetEol()
    this.iswindows = await isWindowsPlatform()
    if (this.config.filter) {
      this.contentCensor = new ContentCensor(this.config.filterConfig)
    }
    const baseOptions = {
      apiKey: this.config.token,
      apiBaseUrl: this.config.proxyPass,
      debug: !!this.config.debug,
      botId: this.config.botId,
    }

    console.log(`api请求地址:${this.config.proxyPass}`)
    this.qanyChat = new QAnyApi({
      ...baseOptions,
    })
  }

  /**
   * 重置apikey
   * @return {Promise<void>}
   */
  reset() {
    this.qanyChat = null
  }


  async getReply(content, uid, adminId = '', systemMessage = '') {
    try {
      if (!this.qanyChat) {
        console.log('启用QAnything对话平台')
        await this.init()
      }
      if (this.config.filter) {
        const censor = await this.contentCensor.checkText(content)
        if (!censor) {
          console.log(`问题:${content},包含违规词，已拦截`)
          return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
        }
      }
      if (content === 'reset' || content === '重置') {
        console.log('重新更新上下文对话')
        this.chatOption[uid] = {
          needHistory: false
        }
        if (content === 'reset' || content === '重置') {
          return [{ type: 1, content: '上下文已重置' }]
        }
      }
      const { text, id } = await this.qanyChat.sendMessage(content, {
        ...this.chatOption[uid],
        timeoutMs: this.config.timeoutMs * 1000 || 180 * 1000,
        user: uid
      })
      if (this.config.filter) {
        const censor = await this.contentCensor.checkText(text)
        if (!censor) {
          console.log(`回复: ${text},包含违规词，已拦截`)
          return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
        }
      }
      if (this.config.record) {
        void addAichatRecord({
          contactId: uid,
          adminId,
          input: content,
          output: text,
          time: dayjs().format('YYYY-MM-DD HH:mm:ss')
        })
      }
      // 保存对话id 对于同一个用户的对话不更新conversationId

      this.chatOption[uid] = {
       needHistory: true
      }
      let replys = []
      if(this.config?.openTTS) {
        replys = await getText2Speech(text, this.config.ttsConfig)
        if(replys.length) {
          return replys
        }
      }
      let message
      if (this.config.showQuestion) {
        message = `${content}${this.eol}-----------${this.eol}` + (this.iswindows ? text.replaceAll('\n', this.eol) : text)
      } else {
        message = this.iswindows ? text.replaceAll('\n', this.eol) : text
      }

      const imgs = extractImageLinks(message)

      while (message.length > 1500) {
        replys.push(message.slice(0, 1500))
        message = message.slice(1500)
      }
      replys.push(message)
      replys = replys.map(item => {
        return {
          type: 1,
          content: item.trim()
        }
      })

      if (imgs.length) {
        console.log('提取到内容中的图片', imgs)
        replys = replys.concat(imgs)
      }

      return replys
    } catch (e) {
      console.log('QAnything请求报错：' + e)
      return []
    }
  }
}

export default QAnyAi
