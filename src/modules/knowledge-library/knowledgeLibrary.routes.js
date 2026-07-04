// Industrial Knowledge Library — routes.
// Mounted at /api/knowledge-library (see src/app.js).
//
// Read endpoints are open; every WRITE endpoint that records a fact requires
// a `source_id` in the body (enforced in the service via requireProvenance).
// The module only ever touches kl_* tables — existing MATRIYA/Fresco data is
// never read or modified here.

const express = require('express')
const router = express.Router()
const c = require('./knowledgeLibrary.controller')

router.get('/health', (req, res) => res.json({ status: 'ok', module: 'knowledge-library' }))

// Provenance (create sources before recording facts against them)
router.post('/sources', c.createSource)
router.get('/sources', c.listSources)

// Layer 1 — hierarchy: Company -> Product Family -> Product
router.post('/companies', c.createCompany)
router.get('/companies', c.listCompanies)
router.post('/families', c.createFamily)
router.get('/companies/:companyId/families', c.listFamilies)

router.post('/products', c.createProduct)
router.get('/products', c.listProducts)
router.get('/products/:id', c.getProductFull)

// Product attributes (all require provenance)
router.post('/products/:id/properties', c.addProperty)
router.post('/products/:id/documents', c.addDocument)
router.post('/products/:id/knowledge', c.addKnowledge)
// Generic single-value attributes: classifications | functional-roles |
// compatible-systems | application-domains
router.post('/products/:id/:attribute', c.addProductAttribute)

// Layer 1 — broader ecosystem (raw materials, mechanisms, standards, patents…)
router.post('/assets', c.createAsset)
router.get('/assets', c.listAssets)
router.post('/asset-links', c.createAssetLink)

// Layer 3 — connections (hypotheses linking external KL to Fresco internal)
router.post('/connections', c.createConnection)
router.get('/connections', c.listConnections)
router.patch('/connections/:id', c.reviewConnection)  // validate / reject

module.exports = router
