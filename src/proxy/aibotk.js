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
    let cres = await updateConfig({ puppetType: 'wechaty-puppet-wechat', botScope: 'all', parseMini: false, countDownTaskSchedule: [], parseMiniRooms: [], preventLength: 1000, ...config, cloudRoom })
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
 * 获取群合影配置
 */
async function getRoomPhotoConfig(roomName) {
  try {
    let option = {
      method: 'get',
      url: '/roomPhoto',
      params: { name: roomName },
    }
    let content = await aiBotReq(option)
    return content.data || ''
  } catch (e) {
    console.log('群合影生成错误', e)
  }
}
/**
 * 生成群合影
 * @param {*}} roomName 群名
 * @param {*} list 群成员列表
 * @param {*} contactName 触发用户
 */
async function drawRoomPhoto(roomName, list, contactName) {
  try {
    let option = {
      method: 'POST',
      url: '/roomPhoto',
      params: { name: roomName, user: contactName, list: list },
    }
    let content = await aiBotReq(option)
    return content.data
  } catch (e) {
    console.log('群合影生成错误', e)
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
export { drawRoomPhoto }
export { updatePanelVersion }
export { getRoomPhotoConfig }
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
  drawRoomPhoto,
  updatePanelVersion,
  getRoomPhotoConfig,
  getMqttConfig,
  getMeiNv,
  getOne,
  getMaterial,
  getFireNews
}
