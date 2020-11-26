const { delay } = require('../lib')
const { getConfig, sendAvatar, sendError } = require('../proxy/aibotk')
const { addUser } = require('../common/userDb')
const { initAllSchedule } = require('../task')
/**
 * 登录成功监听事件
 * @param {*} user 登录用户
 */
async function onLogin(user) {
  console.log(`贴心助理${user}登录了`)
  await sendError('')
  await getConfig() // 获取配置文件
  await addUser(user.payload) // 全局存储登录用户信息
  await sendAvatar(user.payload.avatar) // 更新用户头像
  await delay(6000)
  await initAllSchedule(this) // 初始化任务
}

module.exports = onLogin
