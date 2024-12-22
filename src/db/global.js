class Config {
    constructor(){
        this.apiKey = '';
        this.qrcodeKey = ''; // 企微二维码key
        this.verifyCode = ''; // 企微验证码
        this.verifyId = ''; // 企微验证码id
        this.gptconfig = [];
        this.allTasks = [];
    }
    getAllTasks() {
        return this.allTasks
    }
    updateAllTasks(list) {
        this.allTasks = list
    }
    getVerifyId() {
        return this.verifyId;
    }
    setVerifyId(val) {
        this.verifyId = val;
    }
    getVerifyCode() {
        return this.verifyCode;
    }
    setVerifyCode(val) {
        this.verifyCode = val;
    }
    getQrKey() {
        return this.qrcodeKey;
    }
    setQrKey(val) {
        this.qrcodeKey = val;
    }
    getApikey() {
        return this.apiKey
    }
    setApikey(val) {
        this.apiKey = val
    }
    getAllGptConfig() {
        return this.gptconfig
    }
    updateAllGptConfig(list) {
        this.gptconfig = list
    }
    getGptConfigById(id) {
        return this.gptconfig.find(item=> item.id === id)
    }
    updateOneGptConfig(id, info) {
        this.gptconfig = this.gptconfig.map(item=> {
            if(item.id === id) {
                return info
            }
            return item
        })
    }
}

if (!global.configHandler) {
    global.configHandler = new Config();
}

export default global.configHandler

