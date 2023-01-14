import common from '../common/index.js'
import { delay } from '../lib/index.js'
import { getConfig, sendHeartBeat } from "../proxy/aibotk.js";
import { getUser } from '../db/userDb.js'
import { initAllSchedule } from "../task/index.js";
/**
 * 准备好的事件
 */
async function onReady() {
  try {
    await getConfig() // 获取配置文件
    initAllSchedule(this) // 初始化任务
    await getUser()
    console.log(`所有数据准备完毕`)
    sendHeartBeat('live')
    await delay(5000)
    common.updateContactInfo(this)
    await delay(5000)
    common.updateRoomInfo(this)
  } catch (e) {
    console.log('on ready error:', e)
  }
}
export default onReady
