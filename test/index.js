const { Wechaty } = require("wechaty");
const bot = Wechaty.instance({ profile: "WECHATY_PROFILE" });
const WechatyWebPanelPlugin = require("../src/index");
bot
  .use(WechatyWebPanelPlugin())
  .start()
  .catch((e) => console.error(e));
