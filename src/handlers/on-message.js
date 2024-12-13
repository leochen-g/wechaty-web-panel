import { contactSay, roomSay } from '../common/index.js'
import { getContactTextReply, getRoomTextReply } from '../common/reply.js'
import { delay } from '../lib/index.js'
import { dispatchAsync } from '../service/room-async-service.js'
import { allConfig } from '../db/configDb.js'
import { getAibotConfig } from '../db/aiDb.js'
import { addRoomRecord } from '../db/roomDb.js'
import { privateForward } from '../common/hook.js'
import { getPuppetEol } from '../const/puppet-type.js'
import { getGpt4vChat } from '../service/gpt4vService.js'
import { getVoiceText } from '../proxy/multimodal.js'
import { getCustomConfig } from '../service/msg-filters.js'
import { getPuppetInfo } from "../db/puppetDb.js";

const ignoreRecord = [
  { type: 'include', word: '加入了群聊' },
  { type: 'include', word: '与群里其他人都不是朋友关系' },
  { type: 'include', word: '收到一条暂不支持的消息类型' }
]

/**
 * 检测是否属于忽略的消息
 * @param msg 用户信息
 * @param list 需要忽略的列表
 */
function checkIgnore(msg, list) {
  if (!list.length) return false
  for (let item of list) {
    const word = item.word
    const type = item.type
    if ((type === 'start' && msg.startsWith(word)) || (type === 'end' && msg.endsWith(word)) || (type === 'equal' && msg === word) || (type === 'include' && msg.includes(word))) {
      return true
    }
  }
  return false
}

/**
 * 根据消息类型过滤私聊消息事件
 * @param {*} that bot实例
 * @param {*} msg 消息主体
 */
async function dispatchFriendFilterByMsgType(that, msg) {
  try {
    const eol = await getPuppetEol()
    const puppetInfo = await getPuppetInfo()
    const aibotConfig = await getAibotConfig()
    const config = await allConfig()
    const type = msg.type()
    const contact = msg.talker() // 发消息人
    const name = await contact.name()
    const userAlias = await contact.alias() || '';
    const isOfficial = contact.type() === that.Contact.Type.Official
    let content = ''
    let replys = []
    const res = await privateForward({ that, msg, name, config })
    if (res) {
      return
    }
    switch (type) {
      case that.Message.Type.System:
      case that.Message.Type.Text:
      case that.Message.Type.Url:
        if(type === that.Message.Type.Url) {
          console.log(`发消息人${await contact.name()}:发了一个h5链接`)
          const urlLink = await msg.toUrlLink()
          if (config.parseMini && urlLink.payload) {
            const urlParse = `【链接解析】${eol}${eol}标题：${urlLink.title()}${eol}描述：${urlLink.description()}${eol}链接：${urlLink.url()}${eol}缩略图：${urlLink.thumbnailUrl()}`
            contact.say(urlParse)
          }
          console.log('urlLink', urlLink)
          content = `[链接]:${urlLink.url()}`
        } else if(type === that.Message.Type.System) {
          const stext = msg.text();
          if((stext.includes('你已添加') || stext.includes('You have added')) && puppetInfo.puppetType === 'PuppetMatrix') {
            content = msg.text()
          } else {
            return
          }
        } else {
          content = msg.text()
        }

        if (!isOfficial) {
          console.log(`发消息人${name}:${content}`)
          const isIgnore = checkIgnore(content.trim(), aibotConfig.ignoreMessages)
          if (content.trim() && !isIgnore) {
            const gpt4vReplys = await getGpt4vChat({
              that,
              room: false,
              roomId: '',
              uniqueId: contact.id,
              id: contact.id,
              roomName: '',
              isMention: false,
              userAlias,
              name,
              msgContent: { type: 1, content }
            })
            if (gpt4vReplys.length) {
              for (let reply of gpt4vReplys) {
                await contactSay.call(that, contact, reply)
              }
              return
            }
            replys = await getContactTextReply(that, contact, content.trim())
            for (let reply of replys) {
              await contactSay.call(that, contact, reply)
              await delay(200)
            }
          }
        } else {
          console.log('公众号消息')
        }
        break
      case that.Message.Type.Audio:

        let finalConfig = await getCustomConfig({ name, id: contact.id, roomName: '', roomId: '', room: false, type: 'openWhisper' })
        if(!finalConfig && config?.customBot?.openWhisper) {
          finalConfig = {
            botConfig: {
              whisperConfig: config?.customBot?.whisperConfig
            }
          }
        }
        if(finalConfig) {
          const audioFileBox = await msg.toFileBox()
          const text = puppetInfo.puppetType.includes('PuppetService')&&!msg.text().startsWith('@') ? msg.text().trim() : await getVoiceText(audioFileBox, finalConfig.botConfig.whisperConfig)
          console.log('语音解析结果:', text)
          const keyword = finalConfig.botConfig.whisperConfig?.keywords?.length ? finalConfig.botConfig?.whisperConfig.keywords?.find((item) => text.includes(item)): true;
          const isIgnore = checkIgnore(content.trim(), aibotConfig.ignoreMessages)
          if (text.trim() && !isIgnore && keyword) {
            const gpt4vReplys = await getGpt4vChat({
              that,
              room: false,
              roomId: '',
              uniqueId: contact.id,
              id: contact.id,
              roomName: '',
              isMention: false,
              name,
              msgContent: { type: 1, content: text }
            })
            if (gpt4vReplys.length) {
              for (let reply of gpt4vReplys) {
                await contactSay.call(that, contact, reply)
              }
              return
            }
            replys = await getContactTextReply(that, contact, text.trim())
            for (let reply of replys) {
              await contactSay.call(that, contact, reply)
              await delay(200)
            }
          } else {
            console.log('语音解析结果没有匹配到需要回复的关键词')
          }
        }
        break
      case that.Message.Type.Emoticon:
        console.log(`发消息人${await contact.name()}:发了一个表情`)
        break
      case that.Message.Type.Image:
        console.log(`发消息人${await contact.name()}:发了一张图片`)
        const imgGpt4vReplys = await getGpt4vChat({
          that,
          room: false,
          roomId: '',
          id: contact.id,
          uniqueId: contact.id,
          roomName: '',
          userAlias,
          isMention: false,
          name,
          msgContent: { type: 3, id: msg.id }
        })
        if (imgGpt4vReplys.length) {
          for (let reply of imgGpt4vReplys) {
            await contactSay.call(that, contact, reply)
          }
          return
        }
        break
      case that.Message.Type.Video:
        console.log(`发消息人${await contact.name()}:发了一个视频`)
        break
      case that.Message.Type.MiniProgram:
        console.log(`发消息人${await contact.name()}:发了一个小程序`)
        const miniProgram = await msg.toMiniProgram()
        if (config.parseMini && miniProgram.payload) {
          const miniParse = `【小程序解析】${eol}${eol}appid：${miniProgram.appid()}${eol}username：${miniProgram.username().replace('@app', '')}${eol}标题：${miniProgram.title()}${eol}描述：${miniProgram.description()}${eol}路径：${decodeURIComponent(miniProgram.pagePath())}`
          contact.say(miniParse)
        }
        console.log('mini', miniProgram)
        break
      case that.Message.Type.Transfer:
        console.log(`发消息人${await contact.name()}: 发起一个转账，请在手机接收`)
        console.log('内容', msg.payload)
        break
      default:
        break
    }
  } catch (error) {
    console.log('监听消息错误', error)
  }
}

/**
 * 根据消息类型过滤群消息事件
 * @param {*} that bot实例
 * @param {*} room room对象
 * @param {*} msg 消息主体
 */
async function dispatchRoomFilterByMsgType(that, room, msg) {
  const aibotConfig = await getAibotConfig()
  const config = await allConfig()
  const { role } = config && config.userInfo || { role: 'default' }
  try {
    const eol = await getPuppetEol()
    const contact = msg.talker() // 发消息人
    const contactName = contact.name()
    const roomName = await room.topic()
    const isFriend = contact.friend()
    const type = msg.type()
    const receiver = msg.to()
    let content = ''
    let replys = ''
    let contactId = contact.id
    let contactAvatar = await contact.avatar()
    const userSelfName = that.currentUser?.name() || that.userSelf()?.name()
    const userAlias = await room?.alias(contact) || await contact.alias() || ''
    const userWeixin = contact.weixin() || '';
    switch (type) {
      case that.Message.Type.Text:
      case that.Message.Type.Url:
        if(type === that.Message.Type.Url) {
          console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个h5链接`)
          const urlLink = await msg.toUrlLink()
          if (config.parseMiniRooms.includes(roomName) && urlLink.payload) {
            const urlParse = `【链接解析】${eol}${eol}标题：${urlLink.title()}${eol}描述：${urlLink.description()}${eol}链接：${urlLink.url()}${eol}缩略图：${urlLink.thumbnailUrl()}`
            room.say(urlParse)
          }
          console.log('urlLink', urlLink)
          content = `[链接]:${urlLink.url()}`
        } else {
          content = msg.text()
        }
        let mentionSelf = await msg.mentionSelf() || content.includes(`@${userSelfName}`)
        const isMentionAll = await msg.isMentionAll()
        if(config?.ignoreRoomMentionAll && isMentionAll && mentionSelf) {
          mentionSelf = false
        }

        const receiverName = receiver?.name()
        content = content.replace('@' + receiverName, '').replace('@' + userSelfName, '').replace(/@[^,，：:\s@]+/g, '').trim()
        console.log(`群名: ${roomName} 发消息人: ${contactName} 内容: ${content} | 机器人被@：${mentionSelf ? '是' : '否'}`)
        // 检测是否需要这条消息
        const isIgnore = checkIgnore(content, aibotConfig.ignoreMessages)
        if (isIgnore) return
        const gpt4vReplys = await getGpt4vChat({
          that,
          room,
          roomId: room.id,
          id: contactId,
          uniqueId: `${room.id}-${contactId}`,
          roomName,
          isMention: mentionSelf,
          name: contactName,
          userAlias,
          userWeixin,
          msgContent: { type: 1, content }
        })
        if (gpt4vReplys.length) {
          for (let reply of gpt4vReplys) {
            await roomSay.call(that, room, contact, reply)
            await delay(200)
          }
          return
        }
        replys = await getRoomTextReply({
          that,
          content,
          isFriend,
          name: contactName,
          userAlias,
          userWeixin,
          id: contactId,
          roomId: room.id,
          avatar: contactAvatar,
          room,
          roomName,
          isMention: mentionSelf
        })
        for (let reply of replys) {
          await roomSay.call(that, room, contact, reply)
          await delay(200)
        }

        const cloudRoom = config.cloudRoom
        if (role === 'vip' && cloudRoom.includes(roomName) && !checkIgnore(content, ignoreRecord)) {
          const regex = /(<([^>]+)>)/ig
          content = content.replace(regex, '')
          void addRoomRecord({
            roomName,
            roomId: room.id,
            content,
            contact: contactName,
            wxid: contactId,
            time: new Date().getTime()
          })
        }
        break
      case that.Message.Type.Emoticon:
        content = msg.text()
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个表情 ${content}`)
        break
      case that.Message.Type.Image:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一张图片`)
        const imgGpt4vReplys = await getGpt4vChat({
          that,
          room,
          roomId: room.id,
          id: contactId,
          uniqueId: `${room.id}-${contactId}`,
          roomName,
          isMention: false,
          name: contactName,
          msgContent: { type: 3, id: msg.id }
        })
        if (imgGpt4vReplys.length) {
          for (let reply of imgGpt4vReplys) {
            await roomSay.call(that, room, contact, reply)
          }
          return
        }
        break
      case that.Message.Type.Video:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个视频`)
        break
      case that.Message.Type.Audio:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个语音`)
        const puppetInfo = await getPuppetInfo()
        let finalConfig = await getCustomConfig({ name: contactName, id: contactId, roomName, roomId: room.id, room, type: 'openWhisper' })
        if(!finalConfig && config?.customBot?.openWhisper) {
          finalConfig = {
            botConfig: {
              whisperConfig: config?.customBot?.whisperConfig
            }
          }
        }
        if(finalConfig) {
          const audioFileBox = await msg.toFileBox()
          const text = puppetInfo.puppetType.includes('PuppetService')&&!msg.text().startsWith('@') ? msg.text().trim() : await getVoiceText(audioFileBox, finalConfig.botConfig.whisperConfig)
          console.log('语音解析结果', text)
          const keyword = finalConfig.botConfig.whisperConfig?.keywords?.length ? finalConfig.botConfig?.whisperConfig?.keywords?.find((item) => text.includes(item)): true;
          const isIgnore = checkIgnore(content.trim(), aibotConfig.ignoreMessages)
          if (text.trim() && !isIgnore && keyword) {
            const gpt4vReplys = await getGpt4vChat({
              that,
              room,
              roomId: room.id,
              id: contactId,
              uniqueId: `${room.id}-${contactId}`,
              roomName,
              isMention: true,
              name: contactName,
              msgContent: { type: 1, content: text }
            })
            if (gpt4vReplys.length) {
              for (let reply of gpt4vReplys) {
                await roomSay.call(that, room, contact, reply)
              }
              return
            }
            replys = await getRoomTextReply({
              that,
              content: text,
              isFriend,
              name: contactName,
              id: contactId,
              roomId: room.id,
              avatar: contactAvatar,
              room,
              userAlias,
              userWeixin,
              roomName,
              isMention: true
            })
            for (let reply of replys) {
              await roomSay.call(that, room, contact, reply)
              await delay(200)
            }
          } else {
            console.log('语音解析结果没有匹配到需要回复的关键词')
          }
        }
        break
      case that.Message.Type.MiniProgram:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个小程序`)
        const miniProgram = await msg.toMiniProgram()
        if (config.parseMiniRooms.includes(roomName) && miniProgram.payload) {
          const miniParse = `【小程序解析】${eol}${eol}appid:${miniProgram.appid()}${eol}username：${miniProgram.username().replace('@app', '')}${eol}标题：${miniProgram.title()}${eol}描述：${miniProgram.description()}${eol}路径：${decodeURIComponent(miniProgram.pagePath())}${eol}`
          room.say(miniParse)
        }
        console.log('mini', miniProgram)
        break
      case that.Message.Type.Transfer:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发起了转账，请在手机查看`)
        console.log('内容', msg.payload)
        break
      default:
        break
    }
  } catch (e) {
    console.log('error', e)
  }
}

async function onMessage(msg) {
  try {
    const config = await allConfig()
    const { role } = config && config.userInfo || { role: 'default' }
    const room = msg.room() // 是否为群消息
    const msgSelf = msg.self() // 是否自己发给自己的消息
    if (msgSelf) return
    if (room) {
      const roomName = await room.topic()
      const contact = msg.talker() // 发消息人
      const contactName = contact.name()
      await dispatchRoomFilterByMsgType(this, room, msg)
      if (role === 'vip' && roomName !== contactName) {
        const roomAsyncList = config.roomAsyncList || []
        if (roomAsyncList.length) {
          await dispatchAsync(this, msg, roomAsyncList)
        }
      }
    } else {
      await dispatchFriendFilterByMsgType(this, msg)
    }
  } catch (e) {
    console.log('监听消息失败', e)
  }
}

export default onMessage
