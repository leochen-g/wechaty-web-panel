import { getConfig, sendRobotInfo, putqn, setQrCode, updatePanelVersion, getPanelVersion, clearVerifyCode } from '../proxy/aibotk.js'
import { addUser } from '../db/userDb.js'
import { initMqtt } from '../proxy/mqtt.js'
import { allConfig } from '../db/configDb.js'
import { updatePuppetConfig } from "../db/puppetDb.js";
import { PUPPET_MAP } from '../const/puppet-type.js'
import { packageJson } from '../package-json.js'

/**
 * 登录成功监听事件
 * @param {*} user 登录用户
 */
async function onLogin(user) {
  try {
    const lastVersion = await getPanelVersion()
    console.log(`
      ==========================================================
       贴心AI助理${user}登录了
       你正在使用的是: ${PUPPET_MAP[this.puppet.constructor.name]}!
       最新插件版本: ${lastVersion}
       你的插件版本: ${packageJson.version}
       ${lastVersion !== packageJson.version ? '请及时更新插件，才能体验最新功能' : ''}
      ==========================================================
    `)
    await updatePuppetConfig({ puppetType: this.puppet.constructor.name })
    await updatePanelVersion()
    await setQrCode('', 4)
    await getConfig() // 获取配置文件
    void clearVerifyCode()
    const config = await allConfig()
    const { userId } = config && config.userInfo
    const payload = user.payload || user._payload
    const userInfo = {
      ...payload,
      robotId: payload.wxid || payload.id || user.id,
    }
    await addUser(userInfo) // 全局存储登录用户信息
    let file = ''
    let avatarUrl = ''
    if(payload.avatar) {
      file = await user.avatar()
      if(file) {
        const base = await file.toBase64()
        avatarUrl = base ? await putqn(base, userInfo.robotId):''
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
