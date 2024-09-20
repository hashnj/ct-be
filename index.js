const express=require ('express')
const {userRouter} =require('./routes/user')
const cors=require('cors');
const { Users, Products, Categories, OrderItems, Review, SubCategories, ShippingAddress } = require('./db');
const ProductRouter = require('./routes/product');
const categoryRouter = require('./routes/category');
const authenticateToken = require('./middlewares/auth');

const app=express();

app.use(cors());
app.use(express.json());

app.use('/user',userRouter);
app.use('/products',ProductRouter);
app.use('/categories',categoryRouter);
app.post('/data',authenticateToken,async (req,res)=>{
    try {
        const userId = req.user.userId;
        console.log(userId);
        const [users,address, products, categories,subCategories, orders, reviews] = await Promise.all([
            Users.find({}),
            ShippingAddress.find({user_id:userId}),
            Products.find({}),
            Categories.find({}),
            SubCategories.find({}),
            OrderItems.find({}),
            Review.find({})
        ]);
        console.log(users,address, products, categories, orders, reviews);
        return res.json({users, address, products, categories,subCategories, orders, reviews});
    } catch (error) {
        console.error("Error fetching data:", error);
    }

})



app.listen(3000,()=>{
    console.log('listening on http://localhost:3000')
})
