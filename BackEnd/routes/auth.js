const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()

const {login} = require('../controllers/auth')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { msg: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.route('/login').post(loginLimiter, login)

module.exports = router