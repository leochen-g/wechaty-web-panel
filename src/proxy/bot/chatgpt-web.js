import UnOfficialOpenAi  from '../../lib/unOfficialOpenAi.js'

let chatGPT = {}

export function reset(adminId) {
  if(!chatGPT[adminId]) return
  chatGPT[adminId].reset();
  chatGPT[adminId] = null;
}

export function resetAll() {
  Object.keys(chatGPT).forEach(key => {
    if(chatGPT[key]) {
      chatGPT[key].reset()
    }
  })
  chatGPT = {}
}

export async function getChatGPTWebReply(content, uid, adminId, config={ token: "", debug: false, proxyPass: "", proxyUrl: "", systemMessage:'', showQuestion: false, timeoutMs: 0 }) {
    if (!config.token) {
      console.log('请到智能微秘书平台配置openaiAccessToken参数方可使用')
      return [{ type: 1, content: '请到平台配置Openai openaiAccessToken参数方可使用' }]
    }

    if(!chatGPT[adminId]) {
      chatGPT[adminId] = new UnOfficialOpenAi(config)
    }

    return await chatGPT[adminId].getReply(content, uid, adminId)
}