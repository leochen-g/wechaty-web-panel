import * as mqtt from 'mqtt'
import {allConfig} from '../db/configDb.js'
import {contactSay, roomSay, sendRoomNotice} from '../common/index.js'
import {getConfig, getGptConfig, getMqttConfig, getRssConfig, getTasks, getVerifyCode} from "./aibotk.js";
import {dispatchEventContent} from '../service/event-dispatch-service.js'
import {initMultiTask, sendMultiTaskMessage, sendTaskMessage} from "../task/index.js";
import {delay, randomRange} from "../lib/index.js";
import {reset} from './bot/chatgpt.js'
import {reset as difyReset} from './bot/dify.js'
import {reset as cozeReset} from './bot/coze.js'
import {reset as qanyReset} from './bot/qany.js'
import {reset as cozeV3Reset} from './bot/cozev3.js'
import {initRssTask, sendRssTaskMessage} from "../task/rss.js";
import globalConfig from "../db/global.js";
import {resetScanTime} from '../handlers/on-scan.js'
import {clearHistory} from "../db/chatHistory.js";

let mqttclient = null

async function getContact(that, contact) {
  const contactInfo = (contact.wxid && await that.Contact.find({id: contact.wxid || ''})) || (contact.id && await that.Contact.find({id: contact.id || ''})) || (contact.name && await that.Contact.find({name: contact.name || ''})) || (contact.alias && await that.Contact.find({alias: contact.alias || ''})) || (contact.weixin && await that.Contact.find({weixin: contact.weixin || ''}))
  return contactInfo
}
async function getRoom(that, room) {
  const roomInfo = (room.wxid && await that.Room.find({id: room.wxid || ''})) || (room.id && await that.Room.find({id: room.id || ''})) || (room.name && await that.Room.find({topic: room.name || ''})) || (room.roomName && await that.Room.find({topic: room.roomName || ''}))
  return roomInfo
}

async function sendRoomSay(that, room, messages, atList) {
  console.log(`收到群：${room.name}批量发送消息请求， 消息数量【${messages.length}】`)
  const finalRoom = await getRoom(that, room)

  if (!finalRoom) {
    console.log(`查找不到群：${room.name}，请检查群名是否正确`)
    return
  } else {
    for (let message of messages) {
      const atContacts = await getAtContacts(that, atList)
      await roomSay.call(that,finalRoom, atContacts, message)
      await delay(500)
    }
  }
}

async function sendContactSay(that, contact, messages) {
  console.log(`收到好友：${contact.name}批量发送消息请求， 消息数量【${messages.length}】`)
  const finalContact = await getContact(that, contact)

  if (!finalContact) {
    console.log(`查找不到好友：${contact.name}，请检查好友名称是否正确`)
    return
  } else {
    for (let message of messages) {
      await contactSay.call(that, finalContact, message)
      await delay(500)
    }
  }
}

async function getAtContacts(that, atList) {
  if (!atList || atList.length === 0) return ''
  console.log('atList', atList)
  let contacts = []
  for (let contact of atList) {
    if (contact.id === '@all' || contact.name === '@all') {
      contacts.push('@all')
      return contacts
    }
    let atContact = await getContact(that, contact)
    if (atContact) {
      contacts.push(atContact)
    }
  }
  console.log('search contact', contacts)
  return contacts
}

async function sendRoomsNotice(that, room, messages) {
  console.log(`收到群：${room.name}批量发送群公告请求， 公告数量【${messages.length}】`)
  const finalRoom = await getRoom(that, room)

  if (!finalRoom) {
    console.log(`查找不到群：${room.name}，请检查群名是否正确`)
    return
  } else {
    for (let message of messages) {
      await sendRoomNotice.call(that, finalRoom, message.content)
      await delay(500)
    }
  }
}

async function initMqtt(that) {
  try {
    await getConfig() // 获取配置文件
    const config = await allConfig()
    const { userId, name, role } = config.userInfo
    if (role === 'vip') {
      const config = await getMqttConfig()
      const { host, port, username, password, clientId } = config
      if(!mqttclient) {
        mqttclient = host
          ? mqtt.connect(`${host}:${port}`, {
            username: username,
            password: password,
            clientId: clientId + randomRange(1, 10000),
          })
          : null
      }
      if (mqttclient) {
        mqttclient.on('connect', function () {
          console.debug('connect to Wechaty mqtt----------')
          mqttclient.subscribe(`aibotk/${userId}/+`, function (err) {
            if (err) {
              console.log(err)
            }
          })
        })
        mqttclient.on('reconnect', function (e) {
          console.log('subscriber on reconnect')
        })
        mqttclient.on('disconnect', function (e) {
          console.log('disconnect--------', e)
        })
        mqttclient.on('error', function (e) {
          console.debug('error----------', e)
        })
        mqttclient.on('message', async function (topic, message) {
          const content = JSON.parse(message.toString())
          if (topic === `aibotk/${userId}/say`) {
            if (content.target === 'Room' || content.target === 'room') {
              console.log(`收到群：${content.roomName}发送消息请求： ${content.message.content || content.message.url}`)
              const room = content.wxid && await that.Room.find({ id: content.wxid }) || await that.Room.find({ topic: content.roomName })
              if (!room) {
                console.log(`查找不到群：${content.roomName}，请检查群名是否正确`)
                return
              } else {
                const atContacts = content?.atList && content?.atList.length ? await getAtContacts(that, content?.atList) : ''
                await roomSay.call(that, room, atContacts, content.message)
              }
            } else if (content.target === 'Contact' || content.target === 'contact') {
              console.log(`收到联系人：${content.alias || content.name}发送消息请求： ${content.message.content || content.message.url}`)
              let contact = await getContact(that, content) // 获取你要发送的联系人
              if (!contact) {
                console.log(`查找不到联系人：${content.name || content.alias}，请检查联系人名称是否正确`)
                return
              } else {
                await contactSay.call(that, contact, content.message)
              }
            }
          } if (topic === `aibotk/${userId}/multisay`) {
            console.log('触发批量发送消息请求', content.target);
            if (content.target === 'Room' || content.target === 'room') {
              for(let room of content.groups) {
                await sendRoomSay(that, room, content.messages, content?.atList)
                await delay(600)
              }
            } else if (content.target === 'Contact' || content.target === 'contact') {
              for(let contact of content.groups) {
                await sendContactSay(that, contact, content.messages)
                await delay(600)
              }
            } else if(content.target === 'RoomNotice' || content.target === 'roomnotice' ||content.target === 'roomNotice') {
              for(let room of content.groups) {
                await sendRoomsNotice(that, room, content.messages)
                await delay(600)
              }
            }
          } else if (topic === `aibotk/${userId}/event`) {
            if (content.target === 'system') {
              console.log('触发了内置事件')
              const eventName = content.event
              const res = await dispatchEventContent(that, eventName)
              console.log('事件处理结果', res[0].content)
            } else if (content.target === 'Room') {
              console.log('触发了群事件')
              await sendTaskMessage(that, content)
            } else if (content.target === 'Contact') {
              console.log('触发了好友事件')
              await sendTaskMessage(that, content)
            } else if (content.target === 'Rss') {
              console.log('触发了rss立即更新事件')
              await sendRssTaskMessage(that, content)
            }  else if (content.target === 'Tasks') {
              console.log('触发了批量任务立即发送')
              await sendMultiTaskMessage(that, content.task)
            } else if (content.target === 'refreshCode') {
              console.log('强制更新二维码')
              await that.refreshQrCode()
            } else if (content.target === 'getNewQrCode') {
              console.log('获取最新二维码')
              resetScanTime()
            } else if (content.target === 'logout') {
              console.log('退出登录')
              that.logout()
            } else if (content.target === 'verifyCode') {
              console.log('触发了输入验证码事件')
              if (globalConfig.getVerifyId() === globalConfig.getQrKey()) {
                await getVerifyCode();
                if(globalConfig.getVerifyCode()) {
                  console.log(`获取到输入的验证码:${globalConfig.getVerifyCode()}，正在填入`)
                  const verifyCode = globalConfig.getVerifyCode() // 通过一些途径输入验证码
                  try {
                    await that.enterVerifyCode(globalConfig.getVerifyId(), verifyCode) // 如果没抛错，则说明输入成功，会推送登录事件
                  } catch (e) {
                    console.log('验证码校验错误：', e.message)
                    // 如果抛错，请根据 message 处理，目前发现可以输错3次，超过3次错误需要重新扫码。
                    // 错误关键词: 验证码错误输入错误，请重新输入
                    // 错误关键词：验证码错误次数超过阈值，请重新扫码'
                    // 目前不会推送 EXPIRED 事件，需要根据错误内容判断
                  }
                }
              }
            }
          } else if(topic === `aibotk/${userId}/gptconfig`) {
            await getGptConfig()
            console.log('更新最新自定义对话配置')
            if(content.event === 'update' || content.event === 'delete') {
              console.log('更新自定义对话配置，重置对话')
              reset(content.updateId)
              difyReset(content.updateId)
              cozeReset(content.updateId)
              qanyReset(content.updateId)
              cozeV3Reset(content.updateId)
            }
          } else if(topic === `aibotk/${userId}/rssconfig`) {
            console.log('更新rss配置')
            await getRssConfig()
            void initRssTask(that)
          } else if(topic === `aibotk/${userId}/tasks`) {
            console.log('更新批量定时任务')
            await getTasks()
            void initMultiTask(that)
          } else if(topic === `aibotk/${userId}/history`) {
            console.log('历史记录操作')
            if(content.event === 'clear') {
              clearHistory()
            }
          }
        })
      }
    } else {
      return false
    }
  } catch (e) {
    console.log('mqtt 创建链接失败', e)
  }
}
export function closeMqtt() {
  if(mqttclient && mqttclient.connected) {
    mqttclient.end()
    mqttclient = null
  }
}
export { initMqtt }
export default {
  initMqtt,
}
