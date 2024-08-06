import { allConfig } from "../db/configDb.js";
import QAnyAi from "../botInstance/qany.js";

let chatQAny = null;
/**
 * 重置实例
 */
export function reset() {
  if(chatQAny) {
    chatQAny.reset();
    chatQAny = null
  }
}

export async function getQAnyReply(content, uid) {
    const config = await allConfig()
    if (!config.qany_token || !config.qany_botId) {
      console.log('请到智能微秘书平台配置Coze Token 和 botId参数方可使用')
      return [{ type: 1, content: '请到平台配置Coze Token 和 botId 参数方可使用' }]
    }
    const chatConfig = {
      token: config.qany_token, // token
      debug: config.openaiDebug,  // 开启调试
      botId: config.qany_botId,
      proxyPass: config.qany_baseUrl, // 反向代理地址
      showQuestion: config.showQuestion, // 显示原文
      timeoutMs: config.openaiTimeout, // 超时时间 s
      filter: config.chatFilter,
      filterConfig: {
        type: 1,
        appId: config.filterAppid,
        apiKey: config.filterApiKey,
        secretKey: config.filterSecretKey
      }
    }
    if(!chatQAny) {
      chatQAny = new QAnyAi(chatConfig)
    }
    return await chatQAny.getReply(content, uid, '', '')
}


export async function getQAnySimpleReply({content, uid, config}) {
    if (!config.token || !config.botId) {
        console.log('请到智能微秘书平台配置聊天总结的QAnything Token 和 botId参数方可使用')
        return [{ type: 1, content: '请到平台配置聊天总结的QAnything Token 和 botId 参数方可使用' }]
    }
    const chatConfig = {
        token: config.token, // token
        debug: config.debug,  // 开启调试
        botId: config.botId,
        proxyPass: config.baseUrl, // 反向代理地址
        showQuestion: false, // 显示原文
        showSuggestions: false, // 显示原文
        timeoutMs: config.timeout, // 超时时间 s
    }

    return await new QAnyAi(chatConfig).getReply(content, uid, '', '')
}
