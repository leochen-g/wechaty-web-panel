import { allConfig } from "../db/configDb.js";
import DifyAi from "../botInstance/dify.js";

let difyAi = null;
/**
 * 重置实例
 */
export function reset() {
  if(difyAi) {
    difyAi.reset();
    difyAi = null
  }
}

export async function getDifyReply({ content, id, inputs}) {
    const config = await allConfig()
    if (!config.dify_token) {
      console.log('请到智能微秘书平台配置difyAi apikey参数方可使用')
      return [{ type: 1, content: '请到平台配置difyAi apikey参数方可使用' }]
    }
    const chatConfig = {
      token: config.dify_token, // token
      debug: config.openaiDebug,  // 开启调试
      proxyPass: config.dify_baseUrl, // 反向代理地址
      showQuestion: config.showQuestion, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      systemMessage: config.openaiSystemMessage, // 预设promotion
      filter: config.chatFilter,
      isAiAgent: config?.difyAgent || false,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!difyAi) {
      difyAi = new DifyAi(chatConfig)
    }
    return await difyAi.getReply({ content, inputs }, id)
}


export async function getDifySimpleReply({content, id, inputs, config}) {
    if (!config.token) {
        console.log('请到智能微秘书平台配置聊天总结API Token参数方可使用')
        return [{ type: 1, content: '请到平台配置API Token参数方可使用' }]
    }
    const chatConfig = {
        token: config.token, // token
        debug: config.debug,  // 开启调试
        proxyPass: config.baseUrl, // 反向代理地址
        showQuestion: false, // 显示原文
        timeoutMs: config.timeout, // 超时时间 s
        systemMessage: '', // 预设promotion
        isAiAgent: true,
    }

    return await new DifyAi(chatConfig).getReply({content, inputs }, id)
}
