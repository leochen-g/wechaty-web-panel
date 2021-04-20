const mqtt = require('mqtt')
const {allConfig} = require('../common/configDb')
const {contactSay, roomSay,} = require('../common/index')
const { getConfig, getMqttConfig } = require('../proxy/aibotk')

async function initMqtt(that) {
    try {
        await getConfig() // 获取配置文件
        const config = await allConfig()
        const {userId, name, role} = config.userInfo
        if (role === 'vip') {
            const config = await getMqttConfig()
            const {host, port,username, password} = config
            let mqttclient = host ? mqtt.connect(`${host}:${port}`, {
                username: username,
                password: password,
                clientId: `aibotk_client_${userId}`,
                will: {
                    topic: 'devicewill',
                    payload: `${userId} device disconnect`,
                    qos: 0,
                    retain: false
                }
            }): null
            if(mqttclient) {
                mqttclient.on('connect', function () {
                    console.debug('connect to Wechaty mqtt----------')
                    mqttclient.subscribe(`aibotk/${userId}/+`, function (err) {
                        if (err) {
                            console.log(err)
                        }
                    })
                })
                mqttclient.on('error', function (e) {
                    console.debug('error----------', e)
                })
                mqttclient.on('message', async function (topic, message) {
                    const content = JSON.parse(message.toString())
                    if (topic === `aibotk/${userId}/say`) {
                        if (content.target === 'Room') {
                            console.log(`收到群：${content.roomName}发送消息请求： ${content.message.content || content.message.url}`)
                            const room = await that.Room.find({topic: content.roomName})
                            if (!room) {
                                console.log(`查找不到群：${content.roomName}，请检查群名是否正确`)
                                return
                            } else {
                                await roomSay(room, '', content.message)
                            }
                        } else if (content.target === 'Contact') {
                            console.log(`收到联系人：${content.alias || content.name}发送消息请求： ${content.message.content || content.message.url}`)
                            let contact = (await that.Contact.find({alias: content.alias})) || (await that.Contact.find({name: content.name})) || (await that.Contact.find({weixin: content.weixin})) // 获取你要发送的联系人
                            if (!contact) {
                                console.log(`查找不到联系人：${content.name || content.alias}，请检查联系人名称是否正确`)
                                return
                            } else {
                                await contactSay(contact, content.message)
                            }
                        }
                    } else if (topic === `aibotk/${userId}/event`) {
                        console.log('触发了事件')
                    }
                })
            }

        } else {
            return false
        }
    } catch(e) {
      console.log('mqtt 创建链接失败', e)
    }
}


module.exports = {
    initMqtt
}