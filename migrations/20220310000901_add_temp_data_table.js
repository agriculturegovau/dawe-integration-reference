/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.raw(
    `
    CREATE TABLE temperature_data
    (
      reporting_date timestamp NOT NULL,
      volume integer NOT NULL,
      temp decimal(10, 4) NOT NULL
    );
    `
  )
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  
};
