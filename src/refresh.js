require('dotenv').config()
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);
const fetch = require('node-fetch')
const initOauth = require('./lib/oauth.js')

async function main(){
  const client = await initOauth()

  let results = await db('dawe_auth_tokens')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(1);
  if (results[0]){
    const tokenSet = await client.refresh(results[0]["refresh_token"]);
    // console.log('refreshed ID Token claims %j', tokenSet.claims());
    let expires = new Date();
    expires = new Date(expires.getTime() + 1000 * tokenSet.refresh_token_expires_in);
    let record = {
      created_at: new Date(),
      expires_at: expires,
      refresh_token: tokenSet.refresh_token,
      farm_username: "admin"
    }
    let result = await db('dawe_auth_tokens').insert(record).returning('*');
  }
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
