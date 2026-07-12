const CustomAPIError = require('../errors/custom-error')
const {StatusCodes} = require('http-status-codes')
const dbConnect = require('../db/dbconfig')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const createJWT = function (admin, _id, name){
  return jwt.sign({admin:admin ,customerId:_id, name:name}, process.env.JWT_SECRET, {expiresIn:process.env.JWT_LIFETIME})
}


const encryptPass = async function(pass){
  const salt = await bcrypt.genSalt(10)
  const password = await bcrypt.hash(pass, salt)
  return password
}

const comparePassword = async function (sentPass, originalPass){
  const res = await bcrypt.compare(sentPass, originalPass)
  return res
}

const register = async (req,res)=>{
  const {password, name, email, dob, country, city, street, state, zip, phoneNumbers} = req.body
  const pass = await encryptPass(password)
  const db = await dbConnect;

  // Coerce zip to integer or null — empty string fails INTEGER column
  const zipValue = zip !== '' && zip != null ? parseInt(zip, 10) : null;

  // Insert customer and return the generated CustomerId
  // Note: alias to "id" because pg lowercases all column names by default
  const insertCustomerResult = await db.query(`
    INSERT INTO "Customer" (
      "Password", 
      "Name", 
      "Email", 
      "DateOfBirth", 
      "Country", 
      "City", 
      "Street", 
      "State", 
      "ZIP",
      "AdminState"
    ) 
    VALUES (
      $1, 
      $2, 
      $3, 
      $4, 
      $5, 
      $6, 
      $7, 
      $8, 
      $9,
      1
    )
    RETURNING "CustomerId" AS id;
  `, [pass, name, email, dob, country, city, street, state, zipValue]);

  const customerId = insertCustomerResult.rows[0].id;

  for (const phoneNumber of phoneNumbers) {
    await db.query(`
      INSERT INTO "CPhone" ("CustomerId", "Phone")
      VALUES ($1, $2);
    `, [customerId, phoneNumber]);
  }

  await db.query(`INSERT INTO "Cart" ("CustomerId") VALUES ($1)`, [customerId]);

  const userResult = await db.query(`
    SELECT 
      "CustomerId"  AS "CustomerId",
      "Name"        AS "Name",
      "Email"       AS "Email",
      "Password"    AS "Password",
      "Country"     AS "Country",
      "City"        AS "City",
      "Street"      AS "Street",
      "State"       AS "State",
      "ZIP"         AS "ZIP",
      "AdminState"  AS "AdminState"
    FROM "Customer" 
    WHERE "Email" = $1
  `, [email]);

  const user = { ...userResult.rows[0], phoneNumbers };
  const token = createJWT(user.AdminState, user.CustomerId, user.Name);
  res.status(StatusCodes.CREATED).json({user, token});
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
  console.log(user)
  const token = createJWT(user.AdminState, user.CustomerId, user.Name)
  res.status(StatusCodes.OK).json({user, token})
}


module.exports = {
  register,
  login
}