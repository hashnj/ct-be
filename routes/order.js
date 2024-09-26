const express = require('express');
const authenticateToken = require('../middlewares/auth');
const { OrderItems, Orders, Payment, ShippingAddress, Products, Cart } = require('../db');

const OrderRouter = express.Router();

OrderRouter.post('/buy', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { product, quantity, price, address } = req.body;

  try {
    const productData = await Products.findById(product);
    if (!productData) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (productData.stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock' });
    }

    const totalAmount = quantity * price;

    const newOrder = await Orders.create({
      user_id: userId,
      status: 'Shipped',
      total_amount: totalAmount,
    });

    const newOrderItem = await OrderItems.create({
      order_id: newOrder._id,
      product_id: product, 
      quantity: quantity,
      price: price,
    });


    

    const payment = await Payment.create({
      order_id: newOrder._id,
      amount: totalAmount,
      payment_method: 'Visa', 
      status: 'Paid', 
    });

    productData.stock -= quantity;
    await productData.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder,
      orderItem: newOrderItem,
      payment,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong', error });
  }
});


OrderRouter.post('/cart', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { address } = req.body;

  try {
    const cart = await Cart.findOne({ user_id: userId });

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let totalAmount = 0;
    const inStockItems = [];
    const outOfStockItems = [];

    for (let cartItem of cart.products) {
      const product = await Products.findById(cartItem.product_id);

      if (!product) {
        return res.status(400).json({ message: 'Product not found' });
      }

      const quantity = cartItem.quantity;

      if (product.stock < quantity) {
        outOfStockItems.push(cartItem);
      } else {
        inStockItems.push(cartItem);
        totalAmount += product.price * quantity;
      }
    }

    if (inStockItems.length === 0) {
      return res.status(400).json({ message: 'No items are available in stock to order' });
    }

    const newOrder = await Orders.create({
      user_id: userId,
      status: 'Shipped',  
      total_amount: totalAmount,
      address: {
        address: address.rel,
        postal_code: address.postal_code,
        city: address.city,
        state: address.state,
        country: address.country,
      }
    });

    for (let cartItem of inStockItems) {
      const product = await Products.findById(cartItem.product_id);
      const quantity = cartItem.quantity;
      const price = product.price;

      await OrderItems.create({
        order_id: newOrder._id,
        product_id: product._id,
        quantity: quantity,
        price: price,
      });

      product.stock -= quantity;
      await product.save();
    }

    const payment = await Payment.create({
      order_id: newOrder._id,
      amount: totalAmount,
      payment_method: 'Visa',  
      status: 'Paid',
    });

    cart.products = outOfStockItems;
    await cart.save();

    res.json({ 
      order: newOrder, 
      message: "Order placed for in-stock items. Out-of-stock items remain in the cart.",
      remainingCart: outOfStockItems,
    });

  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = OrderRouter;
