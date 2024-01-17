async function onRoomleave(room, leaverList, remover, date) {
  try {
    const nameList = leaverList.map((c) => c.name()).join(',')
    console.log(`群： 【${await room.topic()}】 离开了成员【 ${nameList}】,移除人【 ${remover}】`)
  } catch (e) {
    console.log('群成员离开报错', e)
  }
}
export default onRoomleave
