const express = require('express');
const authenticateToken = require('../middlewares/auth');
const { OrderItems, Orders, Payment, ShippingAddress, Products } = require('../db');

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

module.exports = OrderRouter;
