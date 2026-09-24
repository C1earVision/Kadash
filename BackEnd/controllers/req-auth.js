const CustomAPIError = require('../errors/custom-error')
const { StatusCodes } = require('http-status-codes')
const dbConnect = require('../db/dbconfig')

const addProduct = async (req, res) => {
  const { admin } = req.user;
  const { name, brand, desc, rating, price, sq, category, imgs, releaseDate } = req.body;
  console.log(`admin status ${admin}`)
  console.log(req.body)
  if (!admin) {
    throw new CustomAPIError('This user has no access to this route', StatusCodes.UNAUTHORIZED);
  }

  if (!imgs || imgs.length === 0) {
    throw new CustomAPIError('At least one image is required', StatusCodes.BAD_REQUEST);
  }

  const allowedCategories = ['GPU', 'CPU', 'STORAGE', 'MEMORY', 'MOTHERBOARD', 'CPU COOLER', 'POWER SUPPLY', 'CASE'];

  if (!allowedCategories.includes(category?.toUpperCase())) {
    throw new CustomAPIError('Invalid category. Must be one of: ' + allowedCategories.join(', '), StatusCodes.BAD_REQUEST);
  }

  try {
    const db = await dbConnect;

    const productResult = await db.query(`
      INSERT INTO "Product" 
      ("Name", "Brand", "Description", "Rating", "Price", "StockQuantity", "Category", "ReleaseDate")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "ProductId"
    `, [name, brand, desc, rating, price, sq, category.toUpperCase(), releaseDate]);

    const productId = productResult.rows[0].ProductId;

    for (let img of imgs) {
      const imgData = Buffer.isBuffer(img) ? img : Buffer.from(img);
      await db.query(`
        INSERT INTO "Product_IMG" ("ProductId", "Img") 
        VALUES ($1, $2)
      `, [productId, imgData]);
    }

    res.status(StatusCodes.OK).send('Product added successfully');
  } catch (err) {
    console.error("Error adding Product: ", err);
    throw new CustomAPIError('Error adding the Product to the database', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const modifyProduct = async (req, res) => {
  const { params: { id }, user: { admin } } = req;
  const update = req.body; 
  const files = req.files;

  if (!admin) {
    throw new CustomAPIError('this user has no access to this route', StatusCodes.UNAUTHORIZED);
  }

  const db = await dbConnect;
  const key = Object.keys(update)[0];
  const value = update[key];

  if (key === 'Category') {
    const allowedCategories = ['GPU', 'CPU', 'STORAGE', 'MEMORY', 'MOTHERBOARD', 'CPU COOLER', 'POWER SUPPLY', 'CASE'];
    if (!allowedCategories.includes(value.toUpperCase())) {
      return res.status(StatusCodes.BAD_REQUEST).send('Invalid category value');
    }

    const result = await db.query(
      `UPDATE "Product" SET "Category" = $1 WHERE "ProductId" = $2`,
      [value.toUpperCase(), id]
    );

    if (result.rowCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).send('Product not found');
    }

    return res.status(StatusCodes.OK).send('Product category updated');

  } else if (files && files.image0) {
    const image = files.image0[0];  
    const imageBuffer = image.buffer;  
    if (!imageBuffer) {
      return res.status(StatusCodes.BAD_REQUEST).send('No image data provided');
    }

    try {
      const result = await db.query(`
        UPDATE "Product_IMG"
        SET "Img" = $1
        WHERE "ProductId" = $2
      `, [imageBuffer, id]);

      if (result.rowCount === 0) {
        return res.status(StatusCodes.NOT_FOUND).send('Product image not found');
      }

      return res.status(StatusCodes.OK).send('Product image updated');

    } catch (error) {
      console.error('Error updating image:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Failed to update image');
    }

  } else {
    const result = await db.query(
      `UPDATE "Product" SET "${key}" = $1 WHERE "ProductId" = $2`,
      [value, id]
    );

    if (result.rowCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).send('Product not found');
    }

    return res.status(StatusCodes.OK).send('Product updated');
  }
};

const modifyAdminAccess = async (req, res) => {
  const { params: { id }, user: { admin } } = req
  if (!admin) {
    throw new CustomAPIError('this user has no access to this route', StatusCodes.UNAUTHORIZED)
  }
  const db = await dbConnect;
  const userResult = await db.query(
    `SELECT "CustomerId", "AdminState" FROM "Customer" WHERE "CustomerId" = $1`,
    [id]
  );
  
  if (userResult.rows.length === 0) {
    throw new CustomAPIError('User not found', StatusCodes.NOT_FOUND)
  }

  const adminState = userResult.rows[0].AdminState === 0 ? 1 : 0
  await db.query(
    `UPDATE "Customer" SET "AdminState" = $1 WHERE "CustomerId" = $2`,
    [adminState, userResult.rows[0].CustomerId]
  );
  res.status(StatusCodes.OK).send('Admin State Changed Successfully')
}

const deleteProduct = async (req, res) => {
  const { params: { id }, user: { admin } } = req
  if (!admin) {
    throw new CustomAPIError('this user has no access to this route', StatusCodes.UNAUTHORIZED)
  }
  const db = await dbConnect;
  await db.query(`DELETE FROM "Product" WHERE "ProductId" = $1`, [id]);
  res.status(StatusCodes.OK).send('product deleted succesfully')
}

const getOrders = async (req, res) => {
  const { user: { admin } } = req
  if (!admin) {
    throw new CustomAPIError('this user has no access to this route', StatusCodes.UNAUTHORIZED)
  }
  const db = await dbConnect;
  
  let queryText = `
    SELECT
      p."Name" AS "ProductName",
      p."Price" AS "ProductPrice",
      oi."Price" AS "TotalOrderPrice",
      oip."Quantity",
      o."CustomerId",
      o."OrderId",
      o."OrderDate",
      o."Status"
    FROM "TheOrder" o
    INNER JOIN "OrderItem" oi ON o."OrderId" = oi."OrderId"
    INNER JOIN "OrderItemProducts" oip ON oi."OrderItemId" = oip."OrderItemId"
    INNER JOIN "Product" p ON oip."ProductId" = p."ProductId"
  `;

  const ordersResult = await db.query(queryText);
  const recordset = ordersResult.rows;
  
  const groupedOrders = recordset.reduce((acc, order) => {
    const { OrderId, ProductName, CustomerId, ProductPrice, TotalOrderPrice, OrderDate, Quantity, Status } = order;
  
    const existingOrder = acc.find((group) => group.OrderId === OrderId);
  
    if (existingOrder) {
      existingOrder.Products.push({
        ProductName,
        ProductPrice,
        Quantity
      });
    } else {
      acc.push({
        OrderId,
        CustomerId,
        TotalOrderPrice,
        OrderDate,
        Status,
        Products: [
          {
            ProductName,
            ProductPrice,
            Quantity
          }
        ]
      });
    }
  
    return acc;
  }, []);  

  const addresses = [];
  
  await Promise.all(groupedOrders.map(async (order) => {
    const address = await db.query(
      `SELECT "Country", "City", "State", "Street" FROM "Customer" WHERE "CustomerId" = $1`,
      [order.CustomerId]
    );
    addresses.push(address.rows[0]);
  }));

  console.log(addresses);
  res.status(StatusCodes.OK).send({ groupedOrders, addresses });
}

const updateOrderStatus = async (req, res)=>{
  const { status, orderId } = req.body
  const db = await dbConnect;
  await db.query(
    `UPDATE "TheOrder" SET "Status" = 'DELIVERED' WHERE "OrderId" = $1`,
    [orderId]
  );
  res.status(StatusCodes.OK).send('Status Has Been Updated Successfully')
}

module.exports = {
  addProduct,
  deleteProduct,
  modifyProduct,
  modifyAdminAccess,
  getOrders,
  updateOrderStatus
}