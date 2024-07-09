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

export async function getGptOfficialReply(content, uid, isFastGPT, variables) {
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
      temperature: config?.temperature, // 温度
      top_p: config?.top_p, // 随机值
      presence_penalty: config?.presence_penalty, // 离散值
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
    return await chatGPT.getReply(content, uid, '', '', isFastGPT, variables)
}



export async function getSimpleGptReply({content, uid, config, isFastGPT, variables}) {
    if (!config.token) {
        console.log('请到智能微秘书平台配置聊天总结的API Token参数方可使用')
        return [{ type: 1, content: '请到平台配置聊天总结的API Token参数方可使用' }]
    }
    const chatConfig = {
        token: config.token, // token
        debug: config.debug,  // 开启调试
        proxyPass: config.baseUrl, // 反向代理地址
        proxyUrl: '', // 代理地址
        showQuestion: false, // 显示原文
        timeoutMs: config.timeout, // 超时时间 s
        model: config.model, // 模型
        systemMessage: config.prompt, // 预设promotion
    }

    return await new OfficialOpenAi(chatConfig).getReply(content, uid, '', '', isFastGPT, variables)
}
