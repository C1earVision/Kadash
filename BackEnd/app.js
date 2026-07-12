require('dotenv').config();
require('express-async-errors');
const express = require('express');
const noAuthRoutes = require('./routes/no-auth-routes')
const reqAuthRoutes = require('./routes/req-auth-routes')
const auth = require('./routes/auth')
const routeAuth = require('./middleware/route-auth')
const app = express();
const errorHandlerMiddleware = require('./middleware/error-handler')

//extra security packages
const helmet = require('helmet')
const cors = require('cors')
const xss = require('xss-clean')
const rateLimiter = require('express-rate-limit')


app.use(express.json());
app.set('trust proxy', 1);
app.use(express.json());
app.use(helmet())
app.use(xss())
app.use(cors())



//routes
app.use('/api/v1', noAuthRoutes)
app.use('/api/v1/auth', auth)
app.use('/api/v1/user', routeAuth, reqAuthRoutes)

//error handlers
app.use(errorHandlerMiddleware)

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
  });
}

module.exports = app;
