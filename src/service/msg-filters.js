import dispatch from './event-dispatch-service.js'
import { getConfig, setSchedule, updateSchedule } from '../proxy/aibotk.js'
import { contentDistinguish, setLocalSchedule, isRealDate } from '../lib/index.js'
import { addRoom } from '../common/index.js'
import { service, callbackAibotApi } from '../proxy/superagent.js'
import { dispatchBot } from '../proxy/bot/dispatch.js'
import globalConfig from '../db/global.js'
import { getUser } from '../db/userDb.js'
import { allConfig } from '../db/configDb.js'

async function emptyMsg({ room, isMention }) {
  const config = await allConfig()
  if (room && !isMention) return []
  let msgArr = [] // 返回的消息列表
  let obj = { type: 1, content: config.defaultReply, url: '' } // 消息主体
  msgArr.push(obj)
  return msgArr
}

function officialMsg() {
  console.log('官方消息，不做回复')
  return [{ type: 1, content: '', url: '' }]
}

function maxLengthMsg() {
  console.log('字符超过设定值，不做回复')
  return [{ type: 1, content: '', url: '' }]
}

function newFriendMsg({ config, name }) {
  console.log(`新添加好友：${name}，默认回复`)
  return config.newFriendReplys || [{ type: 1, content: '', url: '' }]
}

async function roomInviteMsg({ that, msg, contact, config }) {
  try {
    for (const item of config.roomJoinKeywords) {
      if (item.reg === 2 && item.keywords.includes(msg)) {
        console.log(`精确匹配到加群关键词${msg},正在邀请用户进群`)
        await addRoom(that, contact, item.roomName, item.replys)
        return [{ type: 1, content: '', url: '' }]
      } else {
        for (let key of item.keywords) {
          if (msg.includes(key)) {
            console.log(`模糊匹配到加群关键词${msg},正在邀请用户进群`)
            await addRoom(that, contact, item.roomName, item.replys)
            return [{ type: 1, content: '', url: '' }]
          }
        }
      }
    }
    return []
  } catch (e) {
    console.log('roomInviteMsg error', e)
    return []
  }
}

/**
 * 添加定时提醒
 * @param that wechaty实例
 * @param obj 定时对线
 * @returns {Promise<boolean>}
 */
async function addSchedule(that, obj) {
  try {
    let scheduleObj = await setSchedule(obj)
    let nickName = scheduleObj.subscribe
    let time = scheduleObj.time
    let Rule1 = scheduleObj.isLoop ? time : new Date(time)
    let content = scheduleObj.content
    let contact = await that.Contact.find({ name: nickName })
    let id = scheduleObj.id
    setLocalSchedule(Rule1, async () => {
      console.log('你的专属提醒开启啦！')
      await contact.say(content)
      if (!scheduleObj.isLoop) {
        updateSchedule(id)
      }
    })
    return true
  } catch (error) {
    console.log('设置定时任务失败', error)
    return false
  }
}

async function scheduleJobMsg({ that, msg, name }) {
  try {
    let obj = { type: 1, content: '', url: '' } // 消息主体
    let msgArr = msg.replace(/\s+/g, ' ').split(' ')
    if (msgArr.length > 3) {
      let schedule = contentDistinguish(msgArr, name)
      let time = schedule.isLoop ? schedule.time : isRealDate(schedule.time)
      if (time) {
        let res = await addSchedule(that, schedule)
        if (res) {
          obj.content = '小助手已经把你的提醒牢记在小本本上了'
        } else {
          obj.content = '添加提醒失败，请稍后重试'
        }
        msgArr.push(obj)
        return msgArr
      } else {
        obj.content = '提醒设置失败，请保证每个关键词之间使用空格分割开，并保证日期格式正确。正确格式为：“提醒(空格)我(空格)每天(空格)18:30(空格)下班回家'
        msgArr.push(obj)
        return msgArr
      }
    } else {
      obj.content = '提醒设置失败，请保证每个关键词之间使用空格分割开，并保证日期格式正确。正确格式为：“提醒(空格)我(空格)18:30(空格)下班回家”'
      msgArr.push(obj)
      return msgArr
    }
  } catch (e) {
    console.log('scheduleJobMsg error:', e)
    return []
  }
}

/**
 * 获取事件处理返回的内容
 * @param {*} event 事件名
 * @param {*} msg 消息
 * @param {*} name 用户
 * @param {*} id 用户id
 * @param avatar 用户头像
 * @returns {String}
 */
async function getEventReply(that, event, msg, name, id, avatar, room, roomName, sourceMsg) {
  try {
    let reply = await dispatch.dispatchEventContent(that, event, msg, name, id, avatar, room, roomName, sourceMsg)
    return reply
  } catch (e) {
    console.log('getEventReply error', e)
    return []
  }
}

/**
 * 回调函数事件
 * @param that
 * @param msg
 * @param name
 * @param id
 * @param config
 * @param room
 * @returns Promise
 */
async function callbackEvent({ that, msg, name, id, config, room, isMention }) {
  try {
    for (let item of config.callBackEvents) {
      for (let key of item.keywords) {
        if ((item.reg === 1 && msg.includes(key)) || (item.reg === 2 && msg === key)) {
          // 如果匹配到关键词 群消息要求是必须@，但是没@ 就不需要回复 || 当为群消息关键词只在好友私聊时触发 || 非群消息只在群中触发
          if ((room && item.needAt === 1 && !isMention) || (room && item.needAt === undefined && !isMention) || (room && item.scope === 'friend') || (!room && item.scope === 'room')) {
            return []
          }
          msg = msg.trim()
          const topic = room ? await room.topic() : ''
          const data = {
            uid: id,
            uname: name,
            roomId: (room && room.id) || '',
            roomName: (room && topic) || '',
            word: msg
          }
          item.moreData &&
          item.moreData.length &&
          item.moreData.forEach((mItem) => {
            if (mItem.key !== 'uid' && mItem.key !== 'uname' && mItem.key !== 'word' && mItem.key !== 'roomId' && mItem.key !== 'roomName') {
              data[mItem.key] = mItem.value
            }
          })
          const timeout = item.timeout || 60
          if (item.type === 100) {
            let res = await service.post(item.customUrl, data, { timeout: timeout * 1000 })
            return res
          } else if (item.type === 1) {
            let res = await callbackAibotApi(item.postUrl, data, timeout)
            return res
          }
        }
      }
    }
    return []
  } catch (e) {
    console.log('error', e)
    return []
  }
}

async function eventMsg({ that, msg, name, id, avatar, config, room, isMention, roomName }) {
  try {
    for (let item of config.eventKeywords) {
      for (let key of item.keywords) {
        if ((item.reg === 1 && msg.includes(key)) || (item.reg === 2 && msg === key)) {
          // 如果匹配到关键词 群消息要求是必须@，但是没@ 就不需要回复 || 当为群消息关键词只在好友私聊时触发 || 非群消息只在群中触发
          if ((room && item.needAt === 1 && !isMention) || (room && item.needAt === undefined && !isMention) || (room && item.scope === 'friend') || (!room && item.scope === 'room')) {
            return []
          }
          const replaceMsg = msg.replace(key, '')
          let res = await getEventReply(that, item.event, replaceMsg, name, id, avatar, room, roomName, msg)
          return res
        }
      }
    }
    return []
  } catch (e) {
    console.log('eventMsg error：', e)
    return []
  }
}

/**
 * 关键词回复
 * @returns {Promise<*>}
 */
async function keywordsMsg({ msg, config, room, isMention }) {
  try {
    if (config.replyKeywords && config.replyKeywords.length > 0) {
      for (let item of config.replyKeywords) {
        if (item.reg === 2 && item.keywords.includes(msg)) {
          // 如果匹配到关键词 群消息要求是必须@，但是没@ 就不需要回复 || 当为群消息关键词只在好友私聊时触发 || 非群消息只在群中触发
          if ((room && item.needAt === 1 && !isMention) || (room && item.needAt === undefined && !isMention) || (room && item.scope === 'friend') || (!room && item.scope === 'room')) {
            return []
          }
          console.log(`精确匹配到关键词${msg},正在回复用户`)
          return item.replys
        } else if (item.reg === 1) {
          for (let key of item.keywords) {
            if (msg.includes(key)) {
              // 如果匹配到关键词 群消息要求是必须@，但是没@ 就不需要回复 || 当为群消息关键词只在好友私聊时触发 || 非群消息只在群中触发
              if ((room && item.needAt === 1 && !isMention) || (room && item.needAt === undefined && !isMention) || (room && item.scope === 'friend') || (!room && item.scope === 'room')) {
                return []
              }
              console.log(`模糊匹配到关键词${msg},正在回复用户`)
              return item.replys
            }
          }
        }
      }
    } else {
      return []
    }
  } catch (e) {
    console.log('keywordsMsg error：', e)
    return []
  }
}

async function robotMsg({ msg, name, id, config, isMention, room, isFriend }) {
  // 如果群里没有提及不开启机器人聊天
  if (room && !isMention && config.roomAt || room && !isMention && !config.roomAt && isFriend && config.friendNoReplyInRoom) {
    return []
  } else {
    try {
      let msgArr = [] // 返回的消息列表
      if (config.autoReply) {
        console.log('开启了机器人自动回复功能')
        msgArr = await dispatch.dispatchAiBot(config.defaultBot, msg, name, id)
      } else {
        console.log('没有开启机器人自动回复功能')
        msgArr = [{ type: 1, content: '', url: '' }]
      }
      return msgArr
    } catch (e) {
      console.log('robotMsg error:', e)
      return []
    }
  }
}

async function getCustomConfig({ name, id, room, roomId, roomName, type }) {
  const gptConfigs = globalConfig.getAllGptConfig()
  if (gptConfigs && gptConfigs.length) {
    let finalConfig = ''
    if (room) {
      finalConfig = room && gptConfigs.find((item) => {
        const targetNames = []
        const targetIds = []
        item.targets.forEach(tItem => {
          targetNames.push(tItem.name)
          targetIds.push(tItem.id)
        })
        if (type) {
          if (item.onlyId) {
            return item.type === 'room' && targetIds.includes(roomId) && item.botConfig[type] && item.openChat
          } else {
            return item.type === 'room' && (targetNames.includes(roomName) && item.botConfig[type] && item.openChat || targetIds.includes(roomId) && item.botConfig[type] && item.openChat)
          }
        } else {
          if (item.onlyId) {
            return item.type === 'room' && targetIds.includes(roomId)
          } else {
            return item.type === 'room' && (targetNames.includes(roomName) || targetIds.includes(roomId))
          }
        }
      })
    } else {
      finalConfig = !room && gptConfigs.find((item) => {
        const targetNames = []
        const targetIds = []
        item.targets.forEach(tItem => {
          targetNames.push(tItem.name)
          targetIds.push(tItem.id)
        })
        if (type) {
          if (item.onlyId) {
            return item.type === 'contact' && targetIds.includes(id) && item.botConfig[type] && item.openChat
          } else {
            return item.type === 'contact' && (targetNames.includes(name) && item.botConfig[type] && item.openChat || targetIds.includes(id) && item.botConfig[type] && item.openChat)
          }
        } else {
          if (item.onlyId) {
            return item.type === 'contact' && targetIds.includes(id)
          } else {
            return item.type === 'contact' && (targetNames.includes(name) || targetIds.includes(id))
          }
        }
      })
    }
    return finalConfig
  }
}

async function customChat({ msg, name, id, config, isMention, room, roomId, roomName }) {
  try {
    const gptConfigs = globalConfig.getAllGptConfig()
    if (gptConfigs && gptConfigs.length) {
      const finalConfig = await getCustomConfig({ name, id, room, roomId, roomName })
      if (finalConfig) {
        const isRoom = finalConfig.type === 'room'
        if (finalConfig.openChat) {
          if ((isRoom && finalConfig.needAt === 1 && isMention) || isRoom && !finalConfig.needAt || !isRoom) {
            const keyword = finalConfig?.keywords.find((item) => msg.includes(item))
            if (keyword || !finalConfig?.keywords.length) {
              msg = keyword ? msg.replace(keyword, '') : msg
              if (finalConfig.limitNum > 0 && finalConfig.limitNum <= finalConfig.usedNum) {
                return [{ type: 1, content: finalConfig.rechargeTip || '聊天次数已用完，请联系管理员充值' }]
              }
              const msgArr = await dispatchBot({
                botType: finalConfig.robotType,
                content: msg,
                uid: id,
                adminId: finalConfig.id,
                config: finalConfig.botConfig
              })
              if (msgArr.length) return msgArr
              console.log('自定义回复获取内容失败，启用全局配置')
              return []
            }
          }
          return []
        } else {
          // 如果没有开启对话 也要检测一下是不是需要@ 才返回默认回复
          if ((isRoom && finalConfig.needAt === 1 && isMention) || isRoom && !finalConfig.needAt || !isRoom) {
            return finalConfig.defaultReply ? [{ type: 1, content: finalConfig.defaultReply }] : [{
              type: 1,
              content: ''
            }]
          }
          return []
        }
      }
      return []
    }
    return []
  } catch (e) {
    console.log('catch error:' + e)
    return []
  }
}

/**
 * 校验禁止词
 * @param msg
 * @param name
 * @param config
 * @return {*[]}
 */
function preventWordCheck({ msg, config, isMention, room }) {
  const preventWords = config.preventWords.replaceAll('，', ',').split(',')
  // 如果是群消息，但是没有提及机器人，则不需要返回任何消息 因为可能是正常交流而已
  if (room && !isMention) {
    return []
  }
  if (preventWords && preventWords.length) {
    for (let item of preventWords) {
      if (item && item !== '' && msg.includes(item)) {
        console.log(`触发禁止词【${item}】，不回复用户`)
        return [{ type: 1, content: '这个话题不适合讨论，换个话题吧。' }]
      }
    }
  }
  return []
}

async function customBot({ that, msg, name, id, config, room, isMention }) {
  const item = config.customBot
  // 如果匹配到关键词 群消息要求是必须@，但是没@ 就不需要回复 || 当为群消息关键词只在好友私聊时触发 || 非群消息只在群中触发
  if ((room && item.needAt === 1 && !isMention) || (room && item.needAt === undefined && !isMention) || (room && item.scope === 'friend') || (!room && item.scope === 'room')) {
    return []
  }
  const contactSelf = await getUser()
  msg = msg.trim()
  const topic = room ? await room.topic() : ''
  const data = {
    robotId: contactSelf.robotId,
    uid: id,
    uname: name,
    roomId: (room && room.id) || '',
    roomName: (room && topic) || '',
    word: msg
  }
  item.moreData &&
  item.moreData.length &&
  item.moreData.forEach((mItem) => {
    if (mItem.key !== 'uid' && mItem.key !== 'uname' && mItem.key !== 'word' && mItem.key !== 'roomId' && mItem.key !== 'roomName' && mItem.key !== 'robotId') {
      data[mItem.key] = mItem.value
    }
  })
  const timeout = item.timeout || 60
  let res = await service.post(item.customUrl, data, { timeout: timeout * 1000 })
  return res
}

export { customBot }
export { callbackEvent }
export { emptyMsg }
export { officialMsg }
export { newFriendMsg }
export { roomInviteMsg }
export { scheduleJobMsg }
export { eventMsg }
export { keywordsMsg }
export { robotMsg }
export { maxLengthMsg }
export { customChat }
export { preventWordCheck }
export { getCustomConfig }
export default {
  getCustomConfig,
  customBot,
  callbackEvent,
  emptyMsg,
  officialMsg,
  newFriendMsg,
  roomInviteMsg,
  scheduleJobMsg,
  eventMsg,
  keywordsMsg,
  robotMsg,
  maxLengthMsg,
  customChat,
  preventWordCheck
}
