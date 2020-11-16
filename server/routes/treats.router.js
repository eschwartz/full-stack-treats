const router = require('express').Router();
const pool = require('../modules/pool');


// GET /treats
router.get('/', async (req, res) => {
    try {
        if (req.query.q) {
            let results = await pool.query(`
                SELECT * FROM treats
                WHERE name LIKE $1 OR description LIKE $1;
            `, [`%${req.query.q}%`]);
            
            if (!results.rows.length) {
                res.sendStatus(404);
                return;
            }
            res.send(results.rows[0]);
            return;
        }

        let queryText = `SELECT * FROM treats;`;
        let results = await pool.query(queryText);
        
        res.send(results.rows);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// POST /treats
router.post('/', (req, res) => {
    console.log(req.body);
    let queryText = `INSERT INTO treats (name, description, pic) VALUES ($1, $2, $3)`;
    pool.query(queryText, [req.body.name, req.body.description, req.body.pic]).then((result) => {
        res.sendStatus(201);
    }).catch((error) => {
        console.log(error);
        res.sendStatus(500);
    })
});

// PUT /treats/<id>
router.put('/:id', async (req, res) => {
    try {
        await pool.query(`
            UPDATE "treats"
            SET name=$1, description=$2, pic=$3
            WHERE id=$4
        `, [req.body.name, req.body.description, req.body.pic, req.params.id]);

        res.send(200);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

// DELETE /treats/<id>
router.delete('/:id', (req, res) => {
    console.log(req.params); // url parameters
    let queryText = `DELETE FROM treats WHERE id = $1;`
    pool.query(queryText, [req.params.id]).then((results) => {
        res.sendStatus(200);
    }).catch((error) => {
        res.sendStatus(500);
    });
});

module.exports = router;