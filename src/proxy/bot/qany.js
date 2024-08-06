import QAnyAi from "../../botInstance/qany.js";

let chatQAny = {}

export function reset(adminId) {
  if(!chatQAny[adminId]) return
  chatQAny[adminId].reset();
  chatQAny[adminId] = null;
}

export function resetAll() {
  Object.keys(chatQAny).forEach(key => {
    if(chatQAny[key]) {
      chatQAny[key].reset()
    }
  })
  chatQAny = {}
}
export async function getQAnyReply(content, uid, adminId, config = { token: "", debug: false, proxyPass: "", proxyUrl: "", timeoutMs: 180 }) {
    if (!config.token || !config.botId) {
      console.log('请到智能微秘书平台配置QAnything token 和 botId参数方可使用')
      return [{ type: 1, content: '请到平台配置QAnything token 和 botId参数方可使用' }]
    }

    if(!chatQAny[adminId]) {
      chatQAny[adminId] = new QAnyAi(config)
    }

    return await chatQAny[adminId].getReply(content, uid, adminId, '')
}
