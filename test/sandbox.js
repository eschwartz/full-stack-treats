const fs = require('fs');
const path = require('path');
const pg = require('pg');
const pool = require('../server/modules/pool');
const supertest = require('supertest');
const app = require('../server/server');


// TODO maybe we can override options, and reconnect?
// just needed to update host, too :-(
(async() => {
  // Create a new connection to pg, 
  // to create/drop out test db
  const testDb = `full-stack-treats-test-${Date.now()}`;
  console.log(`Creating test database ${testDb}...`);
  const adminPool = new pg.Pool({
    database: 'postgres'
  });
  await adminPool.query(`CREATE DATABASE "${testDb}";`);
  console.log(`Creating test database ${testDb}... done.`);



  try {
    // Update the app's pool, to connect to our test database
    pool.options.host = 'localhost';
    pool.options.database = testDb;
    pool.connect();

    // Execute the treats.sql file, to initialize the database
    console.log(`Executing treats.sql....`);
    const sqlPath = path.join(__dirname, '..', 'treats.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log(`Executing treats.sql.... done.`);


    // test the GET endpoint
    const agent = supertest.agent(app);
    let getRes = await agent.get('/treats');
    console.log(getRes.statusCode);
    console.log(getRes.body);
  }
  finally {
    // Drop the test database
    await adminPool.query(`DROP DATABASE "${testDb}";`)

  }
})();