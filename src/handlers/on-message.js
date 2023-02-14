import { contactSay, roomSay } from "../common/index.js";
import { getContactTextReply, getRoomTextReply } from "../common/reply.js";
import { delay } from "../lib/index.js";
import { dispatchAsync } from "../service/room-async-service.js";
import { allConfig } from "../db/configDb.js";
import { getAibotConfig } from "../db/aiDb.js";
import { addRoomRecord } from "../db/roomDb.js";
import { privateForward } from "../common/hook.js";

const ignoreRecord = [
  { type: "include", word: "加入了群聊" },
  { type: "include", word: "与群里其他人都不是朋友关系" },
  { type: "include", word: "收到一条暂不支持的消息类型" }
];

/**
 * 检测是否属于忽略的消息
 * @param msg 用户信息
 * @param list 需要忽略的列表
 */
function checkIgnore(msg, list) {
  if (!list.length) return false;
  for (let item of list) {
    const word = item.word;
    const type = item.type;
    if ((type === "start" && msg.startsWith(word)) || (type === "end" && msg.endsWith(word)) || (type === "equal" && msg === word) || (type === "include" && msg.includes(word))) {
      return true;
    }
  }
  return false;
}

/**
 * 根据消息类型过滤私聊消息事件
 * @param {*} that bot实例
 * @param {*} msg 消息主体
 */
async function dispatchFriendFilterByMsgType(that, msg) {
  try {
    const aibotConfig = await getAibotConfig();
    const config = await allConfig();
    const type = msg.type();
    const contact = msg.talker(); // 发消息人
    const name = await contact.name()
    const isOfficial = contact.type() === that.Contact.Type.Official;
    let content = "";
    let replys = [];
    const res = await privateForward({ that, msg, name, config })
    if(res) {
        return
    }
    switch (type) {
      case that.Message.Type.Text:
        content = msg.text();
        if (!isOfficial) {
          console.log(`发消息人${name}:${content}`);
          const isIgnore = checkIgnore(content.trim(), aibotConfig.ignoreMessages);
          if (content.trim() && !isIgnore) {
            replys = await getContactTextReply(that, contact, content.trim());
            for (let reply of replys) {
              await delay(1000);
              await contactSay.call(that, contact, reply);
            }
          }
        } else {
          console.log("公众号消息");
        }
        break;
      case that.Message.Type.Emoticon:
        console.log(`发消息人${await contact.name()}:发了一个表情`);
        break;
      case that.Message.Type.Image:
        console.log(`发消息人${await contact.name()}:发了一张图片`);
        break;
      case that.Message.Type.Video:
        console.log(`发消息人${await contact.name()}:发了一个视频`);
        break;
      case that.Message.Type.Audio:
        console.log(`发消息人${await contact.name()}:发了一个视频`);
        break;
      case that.Message.Type.MiniProgram:
        console.log(`发消息人${await contact.name()}:发了一个小程序`);
        const miniProgram = await msg.toMiniProgram();
        if(config.parseMini && miniProgram.payload) {
          const miniParse = `【小程序解析】\n\nappid：${miniProgram.appid()}\nusername：${miniProgram.username()}\n标题：${miniProgram.title()}\n描述：${miniProgram.description()}\n路径：${miniProgram.pagePath()}`
          contact.say(miniParse)
        }
        console.log('mini', miniProgram);
        break;
      case that.Message.Type.Url:
        console.log(`发消息人${await contact.name()}:发了一个h5链接`);
        const urlLink = await msg.toUrlLink();
        if(config.parseMini && urlLink.payload) {
          const urlParse = `【链接解析】\n\n标题：${urlLink.title()}\n描述：${urlLink.description()}\n链接：${urlLink.url()}\n缩略图：${urlLink.thumbnailUrl()}`
          contact.say(urlParse)
        }
        console.log('urlLink', urlLink);
        break;
      case that.Message.Type.Transfer:
        console.log(`发消息人${await contact.name()}: 发起一个转账，请在手机接收`);
        console.log('内容', msg.payload);
        break;
      default:
        break;
    }
  } catch (error) {
    console.log("监听消息错误", error);
  }
}

/**
 * 根据消息类型过滤群消息事件
 * @param {*} that bot实例
 * @param {*} room room对象
 * @param {*} msg 消息主体
 */
async function dispatchRoomFilterByMsgType(that, room, msg) {
  const aibotConfig = await getAibotConfig();
  const config = await allConfig();
  const { role } = config.userInfo;
  try {
    const contact = msg.talker(); // 发消息人
    const contactName = contact.name();
    const roomName = await room.topic();
    const type = msg.type();
    const receiver = msg.to();
    let content = "";
    let replys = "";
    let contactId = contact.id;
    let contactAvatar = await contact.avatar();
    const userSelfName = that.currentUser?.name() || that.userSelf()?.name()
    switch (type) {
      case that.Message.Type.Text:
        content = msg.text();
        const mentionSelf = await msg.mentionSelf() || content.includes(`@${userSelfName}`);
        const receiverName = receiver?.name();
        content = content.replace('@' + receiverName, "").replace('@' + userSelfName, "").replace(/@[^,，：:\s@]+/g, "").trim();
        console.log(`群名: ${roomName} 发消息人: ${contactName} 内容: ${content} | 机器人被@：${mentionSelf?'是':'否'}`);
        // 检测是否需要这条消息
        const isIgnore = checkIgnore(content, aibotConfig.ignoreMessages);
        if (isIgnore) return;
        replys = await getRoomTextReply({
          that,
          content,
          name: contactName,
          id: contactId,
          avatar: contactAvatar,
          room,
          isMention: mentionSelf
        });
        for (let reply of replys) {
          await delay(1000);
          await roomSay.call(that, room, contact, reply);
        }

        const cloudRoom = config.cloudRoom;
        if (role === "vip" && cloudRoom.includes(roomName) && !checkIgnore(content, ignoreRecord)) {
          const regex = /(<([^>]+)>)/ig;
          content = content.replace(regex, "");
          addRoomRecord({
            roomName,
            roomId: room.id,
            content,
            contact: contactName,
            wxid: contactId,
            time: new Date().getTime()
          });
        }
        break;
      case that.Message.Type.Emoticon:
        content = msg.text();
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个表情 ${content}`);
        break;
      case that.Message.Type.Image:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一张图片`);
        break;
      case that.Message.Type.Video:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个视频`);
        break;
      case that.Message.Type.Audio:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个语音`);
        break;
      case that.Message.Type.MiniProgram:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个小程序`);
        const miniProgram = await msg.toMiniProgram();
        if(config.parseMiniRooms.includes(roomName) && miniProgram.payload) {
          const miniParse = `【小程序解析】\n\nappid:${miniProgram.appid()}\nusername：${miniProgram.username()}\n标题：${miniProgram.title()}\n描述：${miniProgram.description()}\n路径：${miniProgram.pagePath()}\n`
          room.say(miniParse)
        }
        console.log('mini', miniProgram);
        break;
      case that.Message.Type.Url:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发了一个h5链接`);
        const urlLink = await msg.toUrlLink();
        if(config.parseMiniRooms.includes(roomName) && urlLink.payload) {
          const urlParse = `【链接解析】\n\n标题：${urlLink.title()}\n描述：${urlLink.description()}\n链接：${urlLink.url()}\n缩略图：${urlLink.thumbnailUrl()}`
          room.say(urlParse)
        }
        console.log('urlLink', urlLink);
        break;
      case that.Message.Type.Transfer:
        console.log(`群名: ${roomName} 发消息人: ${contactName} 发起了转账，请在手机查看`);
        console.log('内容', msg.payload);
        break;
      default:
        break;
    }
  } catch (e) {
    console.log("error", e);
  }
}

async function onMessage(msg) {
  try {
    const config = await allConfig();
    const { role } = config && config.userInfo || {role: 'default'};
    const room = msg.room(); // 是否为群消息
    const msgSelf = msg.self(); // 是否自己发给自己的消息
    if (msgSelf) return;
    if (room) {
      const roomName = await room.topic();
      const contact = msg.talker(); // 发消息人
      const contactName = contact.name();
      await dispatchRoomFilterByMsgType(this, room, msg);
      if (role === "vip" && roomName !== contactName) {
        const roomAsyncList = config.roomAsyncList || [];
        if (roomAsyncList.length) {
          await dispatchAsync(this, msg, roomAsyncList);
        }
      }
    } else {
      await dispatchFriendFilterByMsgType(this, msg);
    }
  } catch (e) {
    console.log("监听消息失败", e);
  }
}

export default onMessage;
