const CustomAPIError = require('../errors/custom-error')
const {StatusCodes} = require('http-status-codes')
const dbConnect = require('../db/dbconfig')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const createJWT = function (admin, _id, name){
  return jwt.sign({admin:admin ,customerId:_id, name:name}, process.env.JWT_SECRET, {expiresIn:process.env.JWT_LIFETIME})
}

const comparePassword = async function (sentPass, originalPass){
  const res = await bcrypt.compare(sentPass, originalPass)
  return res
}

const login = async (req,res)=>{
  const {email ,password} = req.body
  const db = await dbConnect;
  const result = await db.query(`
    SELECT 
      c."CustomerId",
      c."Name",
      c."Email",
      c."Password",
      c."Country",
      c."City",
      c."Street",
      c."State",
      c."AdminState",
      STRING_AGG(cp."Phone", ',') AS "PhoneNumbers"
    FROM 
      "Customer" c
    INNER JOIN 
      "CPhone" cp ON c."CustomerId" = cp."CustomerId"
    WHERE 
      c."Email" = $1
    GROUP BY 
      c."CustomerId", 
      c."Name", 
      c."Email", 
      c."Password", 
      c."Country", 
      c."City", 
      c."Street", 
      c."State",
      c."AdminState"
  `, [email]);

  if(result.rows.length === 0){
    throw new CustomAPIError('Email or password wrong', StatusCodes.UNAUTHORIZED)
  }

  const user = result.rows[0];
  user.PhoneNumbers = user.PhoneNumbers ? user.PhoneNumbers.split(',') : [];

  const passIsMatch = await comparePassword(password, user.Password)
  if(!passIsMatch){
    throw new CustomAPIError('Password doesnt match', StatusCodes.UNAUTHORIZED)
  }

  if (!user.AdminState) {
    throw new CustomAPIError('Access restricted to business owners / administrators', StatusCodes.FORBIDDEN)
  }

  console.log(user)
  const token = createJWT(user.AdminState, user.CustomerId, user.Name)
  res.status(StatusCodes.OK).json({user, token})
}


module.exports = {
  login
}