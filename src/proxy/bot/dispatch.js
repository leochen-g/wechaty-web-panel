import { getChatGPTReply } from "./chatgpt.js";
import { getDifyAiReply } from "./dify.js";
import { getCozeReply } from './coze.js'
import { getCozeV3AiReply } from './cozev3.js'
import { getQAnyReply } from './qany.js'
import { updateChatRecord } from "../aibotk.js";
import globalConfig from '../../db/global.js'
import {getUser} from "../../db/userDb.js";

/**
 * 消息转发
 * @param {botType: 机器人类别, content: 消息内容, uid: 说话的用户id, updateId: 更新的用户id, adminId: 对话实例id，用于分割不同配置, config: 机器人配置}
 * @returns
 */
export async function dispatchBot({botType, userAlias, userWeixin, content, id, uid, uname, roomId, roomName, adminId, config}) {
   console.log('进入定制机器人回复');
    try {
      const contactSelf = await getUser()
      const gptConfig = globalConfig.getGptConfigById(adminId);
      let res, replys
      switch (botType) {
        case 6:
          // ChatGPT api
          res = await getChatGPTReply({ content }, id, adminId, config, false)
          replys = res
          break
        case 8:
          // dify ai
          console.log('进入Dify聊天');
          res = await getDifyAiReply({ content, inputs: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } }, id, adminId, config)
          replys = res
          break
        case 9:
          // fastGPT api
          console.log('进入FastGPT聊天');
          res = await getChatGPTReply({ content, variables: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } }, id, adminId, config, true)
          replys = res
          break
        case 11:
          // coze api
          console.log('进入Coze V2聊天');
          res = await getCozeReply(content, id, adminId, config)
          replys = res
          break
        case 12:
          // coze v3 api
          console.log('进入Coze V3聊天');
          res = await getCozeV3AiReply({ content, inputs: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } }, id, adminId, config)
          replys = res
          break
        case 13:
          // QAnything api
          console.log('进入有道QAnything聊天');
          res = await getQAnyReply(content, id, adminId, config)
          replys = res
          break
        default:

          replys = []
          break
      }
      if(replys.length) {
        void updateChatRecord(adminId, gptConfig.usedNum + 1)
        globalConfig.updateOneGptConfig(adminId, { ...gptConfig, usedNum: gptConfig.usedNum + 1 })
      }
      return replys
    } catch (e) {
      console.log('机器人接口信息获取失败', e)
      return []
    }
  }
