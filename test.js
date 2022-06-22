const axios = require("axios");
const fs = require('fs')
const get = async() => {
  let rawdata = fs.readFileSync('events/da2edd22-1155-49b3-8a2b-f446fdbd1154.json');
  const event = JSON.parse(rawdata);
  event.confirmed.forEach(async element => {
    const member = await axios.get("http://localhost:3000/members/" + element);

    await axios.post("http://localhost:3000/events/21/participants" , {memberId: member.data.id}).then((response) => {
      console.log(response)
    }).catch(res => {
      console.error(res);
    })
});
    
    /*const dom = new jsdom.JSDOM(resp.data)
    const element = dom.window.document.querySelector('p')
    console.log(element)*/
}
get();