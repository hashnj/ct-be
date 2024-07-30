const express = require('express');
const { Products, ProductImages, Categories, SubCategories, Vendors, WishList, Cart } = require('../db');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/auth');

const ProductRouter = express.Router();

const jwt_secret = 'secret';

ProductRouter.post('/add', async (req, res) => {
    const { body, headers } = req;
    const authHeader = headers.authorization;

    if (!authHeader) {
        return res.status(401).json('Provide auth key');
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;

    try {
        decodedToken = jwt.verify(token, jwt_secret);
    } catch (err) {
        return res.status(401).json('Invalid auth key');
    }

    let category_id;
    try {
        const category = await Categories.findOne({ name: body.product.category });
        const subCategory = await SubCategories.findOne({ name: body.product.category });

        if (category) {
            category_id = category._id;
        } else if (subCategory) {
            category_id = subCategory.parent_id;
        } else {
            return res.status(404).json({ error: 'Category not found' });
        }

        const product = await Products.create({
            category_id,
            vendor_id: decodedToken.userId,
            name: body.product.name,
            description: body.product.description,
            mrp: body.product.mrp,
            price: body.product.price,
            stock: body.product.stock,
        });

        const img = await ProductImages.create({
            product_id: product._id,
            image_url: body.product.image,
        });

        res.status(201).json({ product, img });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.put('/', authenticateToken, async (req, res) => {
    const { name, description, mrp, price, stock, image } = req.body.item;
    try {
        const updated = await Products.findOneAndUpdate(
            { $or: [{ name }, { description }] },
            { name, description, mrp, price, stock }
        );
        await ProductImages.findOneAndUpdate(
            { product_id: updated._id },
            { image_url: image[0] }
        );
        res.json({ yay: "yay" });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.post('/cart', authenticateToken, async (req, res) => {
    try {
        const { list } = req.body;
        const { userId } = req.user;
        
        const exists = await Cart.findOne({ user_id: userId });
        const qry = exists
            ? await Cart.findOneAndUpdate({ user_id: userId }, { product_id: list })
            : await Cart.create({ user_id: userId, product_id: list });

        res.json({ qry });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.get('/cart', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const qry = await Cart.find({ user_id: userId });
        res.json({ qry });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.post('/wish', authenticateToken, async (req, res) => {
    try {
        const { list } = req.body;
        const { userId } = req.user;
        // console.log(list,userId);
        const exists = await WishList.findOne({ user_id: userId });
        const qry = exists
            ? await WishList.findOneAndUpdate({ user_id: userId }, { product_id: list })
            : await WishList.create({ user_id: userId, product_id: list });

        res.json({ qry });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.get('/wish', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const qry = await WishList.find({ user_id: userId });
        res.json({ qry });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

ProductRouter.get('/', async (req, res) => {
    try {
        const products = await Products.find({})
            .populate('category_id', 'name')
            .populate('vendor_id', 'business_name');

        const productsWithImages = await Promise.all(products.map(async (product) => {
            const images = await ProductImages.find({ product_id: product._id });
            return {
                ...product.toObject(),
                images: images.map(img => img.image_url)
            };
        }));

        res.status(200).json({ data: productsWithImages });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = ProductRouter;
