const CustomAPIError = require('../errors/custom-error')
const { StatusCodes } = require('http-status-codes')
const dbConnect = require('../db/dbconfig')

const getAllProducts = async (req, res) => {
  const query = req.query;
  let queryKeys = Object.keys(query).length > 0 ? Object.keys(query) : null;
  let queryValues = Object.values(query);

  try {
    const db = await dbConnect;

    if (queryKeys) {
      if (queryKeys.includes('Name')) {
        const nameIndex = queryKeys.indexOf('Name');
        const result = await db.query(`        
          SELECT p."ProductId", p."Name", p."Brand", p."Price", p."Category",
                 STRING_AGG(encode(i."Img", 'hex'), ',') AS "Images"
          FROM "Product" p
          LEFT JOIN "Product_IMG" i ON p."ProductId" = i."ProductId"
          WHERE p."Name" ILIKE $1 AND p."Category" IN (
            'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
          )
          GROUP BY p."ProductId", p."Name", p."Brand", p."Price", p."Category"
        `, [`%${queryValues[nameIndex]}%`]);

        const processedProducts = result.rows.map(Product => {
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

      const queryParams = [];
      let queryText = `
        SELECT p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", p."StockQuantity", 
              p."Category", p."ReleaseDate",
              STRING_AGG(encode(i."Img", 'hex'), ',') AS "Images"
        FROM "Product" p
        LEFT JOIN "Product_IMG" i ON p."ProductId" = i."ProductId"
        WHERE p."Category" IN (
          'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
        )
      `;

      let paramCount = 0;
      for (let i = 0; i < queryKeys.length; i++) {
        const key = queryKeys[i];
        if (key !== 'ORDER BY') {
          paramCount++;
          // Escaping key in double quotes to match Postgres casing
          queryText += ` AND p."${key}" = $${paramCount}`;
          queryParams.push(queryValues[i]);
        }
      }

      queryText += ` GROUP BY p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", p."StockQuantity", 
                              p."ReleaseDate", p."Category"`;

      if (queryKeys.includes('ORDER BY')) {
        const orderByVal = queryValues[queryKeys.indexOf('ORDER BY')];
        const parts = orderByVal.trim().split(/\s+/);
        if (parts.length > 0) {
          const col = parts[0];
          const dir = parts[1] || '';
          queryText += ` ORDER BY p."${col}" ${dir}`;
        }
      }

      const result = await db.query(queryText, queryParams);

      const processedProducts = result.rows.map(Product => {
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
      const result = await db.query(`
        SELECT p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", p."StockQuantity", 
               p."Category", p."ReleaseDate",
               STRING_AGG(encode(i."Img", 'hex'), ',') AS "Images"
        FROM "Product" p
        LEFT JOIN "Product_IMG" i ON p."ProductId" = i."ProductId"
        WHERE p."Category" IN (
          'GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE'
        )
        GROUP BY p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", p."StockQuantity", 
                 p."ReleaseDate", p."Category"
      `);

      const processedProducts = result.rows.map(Product => {
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

    const result = await db.query(`
      SELECT p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", p."StockQuantity", 
             p."Category", p."ReleaseDate",
             STRING_AGG(encode(i."Img", 'hex'), ',') AS "Images"
      FROM "Product" p
      LEFT JOIN "Product_IMG" i ON p."ProductId" = i."ProductId"
      WHERE p."ProductId" = $1
      GROUP BY p."ProductId", p."Name", p."Brand", p."Description", p."Rating", p."Price", 
               p."StockQuantity", p."Category", p."ReleaseDate"
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
    }

    const Product = result.rows[0];
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