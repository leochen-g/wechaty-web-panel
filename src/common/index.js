const {getNews, getOne, getTXweather, getSweetWord} = require('../proxy/api')
const {sendFriend, sendRoom, asyncData} = require('../proxy/aibotk')
const {getUser} = require('../common/userDb')
const {formatDate, getDay, MD5, groupArray, delay} = require('../lib')
const {FileBox, UrlLink, MiniProgram} = require('wechaty')

/**
 * 获取每日新闻内容
 * @param {*} sortId 新闻资讯分类Id
 * @param {*} endWord 结尾备注
 */
async function getEveryDayRoomContent(sortId, endWord = '微信小助手') {
    let today = formatDate(new Date()) //获取今天的日期
    let news = await getNews(sortId)
    let content = `${today}<br>${news}<br>————————${endWord}`
    return content
}

/**
 * 获取每日说内容
 * @param {*} date 与朋友的纪念日
 * @param {*} city 朋友所在城市
 * @param {*} endWord 结尾备注
 */
async function getEveryDayContent(date, city, endWord) {
    let one = await getOne() //获取每日一句
    let weather = await getTXweather(city) //获取天气信息
    let today = formatDate(new Date()) //获取今天的日期
    let memorialDay = getDay(date) //获取纪念日天数
    let sweetWord = await getSweetWord() // 土味情话
    let str = `${today}<br>我们在一起的第${memorialDay}天<br><br>元气满满的一天开始啦,要开心噢^_^<br><br>今日天气<br>${weather.weatherTips}<br>${weather.todayWeather}<br>每日一句:<br>${one}<br><br>情话对你说:<br>${sweetWord}<br><br>————————${endWord}`
    return str
}

/**
 * 更新用户信息
 */
async function updateContactInfo(that) {
    try {
        const contactSelf = await getUser()
        const hasWeixin = !!contactSelf.weixin
        const contactList = await that.Contact.findAll()
        let res = []
        const notids = ['filehelper', 'fmessage']
        let realContact = hasWeixin ? contactList.filter((item) => item.payload.type == 1 && item.payload.friend && !notids.includes(item.payload.id)) : contactList
        for (let i of realContact) {
            let contact = i.payload
            let obj = {
                robotId: hasWeixin ? contactSelf.weixin : MD5(contactSelf.name),
                contactId: hasWeixin ? contact.id : MD5(contactSelf.name + contact.name + contact.alias + contact.province + contact.city + contact.gender),
                name: contact.name,
                alias: contact.alias,
                gender: contact.gender,
                province: contact.province,
                city: contact.city,
                avatar: hasWeixin ? contact.avatar : '',
                friend: contact.friend,
                signature: contact.signature,
                star: contact.star,
                type: hasWeixin ? contact.type : '',
                weixin: hasWeixin ? contact.weixin : '',
            }
            res.push(obj)
        }
        await updateFriendInfo(res, 20)
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
    arr.forEach(async (item) => {
        await sendFriend(item)
        await delay(10000)
    })
}

/**
 * 更新群列表
 */
async function updateRoomInfo(that) {
    try {
        const contactSelf = await getUser()
        const hasWeixin = !!contactSelf.weixin
        const roomList = await that.Room.findAll()
        let res = []
        for (let i of roomList) {
            let room = i.payload
            let obj = {
                robotId: hasWeixin ? contactSelf.weixin : MD5(contactSelf.name),
                roomId: MD5(room.topic),
                topic: room.topic,
                avatar: room.avatar || '',
                ownerId: room.ownerId || '',
                adminIds: room.adminIdList.toString(),
                memberCount: room.memberIdList.length,
            }
            res.push(obj)
        }
        await updateRoomsInfo(res, 20)
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
    arr.forEach(async (item) => {
        await sendRoom(item)
        await delay(10000)
    })
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
        await room.say(`${roomName}：欢迎新朋友 @${contactName}，<br>${msg.content}`)
    } else if (msg.type === 2 && msg.url !== '') {
        // url文件
        let obj = FileBox.fromUrl(msg.url)
        console.log('回复内容', obj)
        await room.say(obj)
    }
}

/**
 * 群关键词回复
 * @param {*} contact
 * @param {*} msg
 * @param {*} isRoom
 */
async function roomSay(room, contact, msg) {
    try {
        if (msg.type === 1 && msg.content) {
            // 文字
            console.log('回复内容', msg.content)
            contact ? await room.say(msg.content, contact) : await room.say(msg.content)
        } else if (msg.type === 2 && msg.url) {
            // url文件
            let obj = FileBox.fromUrl(msg.url)
            console.log('回复内容', obj)
            contact ? await room.say('', contact) : ''
            await delay(500)
            await room.say(obj)
        } else if (msg.type === 3 && msg.url) {
            // bse64文件
            let obj = FileBox.fromDataURL(msg.url, 'room-avatar.jpg')
            contact ? await room.say('', contact) : ''
            await delay(500)
            await room.say(obj)
        } else if (msg.type === 4 && msg.url && msg.title && msg.description) {
            console.log('in url')
            let url = new UrlLink({
                description: msg.description,
                thumbnailUrl: msg.thumbUrl,
                title: msg.title,
                url: msg.url,
            })
            console.log(url)
            await room.say(url)
        } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl && msg.thumbKey) {
            let miniProgram = new MiniProgram({
                appid: msg.appid,
                title: msg.title,
                pagePath: msg.pagePath,
                description: msg.description,
                thumbUrl: msg.thumbUrl,
                thumbKey: msg.thumbKey,
            });
            await room.say(miniProgram)
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
 *  type 1 文字 2 图片url 3 图片base64 4 url链接 5 小程序  6 名片
 */
async function contactSay(contact, msg, isRoom = false) {
    try {

        if (msg.type === 1 && msg.content) {
            // 文字
            console.log('回复内容', msg.content)
            await contact.say(msg.content)
        } else if (msg.type === 2 && msg.url) {
            // url文件
            let obj = FileBox.fromUrl(msg.url)
            console.log('回复内容', obj)
            if (isRoom) {
                await contact.say(`@${contact.name()}`)
                await delay(500)
            }
            await contact.say(obj)
        } else if (msg.type === 3 && msg.url) {
            // bse64文件
            let obj = FileBox.fromDataURL(msg.url, 'user-avatar.jpg')
            await contact.say(obj)
        } else if (msg.type === 4 && msg.url && msg.title && msg.description && msg.thumbUrl) {
            let url = new UrlLink({
                description: msg.description,
                thumbnailUrl: msg.thumbUrl,
                title: msg.title,
                url: msg.url,
            })
            await contact.say(url)
        } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl && msg.thumbKey) {
            let miniProgram = new MiniProgram({
                appid: msg.appid,
                title: msg.title,
                pagePath: msg.pagePath,
                description: msg.description,
                thumbUrl: msg.thumbUrl,
                thumbKey: msg.thumbKey,
            });
            await contact.say(miniProgram)
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
    let room = await that.Room.find({topic: roomName})
    if (room) {
        try {
            for (const item of replys) {
                await delay(2000)
                contactSay(contact, item)
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
 * 重新同步好友和群组
 * @param that
 * @returns {Promise<void>}
 */
async function updateContactAndRoom(that) {
    const contactSelf = await getUser()
    await asyncData(1, contactSelf.robotId)
    delay(3000)
    await asyncData(2, contactSelf.robotId)
    delay(3000)
    await updateRoomInfo(that)
    delay(3000)
    await updateContactInfo(that)
}

/**
 * 重新同步好友
 * @param that
 * @returns {Promise<void>}
 */
async function updateContactOnly(that) {
    const contactSelf = await getUser()
    await asyncData(1, contactSelf.robotId)
    delay(3000)
    await updateContactInfo(that)
}

/**
 * 重新同步群
 * @param that
 * @returns {Promise<void>}
 */
async function updateRoomOnly(that) {
    const contactSelf = await getUser()
    await asyncData(2, contactSelf.robotId)
    delay(3000)
    await updateRoomInfo(that)
}

module.exports = {
    updateRoomOnly,
    updateContactOnly,
    getEveryDayContent,
    getEveryDayRoomContent,
    updateContactInfo,
    updateRoomInfo,
    addRoom,
    contactSay,
    roomSay,
    addRoomWelcomeSay,
    updateContactAndRoom,
}
