async function onRoomleave(room, leaverList, remover, date) {
  const nameList = leaverList.map((c) => c.name()).join(',')
  console.log(`群： 【${await room.topic()}】 离开了成员【 ${nameList}】,移除人【 ${remover}】`)
}
export default onRoomleave
