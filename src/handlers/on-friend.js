import { delay } from '../lib/index.js'
import { allConfig } from '../db/configDb.js'
import { contactSay } from "../common/index.js";
/**
 * 好友添加
 */
async function onFriend(friendship) {
  try {
    const config = await allConfig()
    let logMsg, hello
    let name = friendship.contact().name()
    hello = friendship.hello()
    logMsg = name + '，发送了好友请求'
    console.log(logMsg)
    if (config && config.autoAcceptFriend) {
      switch (friendship.type()) {
        case 2:
          if (config.acceptFriendKeyWords.length === 0) {
            console.log('无认证关键词,10秒后将会自动通过好友请求')
            await delay(10000)
            await friendship.accept()
          } else if (config.acceptFriendKeyWords.length > 0 && config.acceptFriendKeyWords.find(item=> hello.includes(item))) {
            console.log(`触发关键词${hello},10秒后自动通过好友请求`)
            await delay(10000)
            await friendship.accept()
          } else {
            console.log('未触发任何关键词，好友自动添加失败')
          }
          break
        case 1:
          logMsg = '已确认添加好友：' + name
          console.log(`新添加好友：${name}，默认回复`)
          if(config.newFriendReplys && config.newFriendReplys.length) {
            for (let reply of config.newFriendReplys) {
              await delay(1000);
              await contactSay.call(this, friendship.contact(), reply);
            }
          }
          break
        case 0:
          logMsg = '未知错误' + name
          console.log(logMsg)
          break
        case 3:
          logMsg = '开启了验证' + name
          console.log(logMsg)
          break
      }
    } else {
      console.log('未开启自动添加好友功能，忽略好友添加')
    }
  } catch (e) {
    console.log('添加好友出错：', e)
  }
}
export default onFriend
