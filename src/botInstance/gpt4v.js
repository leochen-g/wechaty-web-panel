import { getImageVision } from "./sdk/chatGPT4V.js";
import { getPuppetEol } from "../const/puppet-type.js";

export async function get4vReply(images, question, config) {
  try {

    const eol = await getPuppetEol();
    const finalConfig = {
      ...config,
      baseUrl: config.proxyPass || ''
    }
    const { text } = await getImageVision(images, question, finalConfig);
    let replys = [];
    let message = text.replaceAll("\n", eol);

    while (message.length > 1000) {
      replys.push(message.slice(0, 1000));
      message = message.slice(1000);
    }
    replys.push(message);
    replys = replys.map(item => {
      return {
        type: 1,
        content: item.trim()
      };
    });
    return replys;
  } catch (e) {
    console.log("gpt4v报错：" + e);
    return [{ type: 1, content: '图像识别失败，请确保你的账号有GPT-4V权限'}];
  }
}
