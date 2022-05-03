require('dotenv').config()
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);


async function main(){
  await db('estab_mapping').delete()
  await db('dawe_auth_tokens').delete()
  console.log('Finished')

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
