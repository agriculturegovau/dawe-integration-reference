'use strict';
const dotenv = require('dotenv');
if (process.env.DOTENV){
  dotenv.config();
}
const knex = require ('knex');
const knex_config = require('../knexfile');
const asyncHandler = require("express-async-handler")
const db = knex(knex_config["development"]);
const port = process.env.PORT || 8080;
const express = require('express');
const morgan = require('morgan');
const openid_client = require ('openid-client');
const Issuer = openid_client.Issuer
const generators = openid_client.generators
const custom = openid_client.custom
const session = require('express-session')
const crypto = require('crypto');
const hbs = require('hbs');
const basicAuth = require('express-basic-auth')
const well_known_endpoint = process.env.B2C_WELL_KNOWN_ENDPOINT
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_target = process.env.REDIRECT_TARGET
const target_resource = process.env.TARGET_RESOURCE
const username = process.env.USERNAME
const password = process.env.PASSWORD
const session_secret = process.env.SESSION_SECRET

const fetch = require('node-fetch')

const cron = require('node-cron');

run().catch(err => console.log(err));

async function get_estabs(auth_token){
  const est_url = `${process.env.EXPORT_SERVICES_API_HOST}/export-premises-api/premises`
  const est = await fetch(est_url,{
    headers: { 'authorization': `Bearer ${auth_token}`
  }});
  return est.json()
}

async function run() {
  const app = express();
  app.use(morgan('dev'));

  app.use(express.urlencoded({
    extended: true
  }))
  app.use(basicAuth({
    challenge: true,
    users: { username: password }
  }))
  app.set('view engine', 'hbs');
  app.use(session({
    genid: function(req) {
      return crypto.randomUUID()
    },
    secret: session_secret
  }))

  app.get('/', asyncHandler(async (req, res) => {
    let linked = await db('estab_mapping')
      .select('*')
      .where('farm_username', 'admin')
      .limit(1);


    const temperature_data = await db.select(db.raw(`
      *
      `
    ))
    .from('temperature_data')
    res.render('index', {
      logged_in: req.session.logged_in,
      name: req.session.name,
      linked_estab: linked[0],
      temperature_data: temperature_data
    })
  }));

  app.get('/health', asyncHandler(async (req, res) => {
    // Simplest possible test to verify connectivity
    const db_status = await db.raw(`SELECT 'ok'`);
    const out = {
      status: {
        "db": db_status
      }
    }
    res.json(out)
  }));

  app.get('/link_estabs', asyncHandler(async (req, res) => {
    let data
    let results = await db('dawe_auth_tokens')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(1);
    if (results[0]){
      const tokenSet = await client.refresh(results[0]["refresh_token"]);
      await new Promise(r => setTimeout(r, 2000));
      const auth_token = tokenSet['id_token']
      console.debug(auth_token)
      data = await get_estabs(auth_token)
      console.debug(data)
    }
    res.render('link_estabs', {
      estabs: data["data"]
    })
  }))

  app.post('/link_estabs', asyncHandler(async (req, res) => {
    let data = req.body
    console.debug()
    let record = {
      "establishment_num" : data["estab_num"],
      "farm_username" : "admin"
    }
    let result = await db('estab_mapping').insert(record).returning('*');
    console.debug(result)
    return res.redirect(302, '/')
  }))

  const b2cIssuer = await Issuer.discover(well_known_endpoint);

  const client = new b2cIssuer.Client({
    client_id: client_id,
    client_secret: client_secret,
    redirect_uris: [redirect_target],
    response_types: ['code'],
  });

  client[custom.clock_tolerance] = 5;

  app.get('/connect', asyncHandler(async (req, res) => {
    const code_verifier = generators.codeVerifier();
    req.session.code_verifier = code_verifier
    const code_challenge = generators.codeChallenge(code_verifier);
    const authurl = client.authorizationUrl({
      scope: 'openid offline_access',
      resource: target_resource,
      code_challenge,
      code_challenge_method: 'S256',
    });
    await req.session.save()
    return res.redirect(302, authurl)
  }))

  app.get('/authorize', asyncHandler(async (req, res) => {
    const params = client.callbackParams(req);
    const code_verifier = req.session.code_verifier
    const tokenSet = await client.callback(redirect_target, params, { code_verifier });
    // console.log('received and validated tokens %j', tokenSet);
    // console.log('validated ID Token claims %j', tokenSet.claims());

    let expires = new Date();
    expires = new Date(expires.getTime() + 1000 * tokenSet.refresh_token_expires_in);
    let record = {
      created_at: new Date(),
      expires_at: expires,
      refresh_token: tokenSet.refresh_token,
      farm_username: "admin"
    }
    let result = await db('dawe_auth_tokens').insert(record).returning('*');
    req.session.logged_in = true
    req.session.name = tokenSet.claims().name


    let results = await db('estab_mapping')
      .select('*')
      .where('farm_username', 'admin')
      .limit(1);
    let linked = (results[0])
    if (linked){
      return res.redirect(302, '/')
    }else{
      return res.redirect(302, '/link_estabs')
    }
  }))

  await app.listen(port);
  console.log(`listening on port: ${port}`)
}

async function crontasks() {
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
    console.debug(result)
  }
  console.log('running a task every minute');
}

cron.schedule('* * * * *', () => {
  crontasks().catch(err => console.log(err))
});
