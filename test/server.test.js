const pool = require('../server/modules/pool');
const supertest = require('supertest');
const app = require('../server/server');

let agent;
let querySpy;

expect.extend({
  toBe2xx(statusCode) {
    return {
      pass: statusCode >= 200 && statusCode < 300,
      message: () => `expected a 2xx status code`
    }
  },
});

beforeAll(async() => {
  // Update the app's pool, to connect to our test database
  pool.options.host = process.env.PGHOST || 'localhost';
  pool.options.database = process.env.TEST_DB;
  pool.connect();

  // Spy on pool.query
  querySpy = jest.spyOn(pool, 'query');
  querySpy.lastCall = () => querySpy.mock.calls[querySpy.mock.calls.length-1]

  // Set the supertest agent
  agent = supertest.agent(app)
    .timeout(500)
    // Send data as application/x-www-form-urlencoded 
    // instead of default JSON
    .type('form');
});

describe('GET /treats', () => {

  it('should return treats from the database', async() => {
    let res = await agent.get('/treats');
    expect(res.statusCode, 'GET /treats should return a 200').toBe2xx(200);
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

  it('[STRETCH] should find treats that match a query parameter', async() => {
    let res = await agent.get('/treats')
      .query({ q: 'donut' });

    expect(res.statusCode, 'GET /treats?q=donut should return a 200').toBe(200);

    // Allow students to send back either an array, or a single object
    let data = Array.isArray(res.body) ? res.body[0] : res.body;

    // If they send back an array, should only contain a single record
    if (Array.isArray(res.body)) {
      expect(res.body.length, 'GET /treats?q=donut should return a single record')
        .toBe(1);
    }

    expect(data, 'GET /treats?q=donut should return a matching treat')
      .toMatchObject({
        id: 2,
        name: 'Donuts', 
        description: 'Mmmm donuts', 
        pic: '/assets/donuts.jpg',
      });
  });


});

describe('PUT /treats', () => {

  it('should update a treat in the database', async() => {
    let putRes = await agent.put('/treats/1')
      .send({
          description: 'Like a cupcake, but bowl-sized!', 
      });

    expect(putRes.statusCode, 'PUT /treats should return a 200').toBe2xx();

    // Check the DB, that our record was updated
    let dbRes = await pool.query(`
      SELECT * FROM "treats"
      WHERE id=1
    `);
    expect(dbRes.rows[0], 'should update the data in the DB').toMatchObject({
      description: 'Like a cupcake, but bowl-sized!', 
    });

    // Check that other records are NOT updated
    dbRes = await pool.query(`
      SELECT * FROM "treats"
      WHERE id=2
    `);
    expect(dbRes.rows[0], 'should not alter other rows in the database').toMatchObject({
      id: 2,
      description: 'Mmmm donuts', 
    });
  });

  it('should use parameterized queries', async() => {
    await agent.put('/treats/1')
      .send({
          description: 'Like a cupcake, but bowl-sized!', 
      });

    expect(querySpy.lastCall()[1], 'passes description as SQL parameter')
      .toContain('Like a cupcake, but bowl-sized!')
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

    expect(postRes.statusCode, 'POST /treats should return a 201').toBe2xx();

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
    });
  });

  it('should use parameterized queries', async() => {
    await agent.post('/treats')
      .send({ 
        name: 'Potato', 
        description: 'Everyone loves a good potato',
        pic: '/assets/potato.jpg' 
      });

    expect(querySpy.lastCall()[1], 'passes name as SQL parameter')
      .toContain('Potato');
    expect(querySpy.lastCall()[1], 'passes description as SQL parameter')
      .toContain('Everyone loves a good potato');
    expect(querySpy.lastCall()[1], 'passes pic as SQL parameter')
      .toContain('/assets/potato.jpg');
  });

});

describe('DELETE /treats/:id', () => {

  it('should delete a treat from the database', async () => {
    let res = await agent.delete('/treats/1');
    expect(res.statusCode, 'should return a 200 response code').toBe2xx();


    // Look for treat 1 in the DB
    let dbRes = await pool.query(`
      SELECT * FROM treats
      WHERE id = 1
    `);
    expect(dbRes.rows.length, 'record should not be in the database').toBe(0);

    // Should not delete other rows
    dbRes = await pool.query(`
      SELECT * FROM treats
      WHERE id=2
    `);
    expect(dbRes.rows.length, 'should not delete other records').toBe(1);
  });

  it('should use SQL prepared statements', async() => {
    await agent.delete('/treats/1');

    // Inspect the last call to `pool.query`
    // and check that we passed SQL params to it
    expect(querySpy.lastCall()[1], 'should pass in the treat ID as a SQL parameter').toEqual(['1']);
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