const data = {
    admin:"12",
    members :["1","2","3"]
}

const allmembers = [data.admin , ...data.members]
const filteredMembers = allmembers.filter(member => member !== "12");

console.log(allmembers ,"all" , filteredMembers)