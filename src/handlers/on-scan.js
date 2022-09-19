import Qrterminal from 'qrcode-terminal'
import { throttle } from '../lib/index.js'
import { setQrCode } from '../proxy/aibotk.js'
/**
 * 扫描登录，显示二维码
 */
async function onScan(qrcode, status) {
  Qrterminal.generate(qrcode)
  console.log('扫描状态', status)
  throttle(setQrCode(qrcode, status), 30000)
  const qrImgUrl = ['https://api.qrserver.com/v1/create-qr-code/?data=', encodeURIComponent(qrcode)].join('')
  console.log(qrImgUrl)
}
export default onScan
