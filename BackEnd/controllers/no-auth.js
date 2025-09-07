const CustomAPIError = require('../errors/custom-error')
const { StatusCodes } = require('http-status-codes')
const dbConnect = require('../db/dbconfig')
const sql = require('mssql');


const getAllProducts = async (req, res) => {
  const query = req.query;
  let queryKeys = Object.keys(query).length > 0 ? Object.keys(query) : null;
  let queryValues = Object.values(query);

  try {
    const db = await dbConnect;

    if (queryKeys) {
      if (queryKeys.includes('Name')) {
        const nameIndex = queryKeys.indexOf('Name');
        const result = await db.request()
          .input('Name', sql.VarChar, `%${queryValues[nameIndex]}%`)
          .query(`        
            SELECT p.ProductId, p.Name, p.Brand, p.Price, p.Category,
                   STRING_AGG(CONVERT(VARCHAR(MAX), i.Img, 1), ',') AS Images
            FROM Product p
            LEFT JOIN Product_IMG i ON p.ProductId = i.ProductId
            WHERE p.Name LIKE @Name AND p.Category IN (
              'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
            )
            GROUP BY p.ProductId, p.Name, p.Brand, p.Price, p.Category
          `);

        const processedProducts = result.recordset.map(Product => {
          const images = Product.Images
            ? Product.Images.split(',').map((image) => {
                const cleanImage = image.startsWith('0x') ? image.slice(2) : image;
                return `data:image/png;base64,${Buffer.from(cleanImage, 'hex').toString('base64')}`;
              })
            : [];
          return { ...Product, Images: images };
        });

        res.status(StatusCodes.OK).json({ Products: processedProducts });
        return;
      }

      if (queryKeys.includes('ORDER_BY')) {
        const orderByIndex = queryKeys.indexOf('ORDER_BY');
        const key = queryKeys[orderByIndex].split('_').join(' ');
        const value = queryValues[orderByIndex].split('_').join(' ');
        queryKeys[orderByIndex] = key;
        queryValues[orderByIndex] = value;
      }

      const request = db.request();
      const result = await request
        .input('QueryValue', queryValues[0])
        .input('QueryValue2', queryValues[1])
        .input('QueryValue3', queryValues[2])
        .query(`
          SELECT p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, p.StockQuantity, 
                p.Category, p.ReleaseDate,
                STRING_AGG(CONVERT(VARCHAR(MAX), i.Img, 1), ',') AS Images
          FROM Product p
          LEFT JOIN Product_IMG i ON p.ProductId = i.ProductId
          WHERE p.Category IN (
            'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
          )
          ${queryKeys[0] !== 'ORDER BY' ? `AND ${queryKeys[0]} = @QueryValue` : ''}  
          ${queryKeys[1] && queryKeys[1] !== 'ORDER BY' ? `AND ${queryKeys[1]} = @QueryValue2` : ''} 
          ${queryKeys[2] && queryKeys[2] !== 'ORDER BY' ? `AND ${queryKeys[2]} = @QueryValue3` : ''} 
          GROUP BY p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, p.StockQuantity, 
                  p.ReleaseDate, p.Category
          ${queryKeys.includes('ORDER BY') ? `ORDER BY ${queryValues[queryKeys.indexOf('ORDER BY')]}` : ''} 
        `);

      const processedProducts = result.recordset.map(Product => {
        const images = Product.Images
          ? Product.Images.split(',').map((image) => {
              const cleanImage = image.startsWith('0x') ? image.slice(2) : image;
              return `data:image/png;base64,${Buffer.from(cleanImage, 'hex').toString('base64')}`;
            })
          : [];
        return { ...Product, Images: images };
      });

      res.status(StatusCodes.OK).json({ Products: processedProducts });
    } else {
      const request = db.request();
      const result = await request.query(`
        SELECT p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, p.StockQuantity, 
               p.Category, p.ReleaseDate,
               STRING_AGG(CONVERT(VARCHAR(MAX), i.Img, 1), ',') AS Images
        FROM Product p
        LEFT JOIN Product_IMG i ON p.ProductId = i.ProductId
        WHERE p.Category IN (
          'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
        )
        GROUP BY p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, p.StockQuantity, 
                 p.ReleaseDate, p.Category
      `);

      const processedProducts = result.recordset.map(Product => {
        const images = Product.Images
          ? Product.Images.split(',').map((image) => {
              const cleanImage = image.startsWith('0x') ? image.slice(2) : image;
              return `data:image/png;base64,${Buffer.from(cleanImage, 'hex').toString('base64')}`;
            })
          : [];
        return { ...Product, Images: images };
      });

      res.status(StatusCodes.OK).json({ Products: processedProducts });
    }
  } catch (err) {
    console.error("Error querying the database: ", err);
    throw new CustomAPIError('Error querying the database', StatusCodes.BAD_REQUEST);
  }
};



const getProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const db = await dbConnect;

    const result = await db.request().query(`
      SELECT p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, p.StockQuantity, 
             p.Category, p.ReleaseDate,
             STRING_AGG(CONVERT(VARCHAR(MAX), i.Img, 1), ',') AS Images
      FROM Product p
      LEFT JOIN Product_IMG i ON p.ProductId = i.ProductId
      WHERE p.ProductId = ${id}
      GROUP BY p.ProductId, p.Name, p.Brand, p.Description, p.Rating, p.Price, 
               p.StockQuantity, p.Category, p.ReleaseDate
    `);

    if (result.recordset.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
    }

    const Product = result.recordset[0];
    const imagesArray = Product.Images
      ? Product.Images.split(',').map(image => {
          const cleanImage = image.startsWith('0x') ? image.slice(2) : image;
          const base64Image = Buffer.from(cleanImage, 'hex').toString('base64');
          return `data:image/png;base64,${base64Image}`;
        })
      : [];

    res.status(StatusCodes.OK).json({
      Product: [
        {
          ...Product,
          Images: imagesArray,
        },
      ],
    });
  } catch (err) {
    console.error("Error querying the database: ", err);
    throw new CustomAPIError('Error querying the database', StatusCodes.BAD_REQUEST);
  }
};




module.exports = {
  getAllProducts,
  getProduct
}