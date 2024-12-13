import {allConfig} from '../db/configDb.js'
import { uploadOssFile } from "../lib/oss.js";
import dayjs from "dayjs";
import {getPuppetInfo} from "../db/puppetDb.js";
import path from "path";
import axios from "axios";

async function onRecordMessage(msg) {
    try {
        const puppetInfo = await getPuppetInfo()
        const config = await allConfig()
        const conversationRecord = config?.conversationRecord || {}
        const { role } = config && config.userInfo || { role: 'default' }
        if(role!=='vip' || !conversationRecord?.open) return

        const contact = msg.talker() // 发消息人
        const contactName = contact.name() // 发消息人昵称
        const contactAlias = await contact.alias();
        const room = msg.room() // 是否为群消息
        const roomName = room ? await room.topic() : '';
        const msgSelf = msg.self() // 是否自己发给自己的消息
        const type = msg.type()
        const timestamp = msg.timestamp || dayjs().unix();
        const robotInfo = this.currentUser
        const isOfficial = contact.type() === this.Contact.Type.Official
        if (msgSelf || isOfficial) return
        console.log('msg', msg)
        const baseMsg = {
            conversionId: room ? room.id : contact.id,
            conversionName: room ? roomName : contactName,
            isRoom: !!room,
            chatName: contactName,
            chatId: contact.id,
            chatAlias: contactAlias,
            time: timestamp.length > 10 ? parseInt(timestamp / 1000) : timestamp
        }
        switch (type) {
            case this.Message.Type.Channel:
                baseMsg.type = '视频号'
                const channelInfo = await msg.toChannel();
                baseMsg.mediaInfo = {
                    nickname: channelInfo.nickname(),
                    coverUrl: channelInfo.coverUrl(),
                    avatar: channelInfo.avatar(),
                    desc: channelInfo.desc(),
                    url: channelInfo.url(),
                    objectId: channelInfo.objectId(),
                    objectNonceId: channelInfo.objectNonceId()
                }
                break;
            case this.Message.Type.Contact:
                baseMsg.type = '名片'
                const contactInfo = await msg.toContact();
                baseMsg.mediaInfo = {
                    name: contactInfo.name(),
                    avatar: contactInfo.payload.avatar || '',
                    wxid: contactInfo.id,
                }
                break;
            case this.Message.Type.RedEnvelope:
                baseMsg.type = '红包'
                baseMsg.content = "收到红包"
                break;
            case this.Message.Type.Emoticon:
                baseMsg.type = '自定义表情'
                const emoticonFileBox = await msg.toFileBox();
                const emoticonBuffer = await emoticonFileBox.toBuffer()
                const emoticonUrl = await uploadOssFile(`${conversationRecord?.ossConfig?.custom_path || ''}${emoticonFileBox.name}`, emoticonBuffer)
                baseMsg.url = emoticonUrl
                break;
            case this.Message.Type.Text:
                baseMsg.type = '文字'
                baseMsg.content = msg.text().trim()
                break;
            case this.Message.Type.Url:
                const urlLink = await msg.toUrlLink()
                baseMsg.type = 'h5链接'
                baseMsg.mediaInfo = {
                    url: urlLink.url(),
                    description: urlLink.description(),
                    imageUrl: urlLink.thumbnailUrl(),
                    title: urlLink.title(),
                }
                break;
            case this.Message.Type.MiniProgram:
                const miniProgram = await msg.toMiniProgram()
                const appid = puppetInfo.puppetType === 'PuppetService' ? miniProgram.username(): miniProgram.appid().replaceAll('@app', '')
                const username = puppetInfo.puppetType === 'PuppetService' ? miniProgram.appid().replaceAll('@app', ''): miniProgram.username()
                baseMsg.type = '小程序'
                baseMsg.mediaInfo = {
                    url: decodeURIComponent(miniProgram.pagePath()),
                    appid,
                    username,
                    description: miniProgram.description(),
                    imageUrl: miniProgram.thumbnailUrl(),
                    title: miniProgram.title(),
                }
                break;
            case this.Message.Type.Attachment:
            case this.Message.Type.Image:
            case this.Message.Type.Video:
                const attachFileBox = await msg.toFileBox();
                const fileExtname = path.extname(attachFileBox.name);
                const isImage = fileExtname.includes('.png') || fileExtname.includes('.jpg') || fileExtname.includes('.jpeg') || fileExtname.includes('.gif')
                baseMsg.type = isImage ? '图片' : '文件'
                const buffer = await attachFileBox.toBuffer()
                const url = await uploadOssFile(`${conversationRecord?.ossConfig?.custom_path || ''}${attachFileBox.name}`, buffer)
                baseMsg.url = url
                break
            case this.Message.Type.Audio:
                baseMsg.type = '语音'
                const audioFileBox = await msg.toFileBox()
                const audioBuffer = await audioFileBox.toBuffer()
                const audioUrl = await uploadOssFile(`${conversationRecord?.ossConfig?.custom_path || ''}${audioFileBox.name}`, audioBuffer)
                baseMsg.url = audioUrl
                break
            default:
                break
        }
        console.log('baseMsg', baseMsg)
        sendMessage(baseMsg, conversationRecord, robotInfo)
    } catch (e) {
        console.log('记录消息失败', e)
    }
}

function sendMessage(msgInfo, recordConfig, robotInfo) {
    const blackKey = ['conversationId', 'conversionName', 'isRoom', 'isRobot', 'chatName', 'chatId', 'chatAlias', 'time', 'type', 'url', 'mediaInfo', 'content']
    const baseData = {
        ...msgInfo
    }
    recordConfig.moreData &&
    recordConfig.moreData.length &&
    recordConfig.moreData.forEach((mItem) => {
        if (!blackKey.includes(mItem.key) && mItem.key && mItem.value) {
            baseData[mItem.key] = mItem.value
        }
    })
    const timeout = recordConfig.timeout || 180
    const header = {
        'Content-Type': 'application/json'
    }
    recordConfig.header &&
    recordConfig.header.length &&
    recordConfig.header.forEach((mItem) => {
        if(mItem.key && mItem.value) {
            header[mItem.key] = mItem.value
        }
    })
    const config = {
        url: recordConfig.customUrl,
        method: 'POST',
        timeout: timeout * 1000,
        headers: header,
        data: {
            robotInfo: {
                wxid: robotInfo.id,
                name: robotInfo.name(),
            },
            message: baseData
        }
    }
    if(recordConfig?.debug) {
        console.log('消息回调请求参数', config)
    }
    axios.request(config).then((res) => {
        console.log('消息发送成功', res)
    }).catch((err) => {
        console.log('消息发送失败', err)
    })
}
export default onRecordMessage
