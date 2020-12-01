const { delay, MD5 } = require('../lib')
const { getConfig, sendRobotInfo, sendError, putqn, setQrCode } = require('../proxy/aibotk')
const { addUser } = require('../common/userDb')
const { initAllSchedule } = require('../task')
/**
 * 登录成功监听事件
 * @param {*} user 登录用户
 */
async function onLogin(user) {
  console.log(`贴心助理${user}登录了`)
  await setQrCode('', 4)
  await sendError('')
  await getConfig() // 获取配置文件
  const userInfo = {
    ...user.payload,
    robotId: user.payload.weixin || MD5(user.name()),
  }
  await addUser(userInfo) // 全局存储登录用户信息
  const file = await user.avatar()
  const base = await file.toBase64()
  const avatarUrl = await putqn(base, user.name())
  await sendRobotInfo(avatarUrl, user.name(), userInfo.robotId) // 更新用户头像
  await delay(6000)
  await initAllSchedule(this) // 初始化任务
}

module.exports = onLogin
