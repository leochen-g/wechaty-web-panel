import Mustache from 'mustache'

function roomTalker(options) {
  if (!options) {
    return () => undefined
  }
  if (!Array.isArray(options)) {
    options = [options]
  }
  const optionList = options
  return async function talkRoom(room, contact, mustacheView) {
    for (const option of optionList) {
      let msg
      if (option instanceof Function) {
        msg = await option(room, contact)
      } else {
        msg = option
      }
      if (!msg) {
        continue
      }
      if (typeof msg === 'string') {
        if (mustacheView) {
          msg = Mustache.render(msg, mustacheView)
        }
        if (contact) {
          await room.say(msg, contact)
        } else {
          await room.say(msg)
        }
      } else {
        /**
         *  FIXME(huan): https://github.com/microsoft/TypeScript/issues/14107
         */
        await room.say(msg)
      }
      await room.wechaty.sleep(1000)
    }
  }
}
function messageMapper(mapperOptions, one) {
  return async function mapMessage(message) {
    return normalizeMappedMessageList(mapperOptions, message, one)
  }
}
async function normalizeMappedMessageList(options, message, one) {
  try {
    const msgList = []
    let optionList
    if (Array.isArray(options)) {
      optionList = options
    } else {
      optionList = [options]
    }
    for (const option of optionList) {
      if (!option) {
        continue
      }
      if (typeof option === 'function') {
        const ret = await option(message, one)
        if (ret) {
          msgList.push(...(await normalizeMappedMessageList(ret, message)))
        }
      } else {
        msgList.push(option)
      }
    }
    return msgList
  } catch (e) {
    console.log('normalizeMappedMessageList error', e)
  }
}
function messageMatcher(matcherOptions) {
  if (!matcherOptions) {
    return () => Promise.resolve(false)
  }
  if (!Array.isArray(matcherOptions)) {
    matcherOptions = [matcherOptions]
  }
  const matcherOptionList = matcherOptions
  return async function matchMessage(message) {
    try {
      const room = message.room()
      const roomTopic = await room.topic()
      const talker = message.talker()
      const talkerName = talker?.name()
      let isMatch = false
      for (const option of matcherOptionList) {
        if (typeof option === 'boolean') {
          isMatch = option
        } else if (typeof option === 'string') {
          const idCheckList = [message.from()?.id, message.room()?.id, roomTopic, talkerName]
          isMatch = idCheckList.includes(option)
        } else if (option instanceof RegExp) {
          const text = await message.mentionText()
          const textCheckList = [text, message.from()?.name(), await message.room()?.topic()]
          isMatch = textCheckList.some((text) => text && option.test(text))
        } else if (typeof option === 'function') {
          isMatch = await option(message)
        } else {
          throw new Error('unknown matcher ' + option)
        }
        if (isMatch) {
          return true
        }
      }
      // no match
      return false
    } catch (e) {
      console.log('messageMatcher error', e)
      return false
    }
  }
}
/**
 * 消息发送者name
 * @param message
 * @returns {Promise<*|string|string>}
 */
const senderDisplayName = async (message) => {
  try {
    const talker = message.talker()
    const room = message.room()
    const alias = await room?.alias(talker)
    return alias || talker.name() || 'Noname'
  } catch (e) {
    console.log('senderDisplayName error', e)
    return 'Noname'
  }
}
/**
 * 过滤群名
 * @param matcher
 * @returns {function(*): *}
 * @example  const abbrRoomTopicForDevelopersHome = abbrRoomTopicByRegex(/\s*([^\s]*\s*[^\s]+)$/)    "Wechaty Developers' Home 8" -> "Home 8"
 */
function abbrRoomTopicByRegex(matcher) {
  return async function abbrRoomTopic(message) {
    const room = message.room()
    if (!room) {
      return
    }
    const topic = await room.topic()
    const matched = topic.match(matcher)
    if (!matched) {
      return
    }
    return matched[1]
  }
}
/**
 * 只转发文字消息
 * @param message
 * @returns {Promise<string>}
 */
const bidirectionalMapper = async (message) => {
  try {
    const abbrRoomTopicForDevelopersHome = abbrRoomTopicByRegex(/\s*([^\s]*\s*[^\s]+)$/)
    // Drop all messages if not Text
    if (message.type() !== 7) {
      return
    }
    const talkerDisplayName = await senderDisplayName(message)
    const roomShortName = (await abbrRoomTopicForDevelopersHome(message)) || 'Nowhere'
    const text = message.text()
    return `[${talkerDisplayName}@${roomShortName}]: ${text}`
  } catch (e) {
    console.log('bidirectionalMapper error', e)
    return ``
  }
}
/**
 * 转发文字和其他类型
 * @param message
 * @one topic name 指定群的名称 如果是这个群发的 那么就加一个消息类型
 * @returns {Promise<(string|Message)[]>}
 */
const unidirectionalMapper = async (message, one) => {
  try {
    const abbrRoomTopicForDevelopersHome = abbrRoomTopicByRegex(/\s*([^\s]*\s*[^\s]+)$/)
    const talkerDisplayName = await senderDisplayName(message)
    const roomShortName = (await abbrRoomTopicForDevelopersHome(message)) || 'Nowhere'
    const prefix = `[${talkerDisplayName}@${roomShortName}]`
    const messageList = []
    const room = message.room()
    const topic = await room.topic()
    switch (message.type()) {
      case 7:
        messageList.push(`${prefix}: ${message.text()}`)
        break
      default:
        // Forward all non-Text messages
        messageList.push(message)
        /**
         * If message is not sent from Headquarters Room,
         * then we add a sender information for the destination rooms.
         */
        if (topic === one) {
          const typeMap = {
            0:'Unknown',
            1:'Attachment',      // Attach(6),
            2:'Audio',         // Audio(1), Voice(34)
            3:'Contact',         // ShareCard(42)
            4:'ChatHistory',   // ChatHistory(19)
            5:'Emoticon',       // Sticker: Emoticon(15), Emoticon(47)
            6:'Image',        // Img(2), Image(3)
            7:'Text',         // Text(1)
            8:'Location',    // Location(48)
            9:'MiniProgram',  // MiniProgram(33)
            10:'GroupNote',   // GroupNote(53)
            11:'Transfer',   // Transfers(2000)
            12:'RedEnvelope',   // RedEnvelopes(2001)
            13:'Recalled',   // Recalled(10002)
            14:'Url',   // Url(5)
            15:'Video',   // Video(4), Video(43)
            16:'Post',   // Moment, Channel, Tweet, etc
            17:'Channel',   // Channel
            18:'System',   // System Message
            19:'Markdown',   // Markdown Message
            20:'CallRecord',   // Call Record (voice and video, maybe group?)
          }
          const type = typeMap[message.type()]
          // messageList.unshift(`${prefix}: ${type}`)
        }
        break
    }
    return messageList
  } catch (e) {
    console.log('unidirectionalMapper error', e)
    return []
  }
}
const isMatchConfig = (config) => {
  const matchWhitelist = messageMatcher(config.whitelist)
  const matchBlacklist = messageMatcher(config.blacklist)
  return async function isMatch(message) {
    try {
      if (message.self()) {
        return
      }
      const room = message.room()
      const roomTopic = await room.topic()
      if (config.model === 2 || config.model === 3) {
        if (!room || !config.many.includes(roomTopic)) {
          return
        }
      } else if (config.model === 1) {
        if (!room || roomTopic !== config.one) {
          return
        }
      }
      if (await matchWhitelist(message)) {
        return true
      }
      if (await matchBlacklist(message)) {
        return false
      }
      return true
    } catch (e) {
      console.log('isMatchConfig error', e)
      return false
    }
  }
}
/**
 * 多个群消息同步
 * @param that
 * @param config
 * @param msg
 * @returns {Promise<void>}
 */
async function manyToMany(that, config, msg) {
  try {
    const isMatch = isMatchConfig(config)
    const mapMessage = messageMapper(config.map)
    const matchAndForward = async (message, roomList) => {
      const match = await isMatch(message)
      if (!match) {
        return
      }
      const msgList = await mapMessage(message)
      if (msgList.length <= 0) {
        return
      }
      for (let i = 0; i < roomList.length; i++) {
        const room = roomList[i]
        const topic = await room.topic()
        const msgTopic = await message.room().topic()
        if (topic === msgTopic) {
          continue
        }
        const talkRoom = roomTalker(msgList)
        await talkRoom(room)
      }
    }
    let manyRoomList = []
    if (!manyRoomList.length) {
      for (let i = 0; i < config.many.length; i++) {
        const room = await that.Room.find({ topic: config.many[i] })
        if(room) {
          manyRoomList.push(room)
        }  else {
          console.log(`没有查找到群:${config.many[i]}`)
        }
      }
    }
    await matchAndForward(msg, manyRoomList)
  } catch (e) {
    console.log('manyToMany error', e)
  }
}
/**
 * 多个群消息同步到指定群
 * @param that
 * @param config
 * @param msg
 * @returns {Promise<void>}
 */
async function manyToOne(that, config, msg) {
  try {
    const isMatch = isMatchConfig(config)
    const mapMessage = messageMapper(config.map)
    const matchAndForward = async (message, room) => {
      const match = await isMatch(message)
      if (!match) {
        return
      }
      try {
        const msgList = await mapMessage(message)
        const talkRoom = roomTalker(msgList)
        await talkRoom(room)
      } catch (e) {
        console.log('WechatyPluginContrib, ManyToOneRoomConnector() filterThenToManyRoom(%s, %s) rejection: %s')
      }
    }
    let oneRoom = ''
    if (!oneRoom) {
      oneRoom = await that.Room.find({ topic: config.one }) // await loadRoom(wechaty, config.one)
    }
    await matchAndForward(msg, oneRoom)
  } catch (e) {
    console.log('manyToOne error', e)
  }
}
/**
 * 一对多， 一个群发的消息同步到其他几个群
 * @param that
 * @param config
 * @param msg
 * @returns {Promise<void>}
 */
async function oneToMany(that, config, msg) {
  try {
    const isMatch = isMatchConfig(config)
    const mapMessage = messageMapper(config.map, config.one)
    const matchAndForward = async (message, roomList) => {
      const match = await isMatch(message)
      if (!match) {
        return
      }
      try {
        const msgList = await mapMessage(message)
        const talkRoom = roomTalker(msgList)
        for (let i = 0; i < roomList.length; i++) {
          const room = roomList[i]
          if (room) {
            await talkRoom(room)
            await room.wechaty.sleep(1000)
          }
        }
      } catch (e) {
        console.log('WechatyPluginContrib', 'OneToManyRoomConnector() filterThenToManyRoom(%s, %s) rejection: %s')
      }
    }
    let manyRoomList = []
    if (!manyRoomList.length) {
      for (let i = 0; i < config.many.length; i++) {
        const room = await that.Room.find({ topic: config.many[i] })
        if(room) {
          manyRoomList.push(room)
        } else {
          console.log(`没有查找到群:${config.many[i]}`)
        }
      }
    }
    await matchAndForward(msg, manyRoomList)
  } catch (e) {
    console.log('oneToMany error', e)
  }
}
/**
 *  model: 1 一对多 2 多对一 3 多对多
 * @param that wechaty实例
 * @param msg 消息
 * @param list 规则列表
 * @returns {Promise<void>}
 */
async function dispatchAsync(that, msg, list) {
  try {
    const type = msg.type()
    const mentionSelf = await msg.mentionSelf()
    if (7 === type && mentionSelf) {
      // 如果内容中有提及机器人的内容，不进行转发
      return
    }
    for (let i = 0; i < list.length; i++) {
      const config = list[i]
      config.blacklist = [async () => true]
      if (config.forward === 1) {
        config.map = bidirectionalMapper
        config.whitelist = [async (message) => message.type() === 7]
      } else if (config.forward === 2) {
        config.blacklist = []
        config.map = unidirectionalMapper
      }
      if (config.model === 3) {
        await manyToMany(that, config, msg)
      } else if (config.model === 2) {
        await manyToOne(that, config, msg)
      } else if (config.model === 1) {
        await oneToMany(that, config, msg)
      }
    }
  } catch (e) {
    console.log('dispatchAsync error:', e)
  }
}
export { dispatchAsync }
