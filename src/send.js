require('dotenv').config()
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);
const fetch = require('node-fetch')
const initOauth = require('./lib/oauth.js')

function date_format(date){
  return date.toISOString().split('T')[0]
}

async function get_records(){
  let data = await db.select(db.raw(`
      *
      `
    ))
    .from('temperature_data')
  for (item of data){
    item["reporting_date"] = date_format(item["reporting_date"])
    item["temp"] = parseFloat(item["temp"])
  }
  return data
}

async function main(){
  let records = await get_records()
  const client = await initOauth()

  let authresults = await db('dawe_auth_tokens')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(1);
  let estabresults = await db('estab_mapping')
    .select('*')
    .limit(1);

  if (authresults[0] && estabresults[0]){
    const tokenSet = await client.refresh(authresults[0]["refresh_token"]);
    await new Promise(r => setTimeout(r, 5000));
    const auth_token = tokenSet['id_token']
    let result = await send_records(records, estabresults[0].establishment_num, auth_token)
    console.debug(result)
  }
  console.log('Finished')
}

async function send_records(records, establishment_num, auth_token){
  const est_url = `${process.env.EXPORT_SERVICES_API_HOST}/intelligenceapi/temperature/${establishment_num}`
  const est = await fetch(est_url,{
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'authorization': `Bearer ${auth_token}`
    },
    body: JSON.stringify(records)
  });
  return est.json()
}

(async () => {
    try {
        var text = await main();
        console.log(text);
        process.exit(0)
    } catch (e) {
      console.debug(e)
    }
})();
