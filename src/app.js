const express = require('express')
const app = express()

const { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = require('./config/embedding')
const mechanismRoutes = require('./modules/mechanisms/mechanism.routes')

app.use(express.json())

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'matriya-v5-core',
        role: 'engine core only (no document CRUD, no chat, no UI)',
        embedding_standard: { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS },
    })
})

app.use('/api/mechanisms', mechanismRoutes)

module.exports = app
