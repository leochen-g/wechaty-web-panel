import { getGptConfigById, updateAllGptConfig, updateOneGptConfig } from "./gptConfig.js";

class Config {
    constructor(){
        this.apiKey = '';
        this.gptconfig = [];
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

