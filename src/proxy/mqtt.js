const mqtt = require('mqtt')
const { allConfig } = require('../common/configDb')
const { contactSay, roomSay } = require('../common/index')
const { getConfig, getMqttConfig } = require('../proxy/aibotk')
const { dispatchEventContent } = require('../service/event-dispatch-service')
const { sendRoomTaskMessage, sendContactTaskMessage } = require('../task/index')
const { randomRange } = require('../lib/index')

async function initMqtt(that) {
  try {
    await getConfig() // 获取配置文件
    const config = await allConfig()
    const { userId, name, role } = config.userInfo
    if (role === 'vip') {
      const config = await getMqttConfig()
      const { host, port, username, password, clientId } = config
      let mqttclient = host
        ? mqtt.connect(`${host}:${port}`, {
            username: username,
            password: password,
            clientId: clientId + randomRange(1, 10000),
          })
        : null
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
            if (content.target === 'Room') {
              console.log(`收到群：${content.roomName}发送消息请求： ${content.message.content || content.message.url}`)
              const room = await that.Room.find({ topic: content.roomName })
              if (!room) {
                console.log(`查找不到群：${content.roomName}，请检查群名是否正确`)
                return
              } else {
                await roomSay(room, '', content.message)
              }
            } else if (content.target === 'Contact') {
              console.log(`收到联系人：${content.alias || content.name}发送消息请求： ${content.message.content || content.message.url}`)
              let contact = (await that.Contact.find({ alias: content.alias })) || (await that.Contact.find({ name: content.name })) || (await that.Contact.find({ weixin: content.weixin })) // 获取你要发送的联系人
              if (!contact) {
                console.log(`查找不到联系人：${content.name || content.alias}，请检查联系人名称是否正确`)
                return
              } else {
                await contactSay(contact, content.message)
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
              await sendRoomTaskMessage(that, content)
            } else if (content.target === 'Contact') {
              console.log('触发了好友事件')
              await sendContactTaskMessage(that, content)
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

module.exports = {
  initMqtt,
}
