const express = require('express');
const { Products, ProductImages, Categories, SubCategories, Vendors, WishList, Cart } = require('../db');
const jwt = require('jsonwebtoken');
const z = require('zod');
const authenticateToken = require('../middlewares/auth');

const ProductRouter = express.Router();

const jwt_secret = 'secret';

ProductRouter.post('/add', async (req, res) => {
    console.log('dikkat')
    console.log(req.body);

    const body = req.body;
    const headers = req.headers.authorization;
    console.log(headers,'headers');

    if (!headers) {
        return res.status(401).json('Provide auth key');
    }

    const token = headers.split(' ')[1];
    let decodedToken;

    try {
        decodedToken = jwt.verify(token, jwt_secret);
        console.log(decodedToken,"token");
    } catch (err) {
        return res.status(401).json('Invalid auth key');
    }

    let category_id;
    if (body.product.category) {
        const cat = await Categories.findOne({ name: body.product.category });
        const subCat = await SubCategories.findOne({ name:body.product.category });
        if (cat) {
            console.log(cat._id,"2");
            category_id = cat._id;
        } else if(subCat){
            console.log(subCat._id,'3');
            category_id =  subCat.parent_id;
            const catt = await Categories.findById(category_id);
            console.log(catt,"jm",category_id)
        }
        else{
            console.error("Category not found");
            return res.status(404).json({ error: 'Category not found' });
        }
    }

    try {
        const product = await Products.create({
            category_id,
            vendor_id: decodedToken.userId,
            name: body.product.name,
            description: body.product.description,
            mrp:body.product.mrp,
            price: body.product.price,
            stock: body.product.stock
        });
        console.log(product)

        const img = await ProductImages.create({
            product_id: product._id,
            image_url: body.product.image,
        });

        res.status(201).json({ product, img });
    } catch (error) {
        console.log(error+'  this');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



ProductRouter.put('/',authenticateToken,async ( req , res ) => {
    const {name,description,mrp,price,stock,image}=req.body.item;
    try{
    const updated= await Products.findOneAndUpdate({$or:[
        {name:name},
        {description:description}
    ]},{
        name,
        description,
        mrp,
        price,
        stock
    });
    const up=await ProductImages.findOneAndUpdate({
        product_id:updated._id
    },{
      image_url:image[0] 
    })
    console.log(updated);
    return res.json({yay:"yay"});
}
catch(e){
    console.log(e);
}
})


ProductRouter.post('/cart', authenticateToken , async (req,res)=>{
    try{
        const body=req.body;
        const user=req.user;
        
        const exists = await Cart.findOne({user_id:user.userId});
        let qry;
        if(exists){
            qry =await Cart.findOneAndUpdate({user_id:user.userId},{product_id:body.list})
        }
        else{
        qry= await Cart.create({user_id:user.userId,product_id:body.list});
        }
        console.log(qry);
        return res.json({qry});
    }
    catch(e){
        console.log(e);
    }
})


ProductRouter.get('/cart', authenticateToken , async (req,res)=>{
    try{
        
        const user=req.user;
        
        const qry= await Cart.find({user_id:user.userId});
        console.log(qry);
        return res.json({qry});
    }
    catch(e){
        console.log(e);
    }
})
ProductRouter.post('/wish', authenticateToken , async (req,res)=>{
    try{
        const body=req.body;
        const user=req.user;
        
        const exists = await Cart.findOne({user_id:user.userId});
        let qry;
        if(exists){
            qry =await Cart.findOneAndUpdate({user_id:user.userId},{product_id:body.list})
        }
        else{
        qry= await Cart.create({user_id:user.userId,product_id:body.list});
        }
        console.log(qry);
        return res.json({qry});
    }
    catch(e){
        console.log(e);
    }
})


ProductRouter.get('/wish', authenticateToken , async (req,res)=>{
    try{
        
        const user=req.user;
        
        const qry= await WishList.find({user_id:user.userId});
        console.log(qry);
        return res.json({qry});
    }
    catch(e){
        console.log(e);
    }
})


ProductRouter.get('/', async (req, res) => {
    try {
        const products = await Products.find({})
            .populate('category_id', 'name')
            .populate('vendor_id','business_name')
            

        const productsWithImages = await Promise.all(products.map(async (product) => {
            const images = await ProductImages.find({ product_id: product._id });
            return {
                ...product.toObject(),
                images: images.map(img => img.image_url)
            };
        }));
        res.status(200).json({ data: productsWithImages });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

});

module.exports = ProductRouter;

