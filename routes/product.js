const express = require('express');
const { Products, ProductImages, Categories, SubCategories, Vendors, WishList, Cart } = require('../db');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/auth');

const ProductRouter = express.Router();

const jwt_secret = 'secret';

ProductRouter.post('/add', authenticateToken, async (req, res) => {
    const { product } = req.body;
    const { userId } = req.user;

    try {
        const category = await Categories.findById(product.category_id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const newProduct = await Products.create({
            ...product,
            vendor_id: userId,
        });

        await ProductImages.create({
            product_id: newProduct._id,
            image_url: product.image,
        });

        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ProductRouter.post('/add', async (req, res) => {
//     const { body, headers } = req;
//     const authHeader = headers.authorization;

//     if (!authHeader) {
//         return res.status(401).json('Provide auth key');
//     }

//     const token = authHeader.split(' ')[1];
//     let decodedToken;

//     try {
//         decodedToken = jwt.verify(token, jwt_secret);
//     } catch (err) {
//         return res.status(401).json('Invalid auth key');
//     }

//     let category_id;
//     try {
//         const category = await Categories.findOne({ name: body.product.category });
//         const subCategory = await SubCategories.findOne({ name: body.product.category });

//         if (category) {
//             category_id = category._id;
//         } else if (subCategory) {
//             category_id = subCategory.parent_id;
//         } else {
//             return res.status(404).json({ error: 'Category not found' });
//         }

//         const product = await Products.create({
//             category_id,
//             vendor_id: decodedToken.userId,
//             name: body.product.name,
//             description: body.product.description,
//             mrp: body.product.mrp,
//             price: body.product.price,
//             stock: body.product.stock,
//         });

//         const img = await ProductImages.create({
//             product_id: product._id,
//             image_url: body.product.image,
//         });

//         res.status(201).json({ product, img });
//     } catch (error) {
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });


// ProductRouter.put('/update/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;
//     const { product } = req.body;

//     try {
//         const updatedProduct = await Products.findByIdAndUpdate(id, product, { new: true });

//         if (!updatedProduct) {
//             return res.status(404).json({ error: 'Product not found' });
//         }

//         res.status(200).json({ message: 'Product updated', product: updatedProduct });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });



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
        // console.log(list)
        
        const exists = await Cart.findOne({ user_id: userId });
        const qry = exists
            ? 
            await Cart.findOneAndUpdate({ user_id: userId }, { products: list } )
            : 
            await Cart.create({ user_id: userId, products: list });

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
            .populate({
                path: 'category_id',
                select: 'name description parent_id',
                populate: { 
                    path: 'parent_id', 
                    select: 'name' 
                } 
            })
            .populate('vendor_id', 'business_name address contact'); // Extended vendor details if available

        const productsWithImages = await Promise.all(products.map(async (product) => {
            const images = await ProductImages.find({ product_id: product._id });
            const categoryName = product.category_id?.name;
            const parentCategoryName = product.category_id?.parent_id?.name || null;
            
            return {
                ...product.toObject(),
                category: {
                    name: categoryName,
                    parent: parentCategoryName,
                },
                vendor: product.vendor_id?.business_name || 'Unknown Vendor',
                images: images.map(img => img.image_url),
            };
        }));

        res.status(200).json({ data: productsWithImages });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = ProductRouter;
