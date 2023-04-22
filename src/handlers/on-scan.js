import Qrterminal from 'qrcode-terminal'
import { throttle } from '../lib/index.js'
import { setQrCode } from '../proxy/aibotk.js'
import { getAibotConfig } from "../db/aiDb.js";
import { updatePuppetConfig } from "../db/puppetDb.js";
// 限制推送二维码的次数，防止掉线后，无限推送二维码到服务器
let scanTime = 0
/**
 * 扫描登录，显示二维码
 */
async function onScan(qrcode, status) {
  await updatePuppetConfig({ puppetType: this.puppet.constructor.name })
  const aibotConfig = await getAibotConfig();
  Qrterminal.generate(qrcode)
  console.log('扫描状态', status)
  if(scanTime >= aibotConfig.scanTimes) {
    console.log('长时间推送登录状态，平台二维码不再更新，请重启服务，或直接在终端扫码登录');
  } else {
    scanTime++
    throttle(setQrCode(qrcode, status), 30000)
  }

  const qrImgUrl = ['https://api.qrserver.com/v1/create-qr-code/?data=', encodeURIComponent(qrcode)].join('')
  console.log(qrImgUrl)
}
export default onScan
