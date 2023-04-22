class Command {
  constructor(name, handler) {
    this.name = name
    this.handler = handler
  }
}

class CommandManager {
  constructor() {
    this.commands = new Map()
  }

  register(command) {
    this.commands.set(command.name, command)
  }

  async execute(wxid, name, args) {
    const db = this.getDb(wxid)
    const command = this.commands.get(name)
    if (command) {
      return await command.handler(args, db)
    } else {
      console.log(`Unknown command: ${name}`)
    }
  }

  getDb(wxid) {
    if (!this.dbs) {
      this.dbs = new Map()
    }
    if (!this.dbs.has(wxid)) {
      const db = new Nedb({ filename: `path/to/db/${wxid}.db`, autoload: true })
      this.dbs.set(wxid, db)
    }
    return this.dbs.get(wxid)
  }
}

const manager = new CommandManager()

manager.register(new Command('/rssadd', async (args, db) => {
  const url = args[0]
  const id = generateUniqueId()
  await db.insert({ id, url })
  return '订阅源已添加'
}))

manager.register(new Command('/rsstime', async (args, db) => {
  const interval = args[0]
  await db.update({}, { $set: { interval } }, { multi: true })
  return '更新间隔已设置'
}))

manager.register(new Command('/rssls', async (args, db) => {
  const sources = await db.find({})
  const urls = sources.map(source => source.url).join('\n')
  return urls
}))

manager.register(new Command('/rssdel', async (args, db) => {
  const id = args[0]
  await db.remove({ id })
  return '订阅源已删除'
}))
