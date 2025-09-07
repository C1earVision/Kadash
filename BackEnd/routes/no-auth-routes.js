const {getAllProducts, getProduct} = require('../controllers/no-auth')

const express = require('express')
const router = express.Router()

router.route('/products').get(getAllProducts)
router.route('/products/:id').get(getProduct)

module.exports = router