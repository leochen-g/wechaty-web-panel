import baiduApi from "baidu-aip-sdk";

export class ContentCensor {
  constructor(config) {
    this.client = null;
    this.config = config;
  }

  init() {
    if (this.config.type === 1) {
      this.client = new baiduApi.contentCensor(this.config.appId, this.config.apiKey, this.config.secretKey);
    }
  }

  async checkText(text) {
    if (!this.client) {
      this.init();
    }
    if (this.config.type === 1) {
      const result = await this.client.textCensorUserDefined(text);
      console.log('result', result);
      return result.conclusionType ? result.conclusionType === 1 : true;
    }
  }
}
