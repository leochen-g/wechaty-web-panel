import { allConfig } from "../db/configDb.js";
import UnOfficialOpenAi  from '../botInstance/unOfficialOpenAi.js'

let chatGPT = null

export function reset() {
  if(chatGPT) {
    chatGPT.reset();
    chatGPT = null
  }
}

export async function getGptUnOfficialReply(content, uid) {
    const config = await allConfig()
    if (!config.openaiAccessToken) {
      console.log('请到智能微秘书平台配置Openai openaiAccessToken参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai openaiAccessToken参数方可使用' }]
    }
    const chatConfig = {
      token: config.openaiAccessToken,
      debug: config.openaiDebug,
      proxyPass: config.proxyPassUrl, // 反向代理地址
      proxyUrl: config.proxyUrl, // 代理地址
      showQuestion: config.showQuestion, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      systemMessage: config.openaiSystemMessage,
      filter: config.chatFilter,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!chatGPT) {
      chatGPT = new UnOfficialOpenAi(chatConfig)
    }

    return await chatGPT.getReply(content, uid)
}
