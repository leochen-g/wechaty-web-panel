import {Chat4VClient} from "./sdk/chatGPT4V.js";
import { getPuppetEol } from "../const/puppet-type.js";


class Gpt4vision {
  constructor(config = {
    token: '', // token
    debug: 0,  // 开启调试
    proxyPass: '', // 反向代理地址
    timeoutMs: 60, // 超时时间 s
    model: 'gpt-4-vision-preview', // 模型
    visionMessage: '', // 预设图片识别message
  }) {
    this.chatGPT = null;
    this.config = config;
    this.eol = '\n'
  }


  async init() {
    this.eol = await getPuppetEol();
    const baseOptions = {
      apiKey: this.config.token,
      completionParams: { model: this.config.model },
      debug: this.config.debug,
      systemMessage: this.config.visionMessage || '',
    }

    if(this.config.proxyPass) {
      console.log(`启用反向代理请求:${this.config.proxyPass}`);
      this.chatGPT = new Chat4VClient({
        ...baseOptions,
        baseUrl: this.config.proxyPass,
      });
    } else {
      console.log('未启用代理请求，可能会失败');
      this.chatGPT = new Chat4VClient({
        ...baseOptions
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


  async getReply(content, uid, adminId = '', systemMessage = '', isFastGPT) {
    try {
      if(!this.chatGPT) {
        console.log(isFastGPT ? '看到此消息说明启用了fastgpt4v' : '看到此消息说明已启用GPT4V模型');
        await this.init()
      }

      const sendParams = { timeoutMs: this.config.timeoutMs * 1000 || 180 * 1000 }
      if(systemMessage) {
        sendParams.systemMessage = systemMessage;
      }
      if(isFastGPT) {
        sendParams.chatId = uid;
      }
      const { text } = await this.chatGPT.sendImage(content, sendParams);

      let replys = []
      let message = text.replaceAll('\n', this.eol);

      while (message.length > 700) {
        replys.push(message.slice(0, 700));
        message = message.slice(700);
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
      console.log('gpt4v报错：'+ e);
      return []
    }
  }
}

export default Gpt4vision;
