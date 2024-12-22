import {
  getCname,
  getEmo,
  getGoldReply,
  getLunar,
  getMingYan,
  getNews,
  getResByTX,
  getRkl,
  getRubbishType,
  getSkl,
  getStar,
  getSweetWord,
  getXhy,
  getXing
} from '../proxy/api.js'
import {getConfig, getCustomEvents, getMeiNv, getWordCloudConfig} from '../proxy/aibotk.js'
import {getConstellation, getNewsType, msgArr} from '../lib/index.js'
import {initMultiTask, initTaskLocalSchedule, initTimeSchedule} from "../task/index.js";
import {roomSay, updateContactAndRoom, updateContactOnly, updateRoomOnly} from '../common/index.js'
import {getTencentOpenReply} from '../proxy/tencent-open.js'
import {removeRecord} from "../db/roomDb.js";
import {getGptOfficialReply, getSimpleGptReply, reset as officialReset} from "../proxy/openAi.js";
import {getDifyReply, getDifySimpleReply, reset as difyReset} from "../proxy/difyAi.js";
import {getCozeV3Reply, getCozeV3SimpleReply, reset as cozeV3Reset} from "../proxy/cozeV3Ai.js";
import {getCozeReply, getCozeSimpleReply, reset as cozeReset} from '../proxy/cozeAi.js'
import {getQAnyReply, reset as qanyReset} from '../proxy/qAnyAi.js'
import {outApi} from '../proxy/outapi.js'
import {getUser} from "../db/userDb.js";

/**
 * 根据事件名称分配不同的api处理，并获取返回内容
 * @param {string} eName 事件名称
 * @param {string} msg 消息内容
 * @param name
 * @param id
 * @param avatar
 * @returns {string} 内容
 */
async function dispatchEventContent(that, eName, msg, name, id, avatar, room, roomName, sourceMsg, contact, eventInfo) {
  try {
    let content = '',
      type = 1,
      url = ''

    if(eName.includes('event-')) {
      const res = await getCustomEvents({ msg: msg || '', sourceMsg: sourceMsg || '', wxid: id, name, eventId: eName, roomName: roomName || '' })
      return res;
    }
    /**
     * 扩展 api
     */
    if(eName.includes('outapi-')) {
      const res = await outApi({ msg: msg || '', sourceMsg: sourceMsg || '', wxid: id, name, eventId: eName, roomName: roomName || '' })
      return res;
    }
    switch (eName) {
      case 'rubbish':
        content = await getRubbishType(msg)
        break
      case 'mingyan':
        content = await getMingYan()
        break
      case 'sweetword':
        content = await getSweetWord()
        break
      case 'star':
        let xing = getConstellation(msg)
        content = await getStar(xing)
        break
      case 'news':
        let newsId = getNewsType(msg)
        content = await getNews(newsId)
        break
      case 'xing':
        content = await getXing(msg)
        break
      case 'skl':
        content = await getSkl(msg)
        break
      case 'lunar':
        content = await getLunar(msg)
        break
      case 'goldreply':
        content = await getGoldReply(msg)
        break
      case 'xhy':
        content = await getXhy(msg)
        break
      case 'rkl':
        content = await getRkl(msg)
        break
      case 'emo':
        url = await getEmo(msg)
        type = 2
        break
      case 'meinv':
        url = await getMeiNv()
        type = 2
        break
      case 'cname':
        content = await getCname()
        break
      case 'removeRecord': {
        const roomName = await room.topic() // 获取群名
        const config = await getWordCloudConfig(roomName)
        if (config.authList) {
          if(config.authList.length) {
            if (config.authList.includes(name)) {
              await removeRecord(roomName)
              content = '清除成功'
            } else {
              content = '很抱歉，你没有权限清楚记录'
            }
          } else {
            await removeRecord(roomName)
            content = '清除成功'
          }
        } else {
          content = '本群暂未开通群词云功能，无需清楚记录'
        }
        break
      }
      case 'reloadFriendOnly':
        await updateContactOnly(that)
        content = '更新好友列表成功，请稍等两分钟后生效'
        break
      case 'reloadRoomOnly':
        await updateRoomOnly(that)
        content = '更新群列表成功，请稍等两分钟后生效'
        break
      case 'reloadFriend':
        await updateContactAndRoom(that)
        content = '更新好友群消息成功，请稍等两分钟后生效'
        break
      case 'updateConfig':
        await getConfig()
        await initTaskLocalSchedule(that)
        await initTimeSchedule(that)
        await initMultiTask(that)
        officialReset();
        difyReset();
        cozeReset();
        qanyReset();
        cozeV3Reset();
        content = '更新配置成功，请稍等一分钟后生效'
        break
      case 'autoRoomCreate':
        console.log('触发创建群聊指令，拉取用户并创建群聊')
        const roomMembers = [contact]
        const creatInfo = eventInfo?.otherInfo || { members: [], name: '', welcomes: [], tips: '' }
        for (let member of creatInfo.members) {
          console.log('member', member)
          const target = member.id && (await that.Contact.find({id: member.id})) || member.name && (await that.Contact.find({name: member.name})); // 获取你要发送的联系人
          if (target) {
            roomMembers.push(target)
          } else {
            console.log(`没有查找到你预设进群的用户:${member.name},请确保是机器人的好友`)
          }
        }
        that.Room.create(roomMembers, creatInfo.name || '').then((room)=> {
          if (room) {
            console.log('创建群聊成功')
            if(creatInfo.welcomes && creatInfo.welcomes.length) {
              for (let welcome of creatInfo.welcomes) {
                void roomSay.call(that, room, contact, welcome)
              }
            }
          }
        }).catch(e => {
            console.log('创建群聊失败', e)
        })

        content = creatInfo.tips || '正在拉您进群，请稍后...'
        break;
      default:
        break
    }
    return msgArr(type, content, url)
  } catch (e) {
    console.log('事件处理异常', e)
    return []
  }
}
/**
 * 派发不同的机器人处理回复内容
 * @param {*} bot 机器人类别 0 天行机器人 1 天行的图灵机器人 2 图灵机器人 3 腾讯闲聊机器人
 * @param {*} msg 消息内容
 * @param {*} name 发消息人
 * @param {*} id 发消息人id
 */
async function dispatchAiBot({ bot, msg, name, id, uid, uname, roomId, userAlias, userWeixin, roomName }) {
  try {
    let res, replys
    const contactSelf = await getUser()
    switch (bot) {
      case 0:
        // 天行机器人
        res = await getResByTX(msg, id)
        replys = [{ type: 1, content: res }]
        break
      case 5:
        // 微信开放对话平台
        res = await getTencentOpenReply({ msg, id, userInfo: { name } })
        replys = res
        break
      case 6:
        // ChatGPT-api
        res = await getGptOfficialReply(msg, id, false)
        replys = res
        break
      case 8:
        // dify ai
        res = await getDifyReply({ content: msg, id, inputs: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } })
        replys = res
        break
      case 9:
        // fast gpt
        res = await getGptOfficialReply(msg, id, true, { uid, uname, ualias: userAlias, uweixin: userWeixin, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name })
        replys = res
        break
      case 11:
        // coze
        res = await getCozeReply(msg, id)
        replys = res
        break
      case 12:
        // coze v3
        res = await getCozeV3Reply({ content: msg, id, inputs: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } })
        replys = res
        break
      case 13:
        // QAnything
        res = await getQAnyReply(msg, id)
        replys = res
        break
      default:
        replys = [{ type: 1, content: '' }]
        break
    }
    return replys
  } catch (e) {
    console.log('机器人接口信息获取失败', e)
    return ''
  }
}

async function dispatchSummerBot({ content, id, uid, uname, roomId, roomName, userAlias, userWeixin, config}) {
  try {
    let res, replys
    const contactSelf = await getUser()
    switch (config.botType) {
      case 6:
        // ChatGPT-api
        res = await getSimpleGptReply({content, uid: id, config, isFastGPT:false})
        replys = res
        break
      case 8:
        // dify ai
        res = await getDifySimpleReply({content, id, inputs: { uid, uname, ualias: userAlias, uweixin: userWeixin, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name }, config})
        replys = res
        break
      case 9:
        // fast gpt
        res =  await getSimpleGptReply({content, uid: id, config, isFastGPT:true, variables: { uid, ualias: userAlias, uweixin: userWeixin, uname, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name } })
        replys = res
        break
      case 11:
        // coze
        res = await getCozeSimpleReply({content, uid: id, config, isFastGPT:true})
        replys = res
        break
      case 12:
        // coze v3
        res = await getCozeV3SimpleReply({content, id, inputs: { uid, uname, ualias: userAlias, uweixin: userWeixin, roomId, roomName, robotId: contactSelf.robotId, robotName: contactSelf.name }, config})
        replys = res
        break
      default:
        replys = [{ type: 1, content: '' }]
        break
    }
    return replys
  } catch (e) {
    console.log('群聊总结信息获取失败', e)
    return ''
  }
}
export { dispatchEventContent }
export { dispatchAiBot }
export { dispatchSummerBot }
export default {
  dispatchSummerBot,
  dispatchEventContent,
  dispatchAiBot,
}
