import { MD5 } from '../lib/index.js'
import { getConfig, sendRobotInfo, sendError, putqn, setQrCode, updatePanelVersion } from '../proxy/aibotk.js'
import { addUser } from '../db/userDb.js'
import { initMqtt } from '../proxy/mqtt.js'
import { allConfig } from '../db/configDb.js'
/**
 * 登录成功监听事件
 * @param {*} user 登录用户
 */
async function onLogin(user) {
  try {
    console.log(`贴心助理${user}登录了`)
    await updatePanelVersion()
    await setQrCode('', 4)
    await sendError('')
    await getConfig() // 获取配置文件
    const config = await allConfig()
    const { userId } = config && config.userInfo
    const payload = user.payload || user._payload
    const userInfo = {
      ...payload,
      robotId: payload.weixin || MD5(user.name()),
    }
    await addUser(userInfo) // 全局存储登录用户信息
    let file = ''
    let avatarUrl = ''
    if(payload.avatar) {
      file = await user.avatar()
      if(file) {
        const base = await file.toBase64()
        avatarUrl = base ? await putqn(base, userId):''
      } else {
        console.log('头像未获取到，不影响项目正常使用')
      }
    }
    await sendRobotInfo(avatarUrl, user.name(), userInfo.robotId) // 更新用户头像
    await initMqtt(this) // 初始化mqtt任务
  } catch (e) {
    console.log('登录后初始化失败', e)
  }
}
export default onLogin
