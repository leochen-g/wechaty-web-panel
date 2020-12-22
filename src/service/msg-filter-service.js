const { allConfig } = require('../common/configDb')
const msgFilter = require('./msg-filters')
const WEIXINOFFICIAL = ['朋友推荐消息', '微信支付', '微信运动', '微信团队', 'recommendation message'] // 微信官方账户，针对此账户不做任何回复
const DELETEFRIEND = '开启了朋友验证' // 被人删除后，防止重复回复
const REMINDKEY = '提醒'
const NEWADDFRIEND = '你已添加'

async function getMsgReply(resArray, { that, msg, name, contact, config, avatar, id, room }) {
  let msgArr = []
  for (let i = 0; i < resArray.length; i++) {
    const item = resArray[i]
    if (item.bool) {
      msgArr = (await msgFilter[item.method]({ that, msg, name, contact, config, avatar, id, room })) || []
    }
    if (msgArr.length > 0) {
      return msgArr
    }
  }
  return []
}

/**
 * 微信好友文本消息事件过滤
 *
 * @param that wechaty实例
 * @param {Object} contact 发消息者信息
 * @param {string} msg 消息内容
 * @returns {number} 返回回复内容
 */
async function filterFriendMsg(that, contact, msg) {
  const config = await allConfig() // 获取配置信息
  const name = contact.name()
  const id = contact.id
  const avatar = await contact.avatar()
  const resArray = [
    { bool: msg === '', method: 'emptyMsg' },
    { bool: msg.includes(DELETEFRIEND) || WEIXINOFFICIAL.includes(name) || msg.length > 200, method: 'officialMsg' },
    { bool: msg.includes(NEWADDFRIEND), method: 'newFriendMsg' },
    { bool: config.roomJoinKeywords && config.roomJoinKeywords.length > 0, method: 'roomInviteMsg' },
    { bool: msg.startsWith(REMINDKEY), method: 'scheduleJobMsg' },
    { bool: config.eventKeywords && config.eventKeywords.length > 0, method: 'eventMsg' },
    { bool: true, method: 'keywordsMsg' },
    { bool: config.autoReply, method: 'robotMsg' },
  ]
  const msgArr = await getMsgReply(resArray, { that, msg, contact, name, config, avatar, id })
  return msgArr.length > 0 ? msgArr : [{ type: 1, content: '', url: '' }]
}

/**
 * 微信群文本消息事件监听
 * @param {*} msg 群消息内容
 * @param {*} name 发消息人昵称
 * @param {*} id 发消息人
 * @param avatar
 * @returns {number} 返回事件类型
 * 事件说明
 * 0 机器人回复
 * 1 开启了好友验证 || 朋友推荐消息 || 发送的文字消息过长,大于40个字符
 * 2 初次添加好友
 */
async function filterRoomMsg(that, msg, name, id, avatar, room) {
  const config = await allConfig() // 获取配置信息
  const resArray = [
    { bool: msg === '', method: 'emptyMsg' },
    { bool: config.eventKeywords && config.eventKeywords.length > 0, method: 'eventMsg' },
    { bool: true, method: 'keywordsMsg' },
    { bool: config.autoReply, method: 'robotMsg' },
  ]
  const msgArr = await getMsgReply(resArray, { that, msg, name, config, avatar, id, room })
  return msgArr.length > 0 ? msgArr : [{ type: 1, content: '', url: '' }]
}

module.exports = {
  filterFriendMsg,
  filterRoomMsg,
}
