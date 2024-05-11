import nedb from './nedb.js'
import path from 'path'
import os from 'os'
import globalConfig from './global.js'


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
    const dbpath = baseDir + "rssHistory.db";
    console.log('rss历史推送路径', dbpath)

    // if (fs.existsSync(dbpath)) {
    //   fs.unlinkSync(dbpath);
    // }
    rdb = nedb(dbpath)
  }
}

/**
 * 记录rss 最后一条历史记录
 * { id: '', lastContent: '', lastTime: '' }
 * @param info
 * @returns {Promise<unknown>}
 */
export async function addRssHistory(info) {
  try {
    initDb()
    const hasExit = await rdb.find({_id: info.id})
    if(hasExit) {
      return await rdb.update({ _id: info.id }, info, { upsert: true });
    } else {
      return await rdb.insert(info);
    }
  } catch (error) {
    console.log("插入数据错误", error);
  }
}

/**
 * 获取指定群的聊天记录
 * @param room
 * @returns {Promise<*>}
 */
export async function getRssHistory(query) {
  try {
    initDb()
    let search = await rdb.find(query);
    return search;
  } catch (error) {
    console.log("查询数据错误", error);
  }
}


export async function getRssHistoryById(id) {
  try {
    initDb()
    let search = await rdb.find({ id });
    return search[0];
  } catch (error) {
    console.log("查询数据错误", error);
  }
}

export async function updateRssHistory(id, info) {
  try {
    initDb()
    let search = await rdb.update({id}, { ...info });
    return search;
  } catch (error) {
    console.log("更新数据错误", error);
  }
}

/**
 * 清楚指定群的聊天记录
 * @param roomName
 * @returns {Promise<void>}
 */
export async function removeRssRecord(query) {
  try {
    initDb()
    let search = await rdb.remove(query, { multi: true });
    return search;
  } catch (e) {
    console.log("error", e);
  }
}
