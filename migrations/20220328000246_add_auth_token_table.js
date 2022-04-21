/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.raw(
    `
    CREATE TABLE dawe_auth_tokens
    (
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL,
      refresh_token text NOT NULL,
      farm_username text NOT NULL
    );
    `
  )
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
