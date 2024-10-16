const express = require('express');
const { Review , Orders, OrderItems, Users } = require('../db'); // Assuming Reviews is part of your DB models
const authenticateToken = require('../middlewares/auth');

const ReviewRouter = express.Router();


ReviewRouter.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product_id: productId }).populate('user_id');
    console.log({reviews});
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

ReviewRouter.get('/hasBought/:productId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  // console.log(userId,productId);
  try {
    const order_id = await Orders.find({
      user_id: userId
    })
    const orderItem = await OrderItems.findOne({
      product_id: productId,
      order_id,
    });
    res.json(!!orderItem); 
  } catch (error) {
    console.error("Error checking purchase status:", error);
    res.status(500).json({ message: 'Error checking purchase status' });
  }
});

ReviewRouter.post('/:productId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  const { comment, rating } = req.body;
  console.log(userId,productId,comment,rating);
  try {
    const newReview = await Review.create({
      product_id: productId,
      user_id: userId,
      comment,
      rating,
      created_at: new Date(),
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ message: 'Error posting review' });
  }
});


module.exports = ReviewRouter;
