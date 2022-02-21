const browserManage = require('./index')
const drawHelpers = require('./drawHelp')

const generateRoomImg = async function (passedOptions) {
  const browser = await browserManage.getBrowser()
  const page = (await browser.pages())[0]
  // 添加 mcanvas cdn地址
  let filePath = 'http://image.xkboke.com/pubilc/cdn/mcanvas.js'
  await page.addScriptTag({
    url: filePath,
  })
  page.on('console', (msg) => console.log(msg.type(), msg.text())) //监听页面console事件
  const base64 = await page.evaluate(drawHelpers.generateRoomImg, passedOptions)
  browserManage.scheduleBrowserForDestruction()
  // await FileBox.fromBase64(base64).toFile('./test.png')
  // const buffer = Buffer.from(base64, 'base64')
  return base64 //返回Base64 编码的图片
}

const generateAvatar = async function (passedOptions) {
  const browser = await browserManage.getBrowser()
  const page = (await browser.pages())[0]
  // 添加 mcanvas cdn地址
  let filePath = 'http://image.xkboke.com/pubilc/cdn/mcanvas.js'
  await page.addScriptTag({
    url: filePath,
  })
  page.on('console', (msg) => console.log(msg.type(), msg.text())) //监听页面console事件
  const base64 = await page.evaluate(drawHelpers.generateAvatar, passedOptions)
  browserManage.scheduleBrowserForDestruction()
  // await FileBox.fromBase64(base64).toFile('./test.png')
  return base64 //返回Base64 编码的图片
}

module.exports = {
  generateAvatar,
  generateRoomImg,
}
