import {allConfig} from '../db/configDb.js'
import {addHistory} from "../db/chatHistory.js";
import dayjs from "dayjs";

async function onRecordMessage(msg) {
  try {
    const config = await allConfig()
    const { role } = config && config.userInfo || { role: 'default' }
    const contact = msg.talker() // 发消息人
    const contactName = contact.name() // 发消息人昵称
    const room = msg.room() // 是否为群消息
    const roomName = room ? await room.topic() : '';
    const msgSelf = msg.self() // 是否自己发给自己的消息
    const type = msg.type()
    const isOfficial = contact.type() === this.Contact.Type.Official
    let content = ''
    if (msgSelf || isOfficial || role !== 'vip' || !config.openRecord) return
    switch (type) {
      case this.Message.Type.Text:
      case this.Message.Type.Url:
        if(type === this.Message.Type.Url) {
          const urlLink = await msg.toUrlLink()
          content = `[链接](${urlLink.url()})`
        } else {
          content = msg.text()
        }
        const historyItem = {
          conversionId: room ? room.id : contact.id,
          conversionName: room ? roomName : contactName,
          isRoom: !!room,
          isRobot: false,
          content: content,
          chatName: contactName,
          chatId: contact.id,
          time: dayjs().unix()
        }
        void addHistory(historyItem)
        return
      default:
        break
    }

  } catch (e) {
    console.log('监听消息失败', e)
  }
}

export default onRecordMessage
