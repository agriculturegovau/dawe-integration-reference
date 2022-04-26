require('dotenv').config()
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);
const fetch = require('node-fetch')
const openid_client = require ('openid-client');
const Issuer = openid_client.Issuer
const generators = openid_client.generators
const custom = openid_client.custom
const well_known_endpoint = process.env.B2C_WELL_KNOWN_ENDPOINT
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_target = process.env.REDIRECT_TARGET
const target_resource = process.env.TARGET_RESOURCE

async function main(){
  const b2cIssuer = await Issuer.discover(well_known_endpoint);

  const client = new b2cIssuer.Client({
    client_id: client_id,
    client_secret: client_secret,
    redirect_uris: [redirect_target],
    response_types: ['code'],
  });

  client[custom.clock_tolerance] = 5;

  let results = await db('dawe_auth_tokens')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(1);
  if (results[0]){
    const tokenSet = await client.refresh(results[0]["refresh_token"]);
    console.debug(tokenSet);
    console.log('refreshed ID Token claims %j', tokenSet.claims());
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
