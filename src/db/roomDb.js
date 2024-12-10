import nedb from './nedb.js'
import path from "path";
import os from "os";
import globalConfig from "./global.js";
import fs from "fs";

let rdb = null;


function initDb() {
  if(!rdb) {
    const baseDir = path.join(
      os.homedir(),
      path.sep,
      ".wechaty",
      "wechaty-panel-cache",
      globalConfig.getApikey(),
      path.sep
    );
    const dbpath = baseDir + "room.db";

    if (fs.existsSync(dbpath)) {
      // fs.unlinkSync(dbpath);
    }
    rdb = nedb(dbpath)
  }
}
/**
 * 记录群聊天记录 记录格式
 * { roomName: '群名', roomId: '', content: '内容', contact: '用户名', wxid: '', time: '时间' }
 * @param info
 * @returns {Promise<unknown>}
 */
export async function addRoomRecord(info) {
  try {
    initDb()
    let doc = await rdb.insert(info)
    return doc
  } catch (error) {
    console.log('插入数据错误', error)
  }
}

/**
 * 获取指定群的聊天记录
 * @param room
 * @returns {Promise<*>}
 */
export async function getRoomRecord(roomName) {
  try {
    let search = await rdb.find({roomName})
    return search
  } catch (error) {
    console.log('查询数据错误', error)
  }
}

/**
 * 清楚指定群的聊天记录
 * @param roomName
 * @returns {Promise<void>}
 */
export async function removeRecord(roomName) {
  try {
    let search = await rdb.remove({roomName}, {multi: true})
    return search
  } catch (e) {
    console.log("error", e);
  }
}

/**
 * 获取指定群聊的所有聊天内容
 * @param rooName
 * @param day 取的天数
 * @returns {Promise<*>}
 */
export async function getRoomRecordContent(rooName, day) {
  try {
    let list = await getRoomRecord(rooName)
    list = list.filter(item=> {
      return item.time >= new Date().getTime() - day * 24 * 60 * 60 * 1000
    })
    let word = ''
    list.forEach((item)=> {
      word = word + item.content
    })
    return word
  } catch (e) {
    console.log("error", e);
  }
}
