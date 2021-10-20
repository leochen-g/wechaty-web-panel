const { updateRoomOnly } = require('../common/index')
const { delay } = require('../lib')

async function onRoomtopic(room, newTopic, oldTopic, changer, date) {
  console.log(`【${oldTopic}】群名更新为：${newTopic}`)
  await delay(3000)
  console.log('正在更新群组')
  await updateRoomOnly(this)
}

module.exports = onRoomtopic
