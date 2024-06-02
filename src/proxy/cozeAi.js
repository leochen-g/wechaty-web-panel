import { allConfig } from "../db/configDb.js";
import CozeAi from "../botInstance/coze.js";

let chatCoze = null;
/**
 * 重置实例
 */
export function reset() {
  if(chatCoze) {
    chatCoze.reset();
    chatCoze = null
  }
}

export async function getCozeReply(content, uid) {
    const config = await allConfig()
    if (!config.coze_token || !config.coze_botId) {
      console.log('请到智能微秘书平台配置Coze Token 和 botId参数方可使用')
      return [{ type: 1, content: '请到平台配置Coze Token 和 botId 参数方可使用' }]
    }
    const chatConfig = {
      token: config.coze_token, // token
      debug: config.openaiDebug,  // 开启调试
      botId: config.coze_botId,
      proxyPass: config.coze_baseUrl, // 反向代理地址
      showQuestion: config.showQuestion, // 显示原文
      showSuggestions: config.coze_showSuggestions, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      systemMessage: config.openaiSystemMessage, // 预设promotion
      filter: config.chatFilter,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!chatCoze) {
      chatCoze = new CozeAi(chatConfig)
    }
    return await chatCoze.getReply(content, uid, '', '')
}


export async function getCozeSimpleReply({content, uid, config}) {
    if (!config.token || !config.botId) {
        console.log('请到智能微秘书平台配置聊天总结的Coze Token 和 botId参数方可使用')
        return [{ type: 1, content: '请到平台配置聊天总结的Coze Token 和 botId 参数方可使用' }]
    }
    const chatConfig = {
        token: config.token, // token
        debug: config.debug,  // 开启调试
        botId: config.botId,
        proxyPass: config.baseUrl, // 反向代理地址
        showQuestion: false, // 显示原文
        showSuggestions: false, // 显示原文
        timeoutMs: config.timeout, // 超时时间 s
        systemMessage: '', // 预设promotion
    }

    return await new CozeAi(chatConfig).getReply(content, uid, '', '')
}
