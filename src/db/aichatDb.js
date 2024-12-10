import nedb from "./nedb.js";
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
    const dbpath = baseDir + "aichat.db";
    console.log('聊天记录路径：如果开启了记录会存到此处，未开启不会记录，所有记录都是存在本地', dbpath)

    if (fs.existsSync(dbpath)) {
      // fs.unlinkSync(dbpath);
    }
    rdb = nedb(dbpath)
  }
}

/**
 * 记录群聊天记录 记录格式
 * { contactName: '', contactId: '', roomName: '', roomId: '', input: '输入的问题', output: '输出内容', time: '时间' }
 * @param info
 * @returns {Promise<unknown>}
 */
export async function addAichatRecord(info) {
  try {
    initDb()
    let doc = await rdb.insert(info);
    return doc;
  } catch (error) {
    console.log("插入数据错误", error);
  }
}

/**
 * 获取指定群的聊天记录
 * @param room
 * @returns {Promise<*>}
 */
export async function getAichatRecord(query) {
  try {
    let search = await rdb.find(query);
    return search;
  } catch (error) {
    console.log("查询数据错误", error);
  }
}

/**
 * 清楚指定群的聊天记录
 * @param roomName
 * @returns {Promise<void>}
 */
export async function removeRecord(query) {
  try {
    let search = await rdb.remove(query, { multi: true });
    return search;
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
export async function getAichatQuestion(query, day) {
  try {
    let list = await getAichatRecord(query);
    list = list.filter(item => {
      return item.time >= new Date().getTime() - day * 24 * 60 * 60 * 1000;
    });
    let question = "";
    list.forEach((item) => {
      question = question + "|" + item.input;
    });
    return question;
  } catch (e) {
    console.log("error", e);
  }
}
