import globalConfig from '../db/global.js'
import { getVerifyCode } from '../proxy/aibotk.js'

export default async function onVerifyCode(id, message, scene, status) {
    try {
        globalConfig.setVerifyId(id);
        if (status === 1 && scene === 1 && id === globalConfig.getQrKey()) {
            await getVerifyCode();
            if(globalConfig.getVerifyCode()) {
                console.log(`获取到输入的验证码:${globalConfig.getVerifyCode()}，正在填入`)
                const verifyCode = globalConfig.getVerifyCode() // 通过一些途径输入验证码
                try {
                    await this.enterVerifyCode(id, verifyCode) // 如果没抛错，则说明输入成功，会推送登录事件
                } catch (e) {
                    console.log('验证码校验错误：', e.message)
                    // 如果抛错，请根据 message 处理，目前发现可以输错3次，超过3次错误需要重新扫码。
                    // 错误关键词: 验证码错误输入错误，请重新输入
                    // 错误关键词：验证码错误次数超过阈值，请重新扫码'
                    // 目前不会推送 EXPIRED 事件，需要根据错误内容判断
                }
            }
        } else {
            console.log('请重新扫码登录')
        }
    } catch (e) {
        console.log('输入验证码报错', e)
    }
}