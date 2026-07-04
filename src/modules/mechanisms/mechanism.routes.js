const express = require('express')
const router = express.Router()
const { MECHANISMS } = require('./mechanism.registry')
const model = require('./mechanism.model')

// GET /api/mechanisms — registry + persisted mechanisms
router.get('/', async (req, res) => {
    try {
        const persisted = await model.listMechanisms()
        res.json({ registry: MECHANISMS, persisted })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET /api/mechanisms/claims?mechanism_key=char_formation — claims with their evidence
router.get('/claims', async (req, res) => {
    try {
        const claims = await model.listClaims(req.query.mechanism_key || null)
        res.json({ count: claims.length, claims })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router
