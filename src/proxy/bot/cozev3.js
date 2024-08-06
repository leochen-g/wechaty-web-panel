import CozeV3Ai from "../../botInstance/cozev3.js";
import { getPromotInfo } from "../aibotk.js";

let cozeV3Ai = {}

export function reset(adminId) {
  if(!cozeV3Ai[adminId]) return
  cozeV3Ai[adminId].reset();
  cozeV3Ai[adminId] = null;
}

export function resetAll() {
  Object.keys(cozeV3Ai).forEach(key => {
    if(cozeV3Ai[key]) {
      cozeV3Ai[key].reset()
    }
  })
  cozeV3Ai = {}
}
export async function getCozeV3AiReply({ content, inputs }, uid, adminId, config = { token: "", botId : '', debug: false, proxyPass: "", proxyUrl: "", showQuestion: false, stream: false, timeoutMs: 180, systemMessage: "", keywordSystemMessages: [] }) {
  if (!config.token  || !config.botId) {
    console.log('请到智能微秘书平台配置Coze的 api秘钥方可使用')
    return [{ type: 1, content: '请到智能微秘书平台配置Coze的 api秘钥方可使用' }]
  }

  if(!cozeV3Ai[adminId]) {
    cozeV3Ai[adminId] = new CozeV3Ai(config)
  }
  let systemMessage = ''
  if(config.keywordSystemMessages && config.keywordSystemMessages.length) {
    const finalSystemMsg = config.keywordSystemMessages.find(item=> content.startsWith(item.keyword))
    if(finalSystemMsg && finalSystemMsg.promotId) {
      const promotInfo = await getPromotInfo(finalSystemMsg.promotId)
      console.log(`触发关键词角色功能，使用对应预设角色:${promotInfo.name}`);
      systemMessage = promotInfo.promot
      content = content.replace(finalSystemMsg.keyword, '')
    }
  }
  return await cozeV3Ai[adminId].getReply({ content, inputs }, uid, adminId, systemMessage)
}
