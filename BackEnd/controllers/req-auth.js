const CustomAPIError = require('../errors/custom-error')
const { StatusCodes } = require('http-status-codes')
const dbConnect = require('../db/dbconfig')
const sql = require('mssql');



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

    const productId = await db.request()
      .input('Name', sql.VarChar, name)
      .input('Brand', sql.VarChar, brand)
      .input('Description', sql.VarChar, desc)
      .input('Rating', sql.Float, rating)
      .input('Price', sql.Int, price)
      .input('StockQuantity', sql.Int, sq)
      .input('Category', sql.VarChar, category.toUpperCase())
      .input('ReleaseDate', sql.VarChar, releaseDate)
      .query(`INSERT INTO Product 
        (Name, Brand, Description, Rating, Price, StockQuantity, Category, ReleaseDate)
        VALUES (@Name, @Brand, @Description, @Rating, @Price, @StockQuantity, @Category, @ReleaseDate);
        SELECT SCOPE_IDENTITY() AS ProductId`);

    for (let img of imgs) {
      await db.request()
        .input('ProductId', sql.Int, productId.recordset[0].ProductId)
        .input('Img', sql.VarChar, img)
        .query("INSERT INTO Product_IMG (ProductId, Img) VALUES (@ProductId, @Img)");
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

    const result = await db.request()
      .input('Category', sql.VarChar, value.toUpperCase())
      .input('ProductId', sql.Int, id)
      .query(`UPDATE Product SET Category = @Category WHERE ProductId = @ProductId`);

    if (result.rowsAffected[0] === 0) {
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
      const result = await db.request()
        .input('ProductId', sql.Int, id)
        .input('ImageBuffer', sql.VarBinary(sql.MAX), imageBuffer)
        .query(`
          UPDATE Product_IMG
          SET Img = @ImageBuffer
          WHERE ProductId = @ProductId
        `);

      if (result.rowsAffected[0] === 0) {
        return res.status(StatusCodes.NOT_FOUND).send('Product image not found');
      }

      return res.status(StatusCodes.OK).send('Product image updated');

    } catch (error) {
      console.error('Error updating image:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Failed to update image');
    }

  } else {
    const result = await db.request()
      .input(key, typeof value === 'number' ? sql.Int : sql.VarChar, value)
      .input('ProductId', sql.Int, id)
      .query(`UPDATE Product SET ${key} = @${key} WHERE ProductId = @ProductId`);

    if (result.rowsAffected[0] === 0) {
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
  user = await db.request()
    .input('CustomerId', id)
    .query(`SELECT CustomerId, AdminState FROM Customer WHERE CustomerId = @CustomerId`);
  const adimnState = user.recordset[0].AdminState == 0 ? 1 : 0
  await db.request()
    .input('AdminState', adimnState)
    .input('CustomerId', user.recordset[0].CustomerId)
    .query(`UPDATE Customer SET AdminState = @AdminState WHERE CustomerId = @CustomerId`);
  res.status(StatusCodes.OK).send('Admin State Changed Successfully')
}

const deleteProduct = async (req, res) => {
  const { params: { id }, user: { admin } } = req
  if (!admin) {
    throw new CustomAPIError('this user has no access to this route', StatusCodes.UNAUTHORIZED)
  }
  const db = await dbConnect;
  await db.request()
    .input('ProductId', id)
    .query("DELETE FROM Product WHERE ProductId = @ProductId");
  res.status(StatusCodes.OK).send('product deleted succesfully')
}

const addProductToCart = async (req, res) => {
  const { user: { customerId }, params: { id: productId }, body: { quantity } } = req
  const db = await dbConnect;
  cartId = await db.request()
    .input('CustomerId', customerId)
    .query("SELECT CartId FROM Cart WHERE CustomerId = @CustomerId");
  await db.request()
    .input('CartId', cartId.recordset[0].CartId)
    .input('Quantity', quantity)
    .input('ProductId', productId)
    .query("INSERT INTO CartItem VALUES (@Quantity, @CartId, @ProductId)");
  res.status(StatusCodes.OK).send('Product Added to Cart')
}

const getCartItems = async (req, res) => {
  const { customerId } = req.user;
  const db = await dbConnect;

  const cartIdResult = await db.request()
    .input('CustomerId', customerId)
    .query("SELECT CartId FROM Cart WHERE CustomerId = @CustomerId");

  const cartId = cartIdResult.recordset[0].CartId;

  const Products = await db.request()
    .input('CartId', cartId)
    .query(`
      SELECT 
        p.ProductId,
        p.Name, 
        p.Price,
        p.Brand,
        ci.Quantity
      FROM CartItem ci
      INNER JOIN Product p ON ci.ProductId = p.ProductId
      WHERE ci.CartId = @CartId
    `);

  res.status(StatusCodes.OK).json({ Products: Products.recordset });

}

const deleteCartItem = async (req, res) => {
  const { params: { id: productId }, user: { customerId } } = req
  const db = await dbConnect;
  cartId = await db.request()
    .input('CustomerId', customerId)
    .query("SELECT CartId FROM Cart WHERE CustomerId = @CustomerId");


  await db.request()
    .input('CartId', cartId.recordset[0].CartId)
    .input('ProductId', productId)
    .query("DELETE FROM CartItem WHERE CartId = @CartId AND ProductId = @ProductId");

  res.status(StatusCodes.OK).send('Product Deleted Successfully')
}

const placeOrder = async (req, res) => {
  const { user: { customerId }, body: {cartItems, total} } = req
  const db = await dbConnect;
  let orderId = await db.request()
    .input('CustomerId', customerId)
    .input('TotalAmount', total)
    .input('AmountPaid', total)
    .query(`
      INSERT INTO TheOrder (CustomerId, TotalAmount, AmountPaid)
      OUTPUT INSERTED.OrderId
      VALUES (@CustomerId, @TotalAmount, @AmountPaid)
    `);

  orderId = orderId.recordset[0].OrderId;

  let orderItemId = await db.request()
    .input('Price', total)
    .input('OrderId', orderId)
    .query(`
      INSERT INTO OrderItem
      OUTPUT INSERTED.OrderItemId
      VALUES (@Price, @OrderId)
    `);
  orderItemId = orderItemId.recordset[0].OrderItemId;


  cartItems.map(async (item)=>{
    await db.request()
    .input('OrderItemId', orderItemId)
    .input('ProductId', item.ProductId)
    .input('Quantity', item.Quantity)
    .query(`
      INSERT INTO OrderItemProducts
      VALUES (@OrderItemId, @ProductId, @Quantity)
    `);
  })

  
  res.status(StatusCodes.CREATED).send('Order Placed Successfully')
}


const getOrders = async (req, res) => {
  const { user: { customerId, admin } } = req
  const db = await dbConnect;
  const orders = await db.request()
    .input('CustomerId', customerId)
    .query(`
      SELECT
        p.Name AS ProductName,
        p.Price AS ProductPrice,
        oi.Price AS TotalOrderPrice,
        oip.Quantity,
        o.CustomerId,
        o.OrderId,
        o.OrderDate,
        o.Status
      FROM TheOrder o
      INNER JOIN OrderItem oi ON o.OrderId = oi.OrderId
      INNER JOIN OrderItemProducts oip ON oi.OrderItemId = oip.OrderItemId
      INNER JOIN Product p ON oip.ProductId = p.ProductId
      ${admin === 1 ? '': `WHERE o.CustomerId = @CustomerId`}
    `);
  
  const groupedOrders = orders.recordset.reduce((acc, order) => {
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
  if (admin) {
    const getAddresses = async () => {
      const addresses = [];
      
        await Promise.all(groupedOrders.map(async (order) => {
        const address = await db.request()
          .input('CustomerId', order.CustomerId)
          .query('SELECT Country, City, State, Street FROM Customer WHERE CustomerId = @CustomerId');
          
        addresses.push(address.recordset[0]);
      }));
  
      console.log(addresses);
      res.status(StatusCodes.OK).send({ groupedOrders, addresses });
    };
  
    getAddresses();
    return;
  }
  
  res.status(StatusCodes.OK).send(groupedOrders);
  
}

const updateOrderStatus = async (req, res)=>{
  const { status, orderId } = req.body
  const db = await dbConnect;
  await db.request()
  .input('OrderId', orderId)
  .query(`UPDATE TheOrder SET Status = 'DELIVERED' WHERE OrderId = @OrderId`)
  res.status(StatusCodes.OK).send('Status Has Been Updated Successfully')
}


const addReview = async (req, res) => {
  const {id:productId} = req.params
  const {rating, comment} = req.body
  const db = await dbConnect;

  await db.request()
    .input('ProductId', productId)
    .input('Rating', rating)
    .input('Comment', comment)
    .query("INSERT INTO Review (ProductId, Rating, Comment) VALUES (@ProductId, @Rating, @Comment)");
    res.status(StatusCodes.OK).send('Review Added Successfully')
}

module.exports = {
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
}