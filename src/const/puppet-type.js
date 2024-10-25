import { getPuppetInfo } from "../db/puppetDb.js";

export const PUPPET_MAP = {
  // https://github.com/wechaty/puppet-wechat4u
  'PuppetWechat4u': '基于wechat4u的网页版api协议',
  // https://github.com/wechaty/puppet-wechat
  'PuppetWechat': '网页版hook协议',
  // https://github.com/wechaty/puppet-padlocal
  'PuppetPadlocal': 'PadLocal协议',
  // https://github.com/wechaty/puppet-engine
  'PuppetEngine': '基于大恩hook的engine协议',
  // https://github.com/wechaty/puppet-official-account
  'PuppetOA': '公众号协议',
  // https://github.com/wechaty/puppet-xp
  'PuppetXp': 'windows xp协议',
  // https://github.com/wechaty/puppet-gitter
  'PuppetGitter': 'gitter协议',
  // https://github.com/wechaty/puppet-whatsapp
  'PuppetWhatsapp': 'whatsapp协议',
  // https://github.com/leochen-g/puppet-walnut-gateway
  'PuppetWalnut': '硬核桃5G消息协议',
  // https://github.com/wechaty/puppet-discord
  'PuppetDiscord': 'Discord协议',
  // https://github.com/wechaty/puppet-oicq
  'PuppetOICQ': '基于OICQ的qq协议',
  // https://github.com/wechaty/puppet-lark
  'PuppetLark': '飞书协议',
  'PuppetService': '企微协议',
  'PuppetMatrix': 'ipad协议',
}

// 需要处理换行的puppet 主要是 windows 平台下需要把\n 换成\r\n
export const WRAP_REPLACE_PUPPET = [
  'PuppetEngine', 'PuppetXp'
]

export const SEND_APP_MSG_PUPPET = [
  'PuppetEngine',
  'PuppetXp',
  'PuppetPadlocal',
  'PuppetWalnut',
  'PuppetOICQ',
  'PuppetLark',
  'PuppetOA',
  'PuppetWhatsapp',
  'PuppetDiscord'
]

export async function getPuppetEol() {
  const puppetInfo = await getPuppetInfo()
  if(puppetInfo.puppetType === 'PuppetXp' || puppetInfo.puppetType === 'PuppetEngine') {
    return '\r'
  }
  return '\n'
}

/**
 * 判断是不是windows平台
 * @return {Promise<boolean>}
 */
export async function isWindowsPlatform() {
  const puppetInfo = await getPuppetInfo()
  if(puppetInfo.puppetType === 'PuppetXp' || puppetInfo.puppetType === 'PuppetEngine') {
    return true
  }
  return false;
}

/**
 * 判断是否是web 协议
 * @return {Promise<boolean>}
 */
export async function isNotWebPuppet() {
  const puppetInfo = await getPuppetInfo()
  return puppetInfo.puppetType === 'PuppetWechat4u' && puppetInfo.puppetType === 'PuppetWechat'
}
