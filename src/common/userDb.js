const db = require('../lib/nedb.js')()

async function addUser(info) {
    try {
        let doc = await db.insert(info)
        return doc
    } catch (error) {
        console.log('插入数据错误', error)
    }
}

async function getUser() {
    try {
        let search = await db.find({})
        return search[0]
    } catch (error) {
        console.log('查询数据错误', error)
    }
}

module.exports = {
    addUser,
    getUser,
}
