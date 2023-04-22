import { getChatGPTReply } from "./chatgpt.js";
import { getChatGPTWebReply } from "./chatgpt-web.js";
import { updateOneGptConfig, getGptConfigById } from "../../db/gptConfig.js";
import { updateChatRecord } from "../aibotk.js";

/**
 * 消息转发
 * @param {botType: 机器人类别, content: 消息内容, uid: 说话的用户id, updateId: 更新的用户id, adminId: 对话实例id，用于分割不同配置, config: 机器人配置}
 * @returns 
 */
export async function dispatchBot({botType, content, uid, adminId, config}) {
   console.log('进入定制机器人回复');
    try {
      const gptConfig = await getGptConfigById(adminId);
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
      if(replys.length) {
        void updateChatRecord(adminId, gptConfig.usedNum + 1)
        void updateOneGptConfig(adminId, { ...gptConfig, usedNum: gptConfig.usedNum + 1 })
      }
      return replys
    } catch (e) {
      console.log('机器人接口信息获取失败', e)
      return []
    }
  }