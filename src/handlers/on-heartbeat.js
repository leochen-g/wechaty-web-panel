const { sendHeartBeat } = require('../proxy/aibotk')

async function onHeartBeat(str) {
  if (!str) {
    await sendHeartBeat('dead')
  }
  if (str.type === 'scan') {
    await sendHeartBeat('scan')
  }
}

module.exports = onHeartBeat
