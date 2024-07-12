import { BotManage } from '../common/multiReply.js'
import { getCustomConfig } from './msg-filters.js'
import { updateChatRecord } from '../proxy/aibotk.js'
import globalConfig from '../db/global.js'

let gpt4vRes = ''

export async function getGpt4vChat({ room, roomId, roomName, isMention, userAlias, msgContent, name, id, uniqueId, that }) {
  if (!gpt4vRes) {
    gpt4vRes = new BotManage(100, that)
  }
  let finalConfig = await getCustomConfig({ name, id, roomName, roomId, room, type: 'open4v' })
  if (finalConfig) {
    const isRoom = finalConfig.type === 'room'
    if (msgContent.type === 1) {
      let msg = msgContent.content
      if ((isRoom && finalConfig.needAt === 1 && isMention) || isRoom && !finalConfig.needAt || !isRoom) {
        const keyword = finalConfig?.keywords?.find((item) => msg.includes(item)) || '';
        if (keyword || !finalConfig?.keywords?.length) {
          msg = keyword ? msg.replace(keyword, '') : msg
          if (finalConfig.limitNum > 0 && finalConfig.limitNum <= finalConfig.usedNum) {
            return []
          }
          const config = {
            ...finalConfig.botConfig,
            robotType: finalConfig.botConfig?.open4vConfig?.type || finalConfig.robotType,
            proxyPass: finalConfig.botConfig?.open4vConfig?.baseUrl || finalConfig.botConfig?.proxyPass,
            apiKey: finalConfig.botConfig?.open4vConfig?.token || finalConfig.botConfig?.token
          }
          const res = await gpt4vRes.run(uniqueId, { type: 1, content: msg }, config)
          if(res.length) {
              const gptConfig = globalConfig.getGptConfigById(finalConfig.id);
              void updateChatRecord(finalConfig.id, gptConfig.usedNum + 1)
              globalConfig.updateOneGptConfig(finalConfig.id, { ...gptConfig, usedNum: gptConfig.usedNum + 1 })
          }
          return res
        }
      }
    } else if (msgContent.type === 3) {
      const res = await gpt4vRes.run(uniqueId, { type: 3, id: msgContent.id })
      return res
    }
  }
  return []
}
