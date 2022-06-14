const axios = require("axios");
const jsdom = require("jsdom");

const get = async() => {
    axios.get("https://www.keplaca.com/placa/GHX2G27", {
        headers: 
        {
            "Host": "www.keplaca.com", 
            "User-Agent": "PostmanRuntime/7.29.0",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }}).then((response) => {
        console.log(response)
      }).catch(res => {
        console.error(res);
      })
    /*const dom = new jsdom.JSDOM(resp.data)
    const element = dom.window.document.querySelector('p')
    console.log(element)*/
}
get();