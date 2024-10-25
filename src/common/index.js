import { getNews, getTXweather, getSweetWord } from '../proxy/api.js'
import { AIBOTK_OUTAPI } from '../proxy/config.js'
import { sendFriend, sendRoom, asyncData, getOne, getMaterial, getCustomNews } from '../proxy/aibotk.js'
import { getUser } from '../db/userDb.js'
import { formatDate, getDay, groupArray, delay } from '../lib/index.js'
import { FileBox } from 'file-box'
import { allConfig } from '../db/configDb.js'
import { getPuppetEol, isWindowsPlatform } from "../const/puppet-type.js";
import dayjs from "dayjs";
import { addHistory } from "../db/chatHistory.js";
import { getPuppetInfo } from "../db/puppetDb.js";

async function formatContent(text) {
  text = text.replaceAll('\\n', '\n');
  const isWin = await isWindowsPlatform()
  if(isWin) {
    return text.replaceAll(/\n/g, "\r").replaceAll(/\n/g, "\r");
  }
  return text;
}

/**
 * 获取每日新闻内容
 * @param {*} sortId 新闻资讯分类Id
 * @param {*} endWord 结尾备注
 */
async function getNewsContent(sortId, endWord = '', num = 10) {
  const eol = await getPuppetEol();
  let today = formatDate(new Date()) //获取今天的日期
  let news = await getNews(sortId, num)
  let content = `${today}${eol}${news}${eol}${endWord?'————————':''}${endWord}`
  return content
}

/**
 * 获取自定义定制内容
 * @param {*} sortId 定制Id
 */
export async function getCustomContent(sortId) {
  let news = await getCustomNews(sortId)
  return news
}
/**
 * 获取每日说内容
 * @param {*} date 与朋友的纪念日
 * @param {*} city 朋友所在城市
 * @param {*} endWord 结尾备注
 */
async function getEveryDayContent(date, city, endWord) {
  const eol = await getPuppetEol();
  let one = await getOne() //获取每日一句
  let weather = await getTXweather(city) //获取天气信息
  let today = formatDate(new Date()) //获取今天的日期
  let memorialDay = getDay(date) //获取纪念日天数
  let sweetWord = await getSweetWord() // 土味情话
  let str = `${today}${eol}我们在一起的第${memorialDay}天${eol}${eol}元气满满的一天开始啦,要开心噢^_^${eol}${eol}今日天气${eol}${weather.weatherTips}${eol}${weather.todayWeather}${eol}每日一句:${eol}${one}${eol}${eol}情话对你说:${eol}${sweetWord}${eol}${eol}————————${endWord}`
  return str
}

async function getRoomEveryDayContent(date, city, endWord) {
  const eol = await getPuppetEol();
  let one = await getOne() //获取每日一句
  let weather = await getTXweather(city) //获取天气信息
  let today = formatDate(new Date()) //获取今天的日期
  let memorialDay = getDay(date) //获取纪念日天数
  let str = `${today}${eol}家人们相聚在一起的第${memorialDay}天${eol}${eol}元气满满的一天开始啦,家人们要努力保持活跃啊^_^${eol}${eol}今日天气${eol}${weather.weatherTips}${eol}${weather.todayWeather}${eol}每日一句:${eol}${one}${eol}${eol}————————${endWord}`
  return str
}

/**
 * 获取倒计时内容
 * @param date
 * @param prefix
 * @param suffix
 * @param endWord
 * @return {string}
 */
async function getCountDownContent(date, prefix, suffix, endWord) {
  const eol = await getPuppetEol();
  let countDownDay = getDay(date) //获取倒计时天数
  let today = formatDate(new Date()) //获取今天的日期
  let str = `${today}距离${prefix}还有${eol}${eol}${countDownDay}天${eol}${eol}${suffix}${endWord?`${eol}${eol}————————${endWord}`:''}`
  return str;
}
/**
 * 更新用户信息
 */
async function updateContactInfo(that, noCache = false) {
  try {
    if(noCache && that.puppet.syncContact) {
      await that.puppet.syncContact()
      await delay(3000)
    }
    const contactSelf = await getUser()
    const contactList = await that.Contact.findAll() || []
    let res = []
    const notids = ['filehelper', 'fmessage']
    let realContact = contactList.filter((item) => {
          const payload = item.payload || item._payload
          return payload.friend && !notids.includes(payload.id) && !payload.id.includes('gh_')
        })
    for (let i of realContact) {
      let contact = i.payload || i._payload
      let obj = {
        robotId: contactSelf.robotId,
        contactId: contact.id,
        wxid: contact.id,
        name: contact.name || '',
        alias: contact.alias || '',
        gender: contact.gender,
        avatar: contact.avatar || '',
        friend: contact.friend,
        type: contact.type || '',
        weixin: contact.weixin || '',
      }
      res.push(obj)
    }
    await updateFriendInfo(res, 80)
    console.log(`更新好友列表完毕，共获取到${realContact.length}个好友信息`)
  } catch (e) {
    console.log('e', e)
  }
}
/**
 * 分批次更新好友信息
 * @param {*} list 好友列表
 * @param {*} num 每次发送数据
 */
async function updateFriendInfo(list, num) {
  const arr = groupArray(list, num)
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    await sendFriend(item)
    await delay(500)
  }
}
/**
 * 更新群列表
 */
async function updateRoomInfo(that, noCache = false) {
  try {
    if(noCache && that.puppet.syncContact) {
      await that.puppet.syncContact()
      await delay(3000)
    }
    const contactSelf = await getUser()
    const roomList = await that.Room.findAll() || []
    let res = []
    for (let i of roomList) {
      let room = i.payload || i._payload
      let obj = {
        robotId: contactSelf.robotId,
        wxid: room.id,
        roomId: room.id,
        topic: room.topic,
        avatar: room.avatar || '',
        ownerId: room.ownerId || '',
        adminIds: room.adminIdList.toString(),
        memberCount: room.memberIdList.length,
      }
      res.push(obj)
    }
    await updateRoomsInfo(res, 80)
    console.log(`更新群列表完毕，共获取到${roomList.length}个群聊`)
  } catch (e) {
    console.log('e', e)
  }
}
/**
 * 更新群信息
 * @param {*} list 好友列表
 * @param {*} num 每次发送数据
 */
async function updateRoomsInfo(list, num) {
  const arr = groupArray(list, num)
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    await sendRoom(item)
    await delay(500)
  }
}
/**
 * 统一触发加群欢迎词
 * @param room 群
 * @param roomName 群名
 * @param contactName 进群人
 * @param msg 消息
 */
async function addRoomWelcomeSay(room, roomName, contactName, msg) {
  if (msg.type === 1 && msg.content !== '') {
    // 文字
    console.log('回复内容', msg.content)
    await room.say(`${roomName}：欢迎新朋友 @${contactName}，\n${msg.content}`)
  } else if (msg.type === 2 && msg.url !== '') {
    // url文件
    let obj = FileBox.fromUrl(msg.url)
    console.log('回复内容', obj)
    await room.say(obj)
  }
}

async function addReplyHistory(that, { content, contact, room }) {
  const config = await allConfig()
  const { role } = config.userInfo
  if(role!=='vip') return
  const robotInfo = that?.currentUser || {}
  const userSelfName = robotInfo?.name() || '' // 机器人名称
  const userSelfId = robotInfo?.id || '' // 机器人名称

  const contactName = contact?.name() // 接收消息人昵称
  const contactId = contact?.id // 接收消息人id
  const roomName = room ? await room.topic() : '';
  const historyItem = {
    conversionId: room ? room.id : contactId,
    conversionName: room ? roomName : contactName,
    isRoom: !!room,
    isRobot: true,
    content: content,
    chatName: userSelfName,
    chatId: userSelfId,
    time: dayjs().unix()
  }
  void addHistory(historyItem)
}
/**
 * 群关键词回复
 * @param {*} contact
 * @param {*} msg
 * @param {*} isRoom
 */
async function roomSay(room, contact, msg) {
  const config = await allConfig()
  const { role } = config.userInfo
  if (msg.id && role === 'vip') {
    const res = await getMaterial(msg.id)
    if(res.id) {
      msg = res
    }
  }
  console.log('回复内容：', JSON.stringify(msg))
  try {
    if (msg.type === 1 && msg.content) {
      const content = await formatContent(msg.content)
      // 文字
      contact ? await room.say(content, contact) : await room.say(content)
      void addReplyHistory(this, { content, contact: null, room: room } )
    } else if (msg.type === 2 && msg.url) {
      // url文件
      let obj = FileBox.fromUrl(msg.url)
      if(obj.mediaType === 'image/webp') {
        obj =  FileBox.fromUrl(`${AIBOTK_OUTAPI}/convert?url=${msg.url}`)
      }
      // contact ? await room.say('', contact) : ''
      await delay(500)
      await room.say(obj)
      void addReplyHistory(this, { content: `[文件或图片](${msg.url})`, contact: null, room: room } )
    } else if (msg.type === 3 && msg.url) {
      // bse64文件
      let obj = FileBox.fromDataURL(msg.url, 'room-avatar.jpg')
      contact ? await room.say('', contact) : ''
      await delay(500)
      await room.say(obj)
    } else if (msg.type === 4 && msg.url && msg.title && msg.description) {
      const description = await formatContent(msg.description)
      const title = await formatContent(msg.title)
      let url = new this.UrlLink({
        description: description,
        thumbnailUrl: msg.thumbUrl,
        title: title,
        url: msg.url,
      })
      await room.say(url)
      void addReplyHistory(this, { content: `[链接](${msg.url})`, contact: null, room: room } )
    } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl) {
      let miniProgram = new this.MiniProgram({
        appid: msg.appid,
        title: msg.title,
        pagePath: msg.pagePath,
        description: msg.description,
        thumbUrl: msg.thumbUrl,
        thumbKey: msg.thumbKey,
        username: msg.username || ''
      })
      await room.say(miniProgram)
    } else if (msg.type === 8 && msg.url && msg.voiceLength) {
      const fileBox = FileBox.fromUrl(msg.url);
      fileBox.mimeType = "audio/silk";
      const puppetInfo = await getPuppetInfo()
      if(puppetInfo.puppetType === 'PuppetService') {
        fileBox.metadata = {
          duration: msg.voiceLength/1000,
        };
      } else {
        fileBox.metadata = {
          voiceLength: msg.voiceLength,
        };
      }
      await room.say(fileBox)
    }
  } catch (e) {
    console.log('群回复错误', e)
  }
}

/**
 * 私聊发送消息
 * @param contact
 * @param msg
 * @param isRoom
 *  type 1 文字 2 图片url 3 图片base64 4 url链接 5 小程序  6 名片 7 富文本 8 语音
 */
async function contactSay(contact, msg, isRoom = false) {
  const config = await allConfig()
  const { role } = config.userInfo
  if (msg.id && role === 'vip') {
    const res = await getMaterial(msg.id)
    if(res.id) {
      msg = res
    }
  }
  console.log('回复内容：', JSON.stringify(msg))
  try {
    if (msg.type === 1 && msg.content) {
      const content = await formatContent(msg.content)
      // 文字
      await contact.say(content)
      void addReplyHistory(this, { content, contact, room: null } )
    } else if (msg.type === 2 && msg.url) {
      // url文件
      let obj = FileBox.fromUrl(msg.url)
      await obj.ready()
      if(obj.mediaType === 'image/webp') {
        obj =  FileBox.fromUrl(`${AIBOTK_OUTAPI}/convert?url=${msg.url}`)
      }
      await contact.say(obj)
      void addReplyHistory(this, { content: `[文件或图片](${msg.url})`, contact, room: null } )
    } else if (msg.type === 3 && msg.url) {
      // bse64文件
      let obj = FileBox.fromDataURL(msg.url, 'user-avatar.jpg')
      await contact.say(obj)
    } else if (msg.type === 4 && msg.url && msg.title && msg.description) {
      const description = await formatContent(msg.description)
      const title = await formatContent(msg.title)
      let url = new this.UrlLink({
        description: description,
        thumbnailUrl: msg.thumbUrl,
        title: title,
        url: msg.url,
      })
      await contact.say(url)
      void addReplyHistory(this, { content: `[链接](${msg.url})`, contact, room: null } )
    } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl) {
      let miniProgram = new this.MiniProgram({
        appid: msg.appid,
        title: msg.title,
        pagePath: msg.pagePath,
        description: msg.description,
        thumbUrl: msg.thumbUrl,
        thumbKey: msg.thumbKey,
        username: msg.username || ''
      })
      await contact.say(miniProgram)
    } else if (msg.type === 8 && msg.url && msg.voiceLength) {
      const fileBox = FileBox.fromUrl(msg.url);
      fileBox.mimeType = "audio/silk";
      const puppetInfo = await getPuppetInfo()
      if(puppetInfo.puppetType === 'PuppetService') {
        fileBox.metadata = {
          duration: msg.voiceLength/1000,
        };
      } else {
        fileBox.metadata = {
          voiceLength: msg.voiceLength,
        };
      }
      await contact.say(fileBox)
    }
  } catch (e) {
    console.log('私聊发送消息失败', e)
  }
}
/**
 * 统一邀请加群
 * @param that
 * @param contact
 */
async function addRoom(that, contact, roomName, replys) {
  let room = await that.Room.find({ topic: roomName })
  if (room) {
    try {
      for (const item of replys) {
        await delay(2000)
        await contactSay.call(that, contact, item)
      }
      await room.add(contact)
    } catch (e) {
      console.error('加群报错', e)
    }
  } else {
    console.log(`不存在此群：${roomName}`)
  }
}
/**
 * 发送群公告
 * @param roomIds
 * @param content
 * @return {Promise<void>}
 */
async function sendRoomNotice(room, content) {
  const config = await allConfig()
  const { role } = config.userInfo
  if(role === 'vip' && room && content) {
    await room.announce(content)
  }
}
/**
 * 重新同步好友和群组
 * @param that
 * @returns {Promise<void>}
 */
async function updateContactAndRoom(that) {
  const contactSelf = await getUser()
  await asyncData(contactSelf.robotId, 1)
  await delay(2000)
  await asyncData(contactSelf.robotId, 2)
  await delay(2000)
  await updateRoomInfo(that, true)
  await delay(2000)
  await updateContactInfo(that)
}
/**
 * 重新同步好友
 * @param that
 * @returns {Promise<void>}
 */
async function updateContactOnly(that) {
  const contactSelf = await getUser()
  await asyncData(contactSelf.robotId, 1)
  await delay(2000)
  await updateContactInfo(that, true)
}
/**
 * 重新同步群
 * @param that
 * @returns {Promise<void>}
 */
async function updateRoomOnly(that) {
  const contactSelf = await getUser()
  await asyncData(contactSelf.robotId, 2)
  await delay(2000)
  await updateRoomInfo(that, true)
}
export { updateRoomOnly }
export { updateContactOnly }
export { getEveryDayContent }
export { getNewsContent }
export { updateContactInfo }
export { updateRoomInfo }
export { addRoom }
export { contactSay }
export { roomSay }
export { addRoomWelcomeSay }
export { updateContactAndRoom }
export { getRoomEveryDayContent }
export { getCountDownContent }
export { sendRoomNotice }
export default {
  updateRoomOnly,
  updateContactOnly,
  getEveryDayContent,
  getNewsContent,
  updateContactInfo,
  updateRoomInfo,
  addRoom,
  contactSay,
  roomSay,
  addRoomWelcomeSay,
  updateContactAndRoom,
  getCountDownContent
}
