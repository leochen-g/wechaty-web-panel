import { allConfig } from "../db/configDb.js";
import CozeV3Ai from "../botInstance/cozev3.js";

let cozeV3Ai = null;
/**
 * 重置实例
 */
export function reset() {
  if(cozeV3Ai) {
    cozeV3Ai.reset();
    cozeV3Ai = null
  }
}

export async function getCozeV3Reply({ content, id, inputs}) {
    const config = await allConfig()
    if (!config.cozev3_token || !config.cozev3_botId) {
      console.log('请到智能微秘书平台配置Coze token 和 botId参数方可使用')
      return [{ type: 1, content: '请到平台配置Coze token 和 botId参数方可使用' }]
    }
    const chatConfig = {
      token: config.cozev3_token, // token
      botId: config.cozev3_botId, // botId
      debug: config.openaiDebug,  // 开启调试
      proxyPass: config.cozev3_baseUrl, // 反向代理地址
      showQuestion: config.showQuestion, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      systemMessage: config.openaiSystemMessage, // 预设promotion
      filter: config.chatFilter,
      stream: config?.stream || false,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!cozeV3Ai) {
      cozeV3Ai = new CozeV3Ai(chatConfig)
    }
    return await cozeV3Ai.getReply({ content, inputs }, id)
}


export async function getCozeV3SimpleReply({content, id, inputs, config}) {
    if (!config.token) {
        console.log('请到智能微秘书平台配置聊天总结API Token参数方可使用')
        return [{ type: 1, content: '请到平台配置API Token参数方可使用' }]
    }
    const chatConfig = {
        token: config.token, // token
        debug: config.debug,  // 开启调试
        proxyPass: config.baseUrl, // 反向代理地址
        botId: config.botId, // botId
        showQuestion: false, // 显示原文
        timeoutMs: config.timeout, // 超时时间 s
        systemMessage: '', // 预设promotion
        stream: false,
    }

    return await new CozeV3Ai(chatConfig).getReply({content, inputs }, id)
}
