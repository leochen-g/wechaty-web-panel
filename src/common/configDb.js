const cdb = require('../lib/nedb.js')()

/**
 * 添加配置文件
 * @param {*} config
 */
async function addConfig(info) {
  try {
    let doc = await cdb.insert(info)
    return doc
  } catch (error) {
    console.log('插入数据错误', error)
  }
}

/**
 * 更新配置文件
 * @param {*} config
 */
async function updateConfig(config) {
  try {
    let res = await allConfig()
    if (res) {
      let up = await cdb.update({ id: config.id }, config)
      return up
    } else {
      let add = await addConfig(config)
      return add
    }
  } catch (error) {
    console.log('配置文件更新失败', error)
  }
}
/**
 * 获取所有配置
 */
async function allConfig() {
  try {
    let search = await cdb.find()
    console.log(search)

    return search[0]
  } catch (error) {
    console.log('查询数据错误', error)
  }
}
/**
 * 每日任务
 */
async function dayTaskSchedule() {
  try {
    let res = await cdb.find({})
    return res[0].dayTaskSchedule
  } catch (error) {
    console.log('获取每日任务', error)
  }
}
/**
 * 群资讯
 */
async function roomNewsSchedule() {
  try {
    let res = await cdb.find.find({})
    return res[0].roomNewsSchedule
  } catch (error) {
    console.log('获取每日任务', error)
  }
}
/**
 * 群任务
 */
async function roomTaskSchedule() {
  try {
    let res = await cdb.find.find({})
    return res[0].roomTaskSchedule
  } catch (error) {
    console.log('获取每日任务', error)
  }
}

module.exports = {
  addConfig,
  updateConfig,
  allConfig,
  dayTaskSchedule,
  roomNewsSchedule,
  roomTaskSchedule,
}
