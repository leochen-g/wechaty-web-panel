import { sendHeartBeat } from '../proxy/aibotk.js'
async function onHeartBeat(str) {
  if (!str) {
    await sendHeartBeat('dead')
  }
  if (str.type === 'scan') {
    await sendHeartBeat('scan')
  }
}
export default onHeartBeat
