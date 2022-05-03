const openid_client = require ('openid-client');
const Issuer = openid_client.Issuer
const custom = openid_client.custom
const well_known_endpoint = process.env.B2C_WELL_KNOWN_ENDPOINT
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_target = process.env.REDIRECT_TARGET

module.exports = async function initOauthClient(){
  const b2cIssuer = await Issuer.discover(well_known_endpoint);

  const client = new b2cIssuer.Client({
    client_id: client_id,
    client_secret: client_secret,
    redirect_uris: [redirect_target],
    response_types: ['code'],
  });

  client[custom.clock_tolerance] = 10;
  return client
}
