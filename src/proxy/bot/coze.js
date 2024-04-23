import CozeAi from "../../botInstance/coze.js";
import { getPromotInfo } from "../aibotk.js";

let chatCoze = {}

export function reset(adminId) {
  if(!chatCoze[adminId]) return
  chatCoze[adminId].reset();
  chatCoze[adminId] = null;
}

export function resetAll() {
  Object.keys(chatCoze).forEach(key => {
    if(chatCoze[key]) {
      chatCoze[key].reset()
    }
  })
  chatCoze = {}
}
export async function getCozeReply(content, uid, adminId, config = { token: "", debug: false, proxyPass: "", proxyUrl: "", showQuestion: false, timeoutMs: 80, model: "", systemMessage: "", keywordSystemMessages: [] }) {
    if (!config.token || !config.botId) {
      console.log('请到智能微秘书平台配置Coze token 和 botId参数方可使用')
      return [{ type: 1, content: '请到平台配置Coze token 和 botId参数方可使用' }]
    }

    if(!chatCoze[adminId]) {
      chatCoze[adminId] = new CozeAi(config)
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
    return await chatCoze[adminId].getReply(content, uid, adminId, systemMessage)
}
