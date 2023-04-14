import { aiBotReq, req } from './superagent.js'
import { updateConfig } from '../db/configDb.js'
import { packageJson } from '../package-json.js'
/**
 * 获取美女图片
 */
async function getMeiNv() {
  try {
    let option = {
      method: 'GET',
      url: '/meinv',
      params: {},
    }
    let content = await aiBotReq(option)
    let pics = content.data.pics || []
    if (pics.length) {
      let url = pics[0]
      return url.includes('.jpg') ? url : 'https://tva2.sinaimg.cn/large/0072Vf1pgy1foxkcsx9rmj31hc0u0h9k.jpg'
    }
  } catch (e) {
    console.log('获取美女图片失败', e)
    return 'https://tva2.sinaimg.cn/large/0072Vf1pgy1foxkcsx9rmj31hc0u0h9k.jpg'
  }
}


/**
 * 获取配置词云的所有群名
 */
export async function getWordCloudRoom() {
  try {
    let option = {
      method: 'get',
      url: '/wordcloudroom',
      params: {},
    }
    let content = await aiBotReq(option)
    const roomNames = content.data.map(item=> item.roomName)
    return roomNames  || []
  } catch (e) {
    console.log('群词云配置拉取失败', e)
    return []
  }
}
/**
 * 获取群合影配置
 */
export async function getWordCloudConfig(roomName) {
  try {
    let option = {
      method: 'get',
      url: '/roomCloud',
      params: { name: roomName },
    }
    let content = await aiBotReq(option)
    return content.data || ''
  } catch (e) {
    console.log('群词云配置拉取失败', e)
  }
}

/**
 * 获取词云图片
 */
export async function getWordCloud(wordcontent, background, border) {
  try {
    let option = {
      method: 'POST',
      url: '/wordcloud',
      params: {
        content: wordcontent,
        background,
        border
      },
    }
    let content = await aiBotReq(option)
    let pics = decodeURIComponent(content.data.img)
    return pics
  } catch (e) {
    console.log('获取词云图片失败', e)
  }
}
/**
 * 获取每日一句
 */
async function getOne() {
  try {
    let option = {
      method: 'GET',
      url: '/one',
      params: {},
    }
    let content = await aiBotReq(option)
    let word = content.data.word || '今日一句似乎已经消失'
    return word
  } catch (e) {
    console.log('获取每日一句失败', e)
    return '今日一句似乎已经消失'
  }
}
/**
 * 获取火灾新闻
 */
async function getFireNews(id, num) {
  try {
    let option = {
      method: 'GET',
      url: '/firenews',
      params: {
        id,
        num
      },
    }
    let content = await aiBotReq(option)
    let newList = content.data || []
    let news = ''
    for (let i in newList) {
      let num = parseInt(i) + 1
      const url = newList[i].shortUrl?newList[i].shortUrl:newList[i].url
      news = `${news}\r${num}.${newList[i].title}${url?`\r${url}\r`:`\r`}`
    }
    const endMap = {
      1001: '您可以 @消防小助手+新闻标题，通过ChatGPT为您分析时事新闻！',
      1002: '您可以 @消防小助手+新闻标题，通过ChatGPT为您分析今日消防行业招标信息！',
    }
    return `${news}…………………………\r\r${endMap[id]}`
  } catch (e) {
    console.log('获取每日一句失败', e)
    return '今日一句似乎已经消失'
  }
}
/**
 * 获取配置文件
 * @returns {Promise<*>}
 */
async function getConfig() {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/config',
      params: {},
    }
    let content = await aiBotReq(option)
    const config = JSON.parse(content.data.config)
    const cloudRoom = await getWordCloudRoom()
    const customBotConfig = [
      { id: 1, type: 'room', targetName: '自定义回复群', record: 0,  targetId: '', openChat: 1, needAt: 1, filter: 1, robotType: 7, keywords: [], defaultReply: '你还没有开启GPT聊天权限', limitNum: 300, botConfig: { systemMessage: '', showQuestion: 1, debug: 0, proxyUrl: '', proxyPass: '', token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJ3cWptamFAaG90bWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vYXV0aCI6eyJ1c2VyX2lkIjoidXNlci1oYzhmNjF2VXV5QlR3OVZlNTRHYjVjZloifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDYzY2RmZjJiN2VmNzliOTRmYjc4NWU3YSIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE2ODEyMzIzNjUsImV4cCI6MTY4MjQ0MTk2NSwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvZmZsaW5lX2FjY2VzcyJ9.aF-3Wc7Nw1xSZtnSEZyAAl5vDFpF_zWWIFFtENEbcp3U2KdgC9QBSyVciWT-_pyY6b2nkGvPK6OaUR7sF3owzo59Yms6Te-Aut-Fe0mPZRWCfSwj2FCDctKHUcXbzLq7IFhxDHqaRuKLBR0rPp32lBC5cPmGqnUxR_9ArHvlSQrqdD5v2K_ii2TtlHn9VUqnwEXspl2_gRnLfLoRFMfpP-rkjggJSYdsYHjFtobBlCX_J2XS4f55xioCaCuO-iSt-8EYpFo4qBjZN08ucMQoHMBOeBf1WaCtwPjAbJEaiFeYVYkhjPYRN3kZFODhulsVF01NbfOyEG0EsHR6HObYDA', model: '' } },
      { id: 2, type: 'room', targetName: '自定义回复群2', record: 0, targetId: '', openChat: 0, needAt: 1, filter: 1, robotType: 7, keywords: [], defaultReply: '你还没有开启GPT聊天权限', limitNum: 300, botConfig: { systemMessage: '', showQuestion: 0, debug: 0, proxyUrl: '', proxyPass: '', token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJlNHB4YXRjd0Bob3RtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7InVzZXJfaWQiOiJ1c2VyLVVNSmR0RGd0bkhSR05JS2NuZUJkc1BGViJ9LCJpc3MiOiJodHRwczovL2F1dGgwLm9wZW5haS5jb20vIiwic3ViIjoiYXV0aDB8NjNjZGZkMjAyZDE5Nzc3ZmZiY2FjNDczIiwiYXVkIjpbImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEiLCJodHRwczovL29wZW5haS5vcGVuYWkuYXV0aDBhcHAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTY4MTIzMjI2MiwiZXhwIjoxNjgyNDQxODYyLCJhenAiOiJUZEpJY2JlMTZXb1RIdE45NW55eXdoNUU0eU9vNkl0RyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgbW9kZWwucmVhZCBtb2RlbC5yZXF1ZXN0IG9yZ2FuaXphdGlvbi5yZWFkIG9mZmxpbmVfYWNjZXNzIn0.WigtuCK3PslsQxFcmwkegAI1A-b6y2qtZy2pwNbKjE4bNAd4GCC1176-Mabg6b90mkDP8v4UROOzWExiILsDU5rx7Afm3AaIF6opLxik34TpU1WjLuYxqJpVABWas1pmCIebgJcFBD0tUZaumC4id4WXSauofpBCEnPVXLLtNw3T9b8IZuqzV23y-AwzkeSImhksdQRNsf7DBDfpQiTh6wDw2Sadc_Dxn430ZgYi2yR81LwzCw25WHXrWW7xuPsIh1c7ab2GVFws8njAY8ug1bL4JfUx0Fxpy-pojFHz3BJzVk_wW4MoB_XesfoMIDuqWnAb-iYJvFAxpAoFioS5QQ', model: '' } },
    ]
    let cres = await updateConfig({ puppetType: 'wechaty-puppet-wechat', botScope: 'all', customBotConfig, parseMini: false, showQuestion: true, openaiTimeout: 60, openaiAccessToken: '', openaiDebug: false, openaiModel:'gpt-3.5-turbo', openaiSystemMsg: '', proxyUrl: '', proxyPassUrl: '', countDownTaskSchedule: [], parseMiniRooms: [], preventLength: 1000, ...config, cloudRoom })
    return cres
  } catch (e) {
    console.log('获取配置文件失败:' + e)
  }
}
/**
 * 获取定时提醒任务列表
 */
async function getScheduleList() {
  try {
    let option = {
      method: 'GET',
      url: '/task',
      params: {},
    }
    let content = await aiBotReq(option)
    let scheduleList = content.data
    console.log('获取定时任务成功:' + scheduleList)
    return scheduleList
  } catch (error) {
    console.log('获取定时任务失败:' + error)
  }
}
/**
 * 设置定时提醒任务
 * @param {*} obj 任务详情
 * @returns {*} 任务详情
 */
async function setSchedule(obj) {
  try {
    let option = {
      method: 'POST',
      url: '/task',
      params: obj,
    }
    let content = await aiBotReq(option)
    return content.data
  } catch (error) {
    console.log('添加定时任务失败', error)
  }
}
/**
 * 更新定时提醒任务
 */
async function updateSchedule(id) {
  try {
    let option = {
      method: 'GET',
      url: '/task/update',
      params: { id: id },
    }
    let content = await aiBotReq(option)
    console.log('更新定时任务成功')
  } catch (error) {
    console.log('更新定时任务失败', error)
  }
}
/**
 * 登录二维码推送
 * @param url
 * @param status
 * @returns {Promise<void>}
 */
async function setQrCode(url, status) {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/qrcode',
      params: { qrUrl: url, qrStatus: status },
    }
    let content = await aiBotReq(option)
    if (content) {
      console.log('推送二维码成功')
    } else {
      console.log('推送登录二维码失败')
    }
  } catch (error) {
    console.log('推送登录二维码失败', error)
  }
}
/**
 * 推送登录状态的心跳
 * @param heart
 * @returns {Promise<void>}
 */
async function sendHeartBeat(heart) {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/heart',
      params: { heartBeat: heart },
    }
    let content = await aiBotReq(option)
    console.log('推送心跳成功')
  } catch (error) {
    console.log('推送心跳失败', error)
  }
}
/**
 * 推送错误
 * @param error
 * @returns {Promise<void>}
 */
async function sendError(error) {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/qrerror',
      params: { qrError: error },
    }
    let content = await aiBotReq(option)
    console.log('推送错误成功', error)
  } catch (e) {
    console.log('推送错误失败', e)
  }
}
/**
 * 更新头像
 * @returns {Promise<void>}
 * @param url
 * @param info 用户基本信息
 */
async function sendRobotInfo(url, name, id) {
  try {
    let option = {
      method: 'POST',
      url: '/wechat/info',
      params: { avatar: url, robotName: name, robotId: id },
    }
    let content = await aiBotReq(option)
    console.log('推送头像成功')
  } catch (error) {
    console.log('推送头像失败', error)
  }
}
/**
 * 更新好友
 * @returns {Promise<void>}
 * @param url
 */
async function sendFriend(friend) {
  try {
    let option = {
      method: 'POST',
      url: '/wechat/friend',
      params: { friend: friend },
    }
    let content = await aiBotReq(option)
    if (!content.code === 200) {
      console.log('推送失败', content.msg)
    }
  } catch (error) {
    console.log('推送好友列表失败')
  }
}
/**
 * 更新群
 * @returns {Promise<void>}
 * @param url
 */
async function sendRoom(room) {
  try {
    let option = {
      method: 'POST',
      url: '/wechat/room',
      params: { room: room },
    }
    let content = await aiBotReq(option)
    if (!content.code === 200) {
      console.log('推送失败', content.msg)
    }
  } catch (error) {
    console.log('推送群列表失败', error)
  }
}
/**
 * 同步群和好友列表
 * type： 1 好友 2 群组
 */
async function asyncData(robotId, type) {
  try {
    let option = {
      method: 'get',
      url: '/wechat/asyncData',
      params: { type, robotId },
    }
    let content = await aiBotReq(option)
  } catch (error) {
    console.log('同步好友列表失败', error)
  }
}
/**
 * 获取上传token
 * @returns {Promise<*>}
 */
async function getQiToken() {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/qitoken',
      params: {},
      platform: 'qi',
    }
    let content = await aiBotReq(option)
    return content.data.token
  } catch (e) {
    console.log('token error', e)
  }
}
/**
 * 上传base64图片到七牛云
 * @param base
 * @param name
 * @returns {Promise<void>}
 */
async function putqn(base, name) {
  try {
    const token = await getQiToken()
    const namebase = Buffer.from(name).toString('base64').replace(/=/g, '')
    let filename = 'wechat/avatar/' + namebase + '.jpeg'
    let base_file_name = Buffer.from(filename).toString('base64').replace('+', '-').replace('/', '_')
    let options = {
      method: 'POST',
      url: 'http://upload.qiniup.com/putb64/-1/key/' + base_file_name,
      contentType: 'application/octet-stream',
      authorization: 'UpToken ' + token,
      params: base,
      platform: 'chuan',
    }
    let content = await req(options)
    console.log('上传结果', content.key)
    return 'https://img.aibotk.com/' + content.key
  } catch (e) {
    console.log('上传失败', e.Error)
  }
}
/**
 * 更新插件版本信息
 * @param {*} version
 */
async function updatePanelVersion() {
  try {
    let option = {
      method: 'POST',
      url: '/webPanel/version',
      params: { version: packageJson.version || '0.2.11' },
    }
    console.log('更新插件版本号', packageJson.version)
    let content = await aiBotReq(option)
    return content.data
  } catch (error) {
    console.log('error', error)
  }
}
/**
 * 获取mqtt信息
 * @param {*} version
 */
async function getMqttConfig() {
  try {
    let option = {
      method: 'GET',
      url: '/ws/mqtt/config',
      params: {},
    }
    let content = await aiBotReq(option)
    return content.data
  } catch (error) {
    console.log('获取mqtt配置错误', error)
  }
}
/**
 * 获取实时素材
 * @param {*} version
 */
async function getMaterial(id) {
  try {
    let option = {
      method: 'GET',
      url: '/wechat/material',
      params: {
        id,
      },
    }
    let content = await aiBotReq(option)
    console.log('素材', content.data)
    return content.data
  } catch (error) {
    console.log('获取mqtt配置错误', error)
  }
}
export { getConfig }
export { getScheduleList }
export { setSchedule }
export { updateSchedule }
export { setQrCode }
export { sendHeartBeat }
export { sendError }
export { sendRobotInfo }
export { putqn }
export { sendFriend }
export { sendRoom }
export { asyncData }
export { updatePanelVersion }
export { getMqttConfig }
export { getMeiNv }
export { getOne }
export { getMaterial }
export { getFireNews }
export default {
  getConfig,
  getScheduleList,
  setSchedule,
  updateSchedule,
  setQrCode,
  sendHeartBeat,
  sendError,
  sendRobotInfo,
  putqn,
  sendFriend,
  sendRoom,
  asyncData,
  updatePanelVersion,
  getMqttConfig,
  getMeiNv,
  getOne,
  getMaterial,
  getFireNews
}
