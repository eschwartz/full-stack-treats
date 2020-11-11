const fs = require('fs');
const path = require('path');
const pg = require('pg');
const pool = require('../server/modules/pool');
const supertest = require('supertest');
const app = require('../server/server');

let agent;


beforeAll(async() => {
  // Execute the treats.sql file, to initialize the database
  console.log(`Executing treats.sql....`);
  const sqlPath = path.join(__dirname, '..', 'treats.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Update the app's pool, to connect to our test database
  pool.options.host = process.env.PGHOST || 'localhost';
  pool.options.user = process.env.PGUSER || undefined;
  pool.options.password = process.env.PGPASSWORD || undefined;
  pool.options.port = process.env.PGPORT || undefined;
  pool.options.database = process.env.TEST_DB;
  pool.connect();
  await pool.query(sql);
  console.log(`Executing treats.sql.... done.`);


  // test the GET endpoint
  agent = supertest.agent(app)
    // Send data as application/x-www-form-urlencoded 
    // instead of default JSON
    .type('form');
});

describe('GET /treats', () => {

  it('should return treats from the database', async() => {
    let res = await agent.get('/treats');
    expect(res.statusCode, 'GET /treats should return a 200').toBe(200);
    expect(res.body, 'GET /treats should return data from the DB').toMatchObject([
      { 
        id: 1,
        name: 'Cupcake', 
        description: 'A delicious cupcake', 
        pic: '/assets/cupcake.jpg'
      },
      {
        id: 2,
        name: 'Donuts', 
        description: 'Mmmm donuts', 
        pic: '/assets/donuts.jpg',
      }
    ]);
  });


});


describe('POST /treats', () => {

  it('should add a treat to the database', async() => {
    let postRes = await agent.post('/treats')
      .send({ 
        name: 'Potato', 
        description: 'Everyone loves a good potato',
        pic: '/assets/potato.jpg' 
      });

    expect(postRes.statusCode, 'POST /treats should return a 201').toBe(201);

    // Check that the item was saved to the DB
    let dbRes = await pool.query(`
      SELECT * FROM treats
      WHERE name = 'Potato'
    `);
    expect(dbRes.rows.length, 'should save a record to the DB').toBe(1);
    expect(dbRes.rows[0], 'should save the correct data to the DB').toMatchObject({
      name: 'Potato', 
      description: 'Everyone loves a good potato',
      pic: '/assets/potato.jpg' 
    })
  });

});

describe('DELETE /treats/:id', () => {

  it('should delete a treat from the database', async () => {
    let res = await agent.delete('/treats/1');
    expect(res.statusCode, 'should return a 200 response code').toBe(200);

    // Look for treat 1 in the DB
    let dbRes = await pool.query(`
      SELECT * FROM treats
      WHERE id = 1
    `);
    expect(dbRes.rows.length, 'record should not be in the database').toBe(0);
  });

});

// NOTE: this suite must be the last suite in this file,
// as it drops the "treats" table
describe('should send back 500 responses on error', () => {
  
  beforeAll(async () => {
    // Drop the treats table, to trigger 500 errors
    await pool.query('DROP TABLE treats');
  });

  it('from the GET /treats endpoint', async () => {
    let res = await agent.get('/treats');
    expect(res.statusCode, 'should return a 500 on error').toBe(500);
  }, 1000);

  it('from the POST /treats endpoint', async () => {
    let res = await agent.post('/treats')
      .send({ 
        name: 'Potato', 
        description: 'Everyone loves a good potato',
        pic: '/assets/potato.jpg' 
      });
    expect(res.statusCode, 'should return a 500 on error').toBe(500);
  }, 1000);

  it('from the DELETE /treats endpoint', async () => {
    let res = await agent.delete('/treats/1');
    expect(res.statusCode, 'should return a 500 on error').toBe(500);
  }, 1000);

});