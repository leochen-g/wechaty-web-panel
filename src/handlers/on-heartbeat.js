import { sendHeartBeat } from "../proxy/aibotk.js";
import { throttle } from '../lib/index.js'

async function onHeartBeat(str) {
  if (!str) {
    await sendHeartBeat('dead')
  } else if (str.type === 'scan') {
    await sendHeartBeat('scan')
  } else if(str.includes('heartbeat')) {
    throttle(sendHeartBeat('live'), 30000)
  }
}
export default onHeartBeat
