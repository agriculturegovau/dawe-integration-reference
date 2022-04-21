
const dotenv = require('dotenv');
dotenv.config();
const  knex = require('knex');
const knex_config = require('../knexfile.js');
const db = knex(knex_config["development"]);

function random_volume(){
  return 20 + Math.trunc(Math.random() * 10)
}

function random_temp(){
  return 1 + Math.trunc(Math.random() * 4)
}

async function get_records(){
  let count = 1
  let records = []
  let base_date = "2022-02-"
  while (count < 28) {
    let record = {
      reporting_date : new Date(`${base_date}${count}`),
      volume : random_volume(),
      temp : random_temp()
    }
    records.push(record)
    count = count + 1
  }
  return records
}

async function main(){
  await db('temperature_data').delete()
  let records = await get_records()
  for (item of records){
    let result = await db('temperature_data').insert(item).returning('*');
  }
  console.log('Finished')

}

(async () => {
    try {
        var text = await main();
        console.log(text);
        process.exit(0)
    } catch (e) {
      console.debug(e)
        // Deal with the fact the chain failed
    }
})();
/* eslint-enable */
