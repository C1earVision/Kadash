const {
  addProduct,
  deleteProduct,
  modifyProduct,
  modifyAdminAccess,
  addProductToCart,
  getCartItems,
  deleteCartItem,
  addReview,
  placeOrder,
  getOrders,
  updateOrderStatus
} = require('../controllers/req-auth')

const multer = require('multer');

// Set storage configuration for multer
const storage = multer.memoryStorage();  // Store the file in memory (buffer)
const upload = multer({ storage: multer.memoryStorage() });

const express = require('express')
const router = express.Router()

router.route('/admin').post(addProduct);
router.route('/admin/modifyAccess/:id').patch(modifyAdminAccess)
router.route('/admin/:id').delete(deleteProduct).patch(upload.fields([{ name: 'image0' }, { name: 'image1' }]), modifyProduct)
router.route('/cart/:id').post(addProductToCart).patch(deleteCartItem)
router.route('/cart').get(getCartItems)
router.route('/review/:id').post(addReview)
router.route('/order').get(getOrders).post(placeOrder).patch(updateOrderStatus)
module.exports = router