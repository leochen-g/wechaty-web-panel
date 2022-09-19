import puppeteer from 'puppeteer'
import mainConfig from './mainConfig.js'
class BrowserManage {
  browserDestructionTimeout //清理浏览器实例
  browserInstance //浏览器实例
  browserState = 'closed' //浏览器状态
  /**
   * 用于长时间未进行操作时关闭浏览器实例
   */
  scheduleBrowserForDestruction() {
    clearTimeout(this.browserDestructionTimeout)
    this.browserDestructionTimeout = setTimeout(async () => {
      if (this.browserInstance) {
        this.browserState = 'closed'
        await this.browserInstance.close() //关闭浏览器实例
      }
    }, 5000)
  }
  /**
   * 用于长时间未进行操作时关闭浏览器实例
   */
  async getBrowser() {
    return new Promise(async (resolve, reject) => {
      if (this.browserState === 'closed') {
        this.browserInstance = await puppeteer.launch(mainConfig.config.puppeteer) //开启浏览器实例
        this.browserState = 'open'
        resolve(this.browserInstance)
      }
      if (this.browserState === 'open') {
        if (this.browserInstance) {
          resolve(this.browserInstance)
        }
      }
    })
  }
}
export default new BrowserManage()
