import { allConfig } from "../db/configDb.js";
import OfficialOpenAi from "../botInstance/officialOpenAi.js";

let chatGPT = null;
/**
 * 重置实例
 */
export function reset() {
  if(chatGPT) {
    chatGPT.reset();
    chatGPT = null
  }
}

export async function getGptOfficialReply(content, uid, isFastGPT) {
    const config = await allConfig()
    if (!config.gpttoken) {
      console.log('请到智能微秘书平台配置Openai apikey参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai apikey参数方可使用' }]
    }
    const chatConfig = {
      token: config.gpttoken, // token
      debug: config.openaiDebug,  // 开启调试
      proxyPass: config.proxyPassUrl, // 反向代理地址
      proxyUrl: config.proxyUrl, // 代理地址
      showQuestion: config.showQuestion, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      model: config.openaiModel, // 模型
      systemMessage: config.openaiSystemMessage, // 预设promotion
      filter: config.chatFilter,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!chatGPT) {
      chatGPT = new OfficialOpenAi(chatConfig)
    }
    return await chatGPT.getReply(content, uid, '', '', isFastGPT)
}
