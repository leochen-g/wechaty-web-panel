import { updateRoomOnly } from '../common/index.js'
import { delay } from '../lib/index.js'
async function onRoomtopic(room, newTopic, oldTopic, changer, date) {
  try {
    console.log(`【${oldTopic}】群名更新为：${newTopic}`)
    await delay(3000)
    console.log('正在更新群组')
    await updateRoomOnly(this)
  } catch (e) {
    console.log('群名更新报错', e)
  }
}
export default onRoomtopic
