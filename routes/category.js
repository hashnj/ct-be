const express = require('express');
const { SubCategories, Categories } = require('../db');
const jwt = require('jsonwebtoken');
const z = require('zod');
const authenticateToken = require('../middlewares/auth')

const categoryRouter = express.Router();

const jwt_secret = 'secret';


const CategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    isSubCategory: z.boolean()
});

const SubCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    parent: z.string().min(1, 'Parent category is required'),
    isSubCategory: z.boolean()
});

categoryRouter.post('/', authenticateToken, async (req, res) => {
    const body = req.body;
    console.log(body);

    try {
        if(body.category.isSubCategory){
            const result = SubCategorySchema.safeParse(body.category);
            if (!result.success){
                return res.status(400).json({"error":result.error.errors,"no":"no"});
            }

            const parentName = body.category.parent;
            const parentCategory = await Categories.findOne({ name: parentName });

            if (!parentCategory) {
                return res.status(404).json({ error: 'Parent category not found' });
            }

            const subCategory = await SubCategories.create({
                name: body.category.name,
                description: body.category.description,
                parent_id: parentCategory._id
            });

            return res.status(201).json({ created: `${subCategory.name} subcategory` });
        }
        else if (!body.category.isSubCategory) {
            const result = CategorySchema.safeParse(body.category);
            if (!result.success) {
                return res.status(400).json(result.error.errors);
            }

            const find = await Categories.findOne({ name: body.category.name });
            if (find) {
                return res.status(409).json('Category already exists');
            }

            const category = await Categories.create({
                name: body.category.name,
                description: body.category.description
            });

            return res.status(201).json({ created: `${category.name} category` });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



categoryRouter.put('/',authenticateToken, async (req,res)=>{
    const role=req.user.role
    if(role=='Admin'){
    const {category,parent,description}=req.body.item;
    try{
        if(parent){
            console.log(parent);
            const p = await Categories.find({name:parent});
            if(p){
                console.log(p);
                const c = await SubCategories.findOneAndUpdate({$or:[
                    {parent_id:p._id},
                    {name:category},
                    {description}
                ]},{
                    parent_id:p._id,
                    name:category,
                    description
                });
            if(c){
                console.log(c);
                return res.status(201).json({message:'updated'})
            }
            return res.status(409).json({error:'No Subcategory found'})
            }
            return res.status(409).json({error:'No Parent category found'})
        }else{
            const c = await Categories.findOneAndUpdate({$or:[
                {name:category},
                {description}
            ]},{
                name:category,
                description
            })
            if(c){
                
                return res.status(201).json({message:'updated'})
            }
            return res.status(409).json({error:'No category found'})
        }
    }
    catch(e){
        console.log(e);
    }
    }
    else{
        return res.status(403).json({error:'You need to be an admin to edit Categories'});
    }

})




categoryRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const categories = await Categories.find({});
        const subCategories = await SubCategories.find({});
        return res.json({ categories, subCategories });
    } catch (error) {
        console.error('Error fetching categories and sub-categories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = categoryRouter;
