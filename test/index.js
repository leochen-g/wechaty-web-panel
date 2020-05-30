const { Wechaty } = require("wechaty");
const bot = Wechaty.instance({ profile: "WECHATY_PROFILE" });
const WechatyPanelPlugin = require("../src/index");
bot
  .use(WechatyPanelPlugin())
  .start()
  .catch((e) => console.error(e));
