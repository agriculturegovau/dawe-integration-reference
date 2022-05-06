require('dotenv').config()
const knex = require ('knex');
const knex_config = require('../knexfile');
const asyncHandler = require("express-async-handler")
const db = knex(knex_config["development"]);
const port = process.env.PORT || 8080;
const express = require('express');
const morgan = require('morgan');
const openid_client = require ('openid-client');

const generators = openid_client.generators

const session = require('express-session')
const crypto = require('crypto');
require('hbs');
const basicAuth = require('express-basic-auth')
const initOauth = require('./lib/oauth.js')
const fetch = require('node-fetch')

const redirect_target = process.env.REDIRECT_TARGET
const target_resource = process.env.TARGET_RESOURCE

const username = process.env.USERNAME
const password = process.env.PASSWORD
const session_secret = process.env.SESSION_SECRET

async function get_estabs(auth_token){
  const est_url = `${process.env.EXPORT_SERVICES_API_HOST}/export-premises-api/premises`
  const est = await fetch(est_url,{
    headers: { 'authorization': `Bearer ${auth_token}`
  }});
  return est.json()
}

async function main() {
  const users = {}
  users[username] = password

  const app = express();
  app.use(morgan('dev'));

  app.use(express.urlencoded({
    extended: true
  }))

  // This uses basic auth is for development purposes only
  // For production use you'd want something far more robust
  app.use(basicAuth({
    challenge: true,
    users: users
  }))
  app.set('view engine', 'hbs');

  // Note this is development only session storage
  // For production use you'd want to persist this somewhere (Maybe redis?)
  app.use(session({
    genid: function() {
      return crypto.randomUUID()
    },
    resave: true,
    saveUninitialized: true,
    secret: session_secret
  }))

  const client = await initOauth()

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

  app.get('/link_estabs', asyncHandler(async (req, res) => {
    let data
    let results = await db('dawe_auth_tokens')
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(1);
    if (results[0]){
      const tokenSet = await client.refresh(results[0]["refresh_token"]);
      const auth_token = tokenSet['id_token']
      data = await get_estabs(auth_token)
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
    await db('estab_mapping').insert(record).returning('*');
    return res.redirect(302, '/')
  }))

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

    let expires = new Date();
    expires = new Date(expires.getTime() + 1000 * tokenSet.refresh_token_expires_in);
    let record = {
      created_at: new Date(),
      expires_at: expires,
      refresh_token: tokenSet.refresh_token,
      farm_username: "admin"
    }
    await db('dawe_auth_tokens').insert(record).returning('*');
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

main().catch(err => console.log(err));
