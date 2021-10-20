const { sendError } = require('../proxy/aibotk')

async function onError(error) {
  try {
    console.log('错误', error)
    await sendError(
      error.message
        .replace(/\ +/g, '')
        .replace(/[\r\n]/g, '')
        .replace('Error:type(){returnthis._type;}', '')
    )
  } catch (e) {
    console.log('上报错误失败', e)
  }
}

module.exports = onError
