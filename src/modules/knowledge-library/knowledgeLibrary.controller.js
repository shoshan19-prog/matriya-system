// Industrial Knowledge Library — controller layer.
// Thin HTTP wrappers around the service. Validation errors (missing
// provenance, bad enums, layer violations) carry a `status` and are returned
// as 400; anything else is a 500.

const service = require('./knowledgeLibrary.service')

function handle(fn) {
    return async (req, res) => {
        try {
            const result = await fn(req)
            res.json({ success: true, data: result })
        } catch (err) {
            const status = err.status || 500
            res.status(status).json({
                success: false,
                error: err.message || 'Internal error',
            })
        }
    }
}

module.exports = {
    // sources
    createSource: handle((req) => service.createSource(req.body)),
    listSources: handle(() => service.listSources()),
    // companies
    createCompany: handle((req) => service.createCompany(req.body)),
    listCompanies: handle(() => service.listCompanies()),
    // families
    createFamily: handle((req) => service.createFamily(req.body)),
    listFamilies: handle((req) => service.listFamilies(req.params.companyId)),
    // products
    createProduct: handle((req) => service.createProduct(req.body)),
    listProducts: handle((req) => service.listProducts(req.query)),
    getProductFull: handle(async (req) => {
        const product = await service.getProductFull(req.params.id)
        if (!product) {
            const err = new Error('Product not found')
            err.status = 404
            throw err
        }
        return product
    }),
    addProductAttribute: handle((req) =>
        service.addProductAttribute(req.params.attribute, req.params.id, req.body)),
    addProperty: handle((req) => service.addProperty(req.params.id, req.body)),
    addDocument: handle((req) => service.addDocument(req.params.id, req.body)),
    addKnowledge: handle((req) => service.addKnowledge(req.params.id, req.body)),
    // ecosystem assets
    createAsset: handle((req) => service.createAsset(req.body)),
    listAssets: handle((req) => service.listAssets(req.query)),
    createAssetLink: handle((req) => service.createAssetLink(req.body)),
    // connections (Layer 3)
    createConnection: handle((req) => service.createConnection(req.body)),
    listConnections: handle((req) => service.listConnections(req.query)),
    reviewConnection: handle((req) => service.reviewConnection(req.params.id, req.body)),
}
