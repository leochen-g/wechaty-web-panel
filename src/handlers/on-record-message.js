import { allConfig } from '../db/configDb.js'

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
    switch (type) {
      case this.Message.Type.Text:
      case this.Message.Type.Url:
        if(type === this.Message.Type.Url) {
          const urlLink = await msg.toUrlLink()
          console.log('urlLink', urlLink)
          content = `[链接]:${urlLink.url()}`
        } else {
          content = msg.text()
        }
        console.log(`记录内容：【${roomName}】发消息人${contactName}:${content}`)
        return
      default:
        break
    }

  } catch (e) {
    console.log('监听消息失败', e)
  }
}

export default onRecordMessage
