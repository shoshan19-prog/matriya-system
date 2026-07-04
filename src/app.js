const express = require('express')
const app = express()

app.use(express.json())

const documentRoutes = require('./modules/documents/document.routes')
const knowledgeLibraryRoutes = require('./modules/knowledge-library/knowledgeLibrary.routes')

app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.use('/api/documents', documentRoutes)
app.use('/api/knowledge-library', knowledgeLibraryRoutes)

module.exports = app