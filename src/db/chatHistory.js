import nedb from './nedb.js'
import path from "path";
import os from "os";
import globalConfig from "./global.js";
import fs from "fs";
import dayjs from "dayjs";
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
    const dbpath = baseDir + "chatHistory.db";
    // if (fs.existsSync(dbpath)) {
    //   fs.unlinkSync(dbpath);
    // }
    rdb = nedb(dbpath)
  }
}
function delDb() {
  if(rdb) {
    const baseDir = path.join(
        os.homedir(),
        path.sep,
        ".wechaty",
        "wechaty-panel-cache",
        globalConfig.getApikey(),
        path.sep
    );
    const dbpath = baseDir + "chatHistory.db";
    if (fs.existsSync(dbpath)) {
      fs.unlinkSync(dbpath);
    }
    rdb = null
  }
}
/**
 * 记录聊天记录 记录格式
 * { conversionId: '', conversionName: '', isRoom: false, isRobot: false,  content: '内容', chatName: '用户名', chatId: '', time: '时间' }
 * @param info
 * @returns {Promise<unknown>}
 */
export async function addHistory(info) {
  try {
    initDb()
    let doc = rdb && await rdb.insert(info)
    return doc
  } catch (error) {
    console.log('插入数据错误', error)
  }
}

/**
 * 获取指定群的聊天记录
 * @param conversionId
 * @returns {Promise<*>}
 */
export async function getHistoryByConversionId(conversionId) {
  try {
    let search = rdb && await rdb.find({conversionId}) || []
    return search
  } catch (error) {
    console.log('查询数据错误', error)
  }
}
export async function getHistoryByConversionName(conversionName) {
  try {
    let search = rdb  ? await rdb.find({conversionName}) : []
    return search
  } catch (error) {
    console.log('查询数据错误', error)
  }
}

/**
 * 清楚指定群的聊天记录
 * @param conversionId
 * @returns {Promise<void>}
 */
export async function removeHistory(conversionId) {
  try {
    let search = await rdb.remove({conversionId}, {multi: true})
    return search
  } catch (e) {
    console.log("error", e);
  }
}

export function clearHistory() {
  try {
    delDb()
  } catch (e) {
    console.log("error", e);
  }
}

/**
 * 按照时间获取指定群聊的所有聊天内容
 * @param rooName
 * @param day 取的天数
 * @returns {Promise<*>}
 */
export async function getHistoryByTime({id, name}, day) {
  try {
    let list = []
    list = await getHistoryByConversionId(id)
    if(!list.length) {
      list = await getHistoryByConversionName(name)
    }
    list = list.filter(item=> {
      if(day === 0) {
        return item.time >= dayjs().startOf('day').unix()
      } else {
        return item.time >= dayjs().unix() - day * 60 * 60
      }
    })
    list.sort((a, b)=> (a.time - b.time))

    return list;
  } catch (e) {
    console.log("error", e);
  }
}
/**
 * 按照数量获取指定群聊的所有聊天内容
 * @param rooName
 * @param day 取的天数
 * @returns {Promise<*>}
 */
export async function getHistoryByNum({id, name}, num) {
  try {
    let list = []
    list = await getHistoryByConversionId(id)
    if(!list.length) {
      list = await getHistoryByConversionName(name)
    }
    list.sort((a, b)=> (b.time - a.time))

    return list.splice(0, num)
  } catch (e) {
    console.log("error", e);
  }
}
