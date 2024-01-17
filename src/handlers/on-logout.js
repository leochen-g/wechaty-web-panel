import { setQrCode } from '../proxy/aibotk.js'
import { closeMqtt } from '../proxy/mqtt.js'
/**
 * 登出事件
 */
async function onLogout(user) {
  try {
    await setQrCode('qrcode', '6')
    console.log(`用户${user}已登出`)
    closeMqtt()
  } catch (e){
    console.log('登出报错', e)
  }

}
export default onLogout
