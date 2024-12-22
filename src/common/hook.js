import { delay } from "../lib/index.js";

/**
 * 指定用户消息转发到群或好友 如果被拦截成功 则不进行其他回复操作
 * @returns {Promise<boolean>}
 */
export async function privateForward({ that, msg, name, config }) {
  const { role } = config?.userInfo || {}
  const privateForwards = config.privateForwards
  if(role !== 'vip' || !privateForwards || !privateForwards.length || msg.text().includes('请在手机上查看]')) return false
  let result = false
  try {
    if(privateForwards.length) {
      for(let item of privateForwards) {
        if(item.name === name) {
          result = true
          for(let roomName of item.rooms) {
            await delay(500)
            const room = await that.Room.find({ topic: roomName })
            if (!room) {
              console.log(`查找不到群：${roomName}，请检查群名是否正确`)
            }
            // 只转发文字
            if(item.type === 1 && msg.type() === 7) {
                room && msg && msg.forward(room)
            } else {
              if(msg.type() === 6) {
                const file = await msg.toFileBox()
                room.say(file)
              } else {
                room && msg && msg.forward(room)
              }
            }
          }
          for(let contactName of item.contacts) {
            await delay(500)
            const contact = await that.Contact.find({ name: contactName })
            if (!contact) {
              console.log(`查找不到用户：${contactName}，请检查用户昵称是否正确`)
            }
            // 只转发文字
            if(item.type === 1 && msg.type() === 7) {
                contact && msg && msg.forward(contact)
            } else {
              if(msg.type() === 6) {
                const file = await msg.toFileBox()
                contact.say(file)
              } else {
                contact && msg && msg.forward(contact)
              }
            }
          }
        }
      }
    }
    return result
  } catch (e) {
    console.log("error", e);
  }
}
