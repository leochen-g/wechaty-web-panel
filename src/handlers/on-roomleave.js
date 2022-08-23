async function onRoomleave(room, leaverList, remover, date) {
  const nameList = leaverList.map((c) => c.name()).join(',')
  console.log(`Room ${await room.topic()} lost member ${nameList}, the remover is: ${remover}`)
}
export default onRoomleave
