import common from '../common/index.js'
import { delay } from '../lib/index.js'
import {  sendHeartBeat } from '../proxy/aibotk.js'
import { getUser } from '../db/userDb.js'
/**
 * 准备好的事件
 */
async function onReady() {
  try {
    await getUser()
    console.log(`所有数据准备完毕`)
    await sendHeartBeat('live')
    await common.updateContactInfo(this)
    await delay(5000)
    await common.updateRoomInfo(this)
  } catch (e) {
    console.log('on ready error:', e)
  }
}
export default onReady
