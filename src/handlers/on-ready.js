import common from '../common/index.js'
import { delay } from '../lib/index.js'
import { getConfig, sendHeartBeat } from "../proxy/aibotk.js";
import { getUser } from '../db/userDb.js'
import { initAllSchedule, initMultiTask } from "../task/index.js";
import { updatePuppetConfig } from "../db/puppetDb.js";
import { initRssTask } from "../task/rss.js";
import { allConfig } from "../db/configDb.js";
/**
 * 准备好的事件
 */
async function onReady() {
  try {
    await updatePuppetConfig({ puppetType: this.puppet.constructor.name })
    await getConfig() // 获取配置文件
    initAllSchedule(this) // 初始化任务
    initMultiTask(this) // 初始化批量定时任务
    const config = await allConfig()
    const { role } = config.userInfo
    if(role === 'vip') {
      initRssTask(this) // 初始化rss 任务
    }
    await getUser()
    console.log(`所有数据准备完毕`)
    sendHeartBeat('live')
    if(this.puppet.syncContact) {
      await this.puppet.syncContact()
    }
    await delay(3000)
    common.updateContactInfo(this)
    await delay(3000)
    common.updateRoomInfo(this)
  } catch (e) {
    console.log('on ready error:', e)
  }
}
export default onReady
