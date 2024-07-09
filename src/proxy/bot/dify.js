import DifyAi from "../../botInstance/dify.js";
import { getPromotInfo } from "../aibotk.js";

let difyAi = {}

export function reset(adminId) {
  if(!difyAi[adminId]) return
  difyAi[adminId].reset();
  difyAi[adminId] = null;
}

export function resetAll() {
  Object.keys(difyAi).forEach(key => {
    if(difyAi[key]) {
      difyAi[key].reset()
    }
  })
  difyAi = {}
}
export async function getDifyAiReply({ content, inputs }, uid, adminId, config = { token: "", debug: false, proxyPass: "", proxyUrl: "", showQuestion: false, timeoutMs: 80, model: "", systemMessage: "", keywordSystemMessages: [], isAiAgent: false }) {
  if (!config.token) {
    console.log('请到智能微秘书平台配置Dify的 api秘钥方可使用')
    return [{ type: 1, content: '请到智能微秘书平台配置Dify的 api秘钥方可使用' }]
  }

  if(!difyAi[adminId]) {
    difyAi[adminId] = new DifyAi(config)
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
  return await difyAi[adminId].getReply({ content, inputs }, uid, adminId, systemMessage)
}
