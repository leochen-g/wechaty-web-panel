import { sendHeartBeat } from "../proxy/aibotk.js";
import { throttle } from '../lib/index.js'

async function onHeartBeat(str) {
  try {
    if (!str) {
      await sendHeartBeat('dead')
    } else if (str.type === 'scan') {
      await sendHeartBeat('scan')
    } else if(str.includes('heartbeat')) {
      throttle(sendHeartBeat('live'), 30000)
    }
  } catch (e) {
    console.log('心跳更新失败', e)
  }

}
export default onHeartBeat
