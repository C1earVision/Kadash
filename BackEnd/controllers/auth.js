const CustomAPIError = require('../errors/custom-error')
const {StatusCodes} = require('http-status-codes')
const dbConnect = require('../db/dbconfig')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const sql = require('mssql');

const createJWT = function (admin, _id, name){
  return jwt.sign({admin:admin ,customerId:_id, name:name}, process.env.JWT_SECRET, {expiresIn:process.env.JWT_LIFETIME})
}


const encryptPass = async function(pass){
  const salt = await bcrypt.genSalt(10)
  password = await bcrypt.hash(pass, salt)
  return password
}

const comparePassword = async function (sentPass, originalPass){
  const res = await bcrypt.compare(sentPass, originalPass)
  return res
}

const register = async (req,res)=>{
  const {password, name, email, dob, country, city, street, state, zip, phoneNumbers} = req.body
  pass = await encryptPass(password)
  const db = await dbConnect;

  await db.request()
  .input('Password', sql.VarChar, pass)  
  .input('Name', sql.VarChar, name)         
  .input('Email', sql.VarChar, email)         
  .input('DateOfBirth', sql.Date, dob)       
  .input('Country', sql.VarChar, country)   
  .input('City', sql.VarChar, city)           
  .input('Street', sql.VarChar, street)       
  .input('State', sql.VarChar, state)       
  .input('ZIP', sql.Int, zip)                  
  .query(`
    INSERT INTO Customer (
      Password, 
      Name, 
      Email, 
      DateOfBirth, 
      Country, 
      City, 
      Street, 
      [State], 
      ZIP
    ) 
    VALUES (
      @Password, 
      @Name, 
      @Email, 
      @DateOfBirth, 
      @Country, 
      @City, 
      @Street, 
      @State, 
      @ZIP
    );
  `);


  const user = await db.request()
  .input('Email', sql.VarChar, email)
  .query(`SELECT * FROM Customer WHERE email = @Email`)
  
  phoneNumbers.forEach(async phoneNumber => {
    await db.request()
    .input('CustomerId', sql.Int, user.recordset[0].CustomerId)  
    .input('Phone', sql.Int, phoneNumber)                      
    .query(`
      INSERT INTO CPhone
      VALUES (
        @CustomerId,
        @Phone
      );
    `);
  });
  await db.request()
  .input('CustomerId', sql.Int, user.recordset[0].CustomerId)
  .query("INSERT INTO Cart VALUES (@CustomerId)")
  user.recordset[0] = {...user.recordset[0], phoneNumbers}
  const token = createJWT(user.recordset[0].AdminState, user.recordset[0].CustomerId, user.recordset[0].Name)
  res.status(StatusCodes.CREATED).json({user:user.recordset[0], token})
}

const login = async (req,res)=>{
  const {email ,password} = req.body
  const db = await dbConnect;
  const user = await db.request()
  .input('Email', sql.NVarChar, email)
  .query(`
    SELECT 
      c.CustomerId,
      c.Name,
      c.Email,
      c.Password,
      c.Country,
      c.City,
      c.Street,
      c.State,
      c.AdminState,
      STRING_AGG(cp.Phone, ',') AS PhoneNumbers
    FROM 
      Customer c
    INNER JOIN 
      CPhone cp ON c.CustomerId = cp.CustomerId
    WHERE 
      c.Email = @Email
    GROUP BY 
      c.CustomerId, 
      c.Name, 
      c.Email, 
      c.Password, 
      c.Country, 
      c.City, 
      c.Street, 
      c.State,
      c.AdminState
  `);

  user.recordset[0].PhoneNumbers = user.recordset[0].PhoneNumbers.split(',')
  if(!user){
    throw new CustomAPIError('Email or password wrong', StatusCodes.UNAUTHORIZED)
  }
  

  const passIsMatch = await comparePassword(password, user.recordset[0].Password)
  if(!passIsMatch){
    throw new CustomAPIError('Password doesnt match', StatusCodes.UNAUTHORIZED)
  }
  console.log(user.recordset[0])
  const token = createJWT(user.recordset[0].AdminState, user.recordset[0].CustomerId, user.recordset[0].Name)
  res.status(StatusCodes.OK).json({user:user.recordset[0], token})
}


module.exports = {
  register,
  login
}