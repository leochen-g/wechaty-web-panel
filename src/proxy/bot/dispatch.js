import { getChatGPTReply } from "./chatgpt.js";
import { getChatGPTWebReply } from "./chatgpt-web.js";

/**
 * 消息转发
 * @param {botType: 机器人类别, content: 消息内容, uid: 说话的用户id, updateId: 更新的用户id, adminId: 对话实例id，用于分割不同配置, config: 机器人配置}
 * @returns 
 */
export async function dispatchBot({botType, content, uid, updateId, adminId, config}) {
    try {
      let res, replys
      switch (botType) {
        case 6:
          // ChatGPT api
          res = await getChatGPTReply(content, uid, adminId, config)
          replys = res
          break
        case 7:
          // ChatGPT web
          console.log('进入聊天');
          res = await getChatGPTWebReply(content, uid, adminId, config)
          replys = res
          break
        default:
          replys = []
          break
      }
      return replys
    } catch (e) {
      console.log('机器人接口信息获取失败', e)
      return []
    }
  }