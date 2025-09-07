const sql = require("mssql");

const dbConfig = {
  server: "DESKTOP-39J7HPU",
  user:"Ruxuis",
  password:"ParCore9@",         
  database: "HardWare",    
  options: {
    encrypt: false,                  
    trustServerCertificate: true,
    trustedConnection:false,
    enableArithAbort:true,
    instancename:"SQLEXPRESS",
  },
  port:1433
};



const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("Database connection failed: ", err);
    throw err;
  });

module.exports = poolPromise;