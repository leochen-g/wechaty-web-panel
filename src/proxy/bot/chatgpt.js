import OfficialOpenAi from "../../lib/officialOpenAi.js";

let chatGPT = {}

export function reset(adminId) {
  if(!chatGPT[adminId]) return
  chatGPT[adminId].reset();
}

export function resetAll() {
  Object.keys(chatGPT).forEach(key => {
    if(chatGPT[key]) {
      chatGPT[key].reset()
    }
  })
  chatGPT = {}
}
export async function getChatGPTReply(content, uid, adminId, config = { token: "", debug: false, proxyPass: "", proxyUrl: "", showQuestion: false, timeoutMs: 0, model: "", systemMessage: "" }) {
    if (!config.token) {
      console.log('请到智能微秘书平台配置Openai apikey参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai apikey参数方可使用' }]
    }

    if(!chatGPT[adminId]) {
      chatGPT[adminId] = new OfficialOpenAi(config)
    }
    return await chatGPT[adminId].getReply(content, uid)
}