require('dotenv').config()
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);
const fetch = require('node-fetch')
const initOauth = require('./lib/oauth.js')

async function main(){
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
    const auth_token = tokenSet['id_token']
    let result = await clear(estabresults[0].establishment_num, auth_token)
    console.debug(result)
  }
  console.log('Finished')
}

async function clear(establishment_num, auth_token){
  const est_url = `${process.env.EXPORT_SERVICES_API_HOST}/intelligenceapi/temperature/${establishment_num}`
  const est = await fetch(est_url,{
    method: 'DELETE',
    headers: {
      'authorization': `Bearer ${auth_token}`
    }
  });
  return
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
