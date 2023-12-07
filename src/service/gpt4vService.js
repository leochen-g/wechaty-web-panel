import globalConfig from "../db/global.js";
import { BotManage } from "../common/multiReply.js";

let gpt4vRes = '';

export async function getGpt4vChat({ room, roomId, roomName, isMention, msgContent, name, id, uniqueId, that}) {
  if(!gpt4vRes) {
    gpt4vRes = new BotManage(100, that)
  }
  const gptConfigs = globalConfig.getAllGptConfig();
  if (gptConfigs && gptConfigs.length) {
    let finalConfig = "";
    if (room) {
      finalConfig = room && gptConfigs.find((item) => {
        const targetNames = [];
        const targetIds = [];
        item.targets.forEach(tItem => {
          targetNames.push(tItem.name);
          targetIds.push(tItem.id);
        });
        return item.type === "room" && (targetNames.includes(roomName) || targetIds.includes(roomId));
      });
    } else {
      finalConfig = !room && gptConfigs.find((item) => {
        const targetNames = [];
        const targetIds = [];
        item.targets.forEach(tItem => {
          targetNames.push(tItem.name);
          targetIds.push(tItem.id);
        });
        return item.type === "contact" && (targetNames.includes(name) || targetIds.includes(id));
      });
    }
    if (finalConfig) {
      const isRoom = finalConfig.type === "room";
      if (finalConfig.openChat && finalConfig.botConfig.open4v) {
        if(msgContent.type === 1) {
          let msg = msgContent.content;
          if ((isRoom && finalConfig.needAt === 1 && isMention) || isRoom & !finalConfig.needAt || !isRoom) {
            const keyword = finalConfig?.keywords.find((item) => msg.includes(item));
            if (keyword || !finalConfig?.keywords.length) {
              msg = keyword ? msg.replace(keyword, "") : msg;
              if (finalConfig.limitNum > 0 && finalConfig.limitNum <= finalConfig.usedNum) {
                return [];
              }
              const config = {
                ...finalConfig.botConfig,
                proxyPass: finalConfig.botConfig.proxyPass,
                apiKey: finalConfig.botConfig.token,
              }
              const res = await gpt4vRes.run(uniqueId, {type:1, content: msg}, config)
              return res
            }
          }
        } else if(msgContent.type ===3){
          const res = await gpt4vRes.run(uniqueId, {type:3, id: msgContent.id })
          return res
        }
      }
    }
  }

  return [];
}
