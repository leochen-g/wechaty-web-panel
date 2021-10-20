const common = require('../common/index')
const { delay } = require('../lib/index')
const { setQrCode, sendHeartBeat, asyncData } = require('../proxy/aibotk')
const { getUser } = require('../common/userDb')

/**
 * 准备好的事件
 */
async function onReady() {
  try {
    const userInfo = await getUser()
    console.log(`所有数据准备完毕`)
    await sendHeartBeat('live')
    await common.updateContactInfo(this)
    await delay(5000)
    await common.updateRoomInfo(this)
  } catch (e) {
    console.log('on ready error:', e)
  }
}

module.exports = onReady
