class Config {
    constructor(){
        this.apiKey = '';
    }
    getApikey() {
        return this.apiKey
    }
    setApikey(val) {
        this.apiKey = val
    }
}

if (!global.configHandler) {
    global.configHandler = new Config();
}

export default global.configHandler

