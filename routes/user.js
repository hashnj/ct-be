const express = require('express');
const { Users, Vendors  } = require('../db');
const jwt = require('jsonwebtoken');
const z = require('zod');

const userRouter = express.Router();

const jwt_secret = 'secret';

const userValidationSchema = z.object({
    userName: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(10,{message:"minimum 10 required"}),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
    role:z.string().optional(),
    address:z.string().optional()
});

userRouter.post('/signup', async (req, res) => {
    const body = req.body;
    console.log(body);

    const validationResult = userValidationSchema.safeParse(body);
    if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
    }

    const { userName, email, phone, password, role } = validationResult.data;

    try {
        if (role === 'Customer' || role === 'Admin') {
            const exists = await Users.findOne({ email, phone });
            if (exists) {
                return res.status(409).json({ error: "User already exists" });
            }

            const user = await Users.create({ userName, email, phone, password, role });
            const token = jwt.sign({ userId: user._id, role: user.role }, jwt_secret);
            return res.status(201).json({ token: 'Bearer ' + token });
        }

        if (role === 'Vendor') {
        const headers = req.headers.authorization;
            console.log("headers:"+headers);
            if (!headers || headers=='') {
                const exists = await Users.findOne({ email, phone });
                if (exists) {
                    return res.status(409).json({ error: "User already exists" });
                }

                const user = await Users.create({ userName, email, phone, password, role });
                const token = jwt.sign({ userId: user._id, role: user.role }, jwt_secret);
                return res.status(201).json({ token: 'Bearer ' + token });
            }
            // if(headers)
            //     {
            //     return res.json({error:headers});
            // }
            const token = headers.split(' ')[1];
            const decodedToken = jwt.verify(token, jwt_secret);

            if (decodedToken) {
                const { address } = validationResult.data;

                const exists = await Vendors.findOne({
                    $or: [
                        { business_email: email },
                        { business_phone: phone }
                    ]
                });
                if (exists) {
                    return res.status(409).json({ error: "Organization already registered with the provided details" });
                }

                const newVendor = await Vendors.create({
                    user_id: decodedToken.userId,
                    business_name: userName,
                    business_email: email,
                    business_phone: phone,
                    business_address: address
                });
                console.log(newVendor);

                const vendorToken = jwt.sign(newVendor._id.toJSON(), jwt_secret);
                return res.status(201).json({
                    success: 'Organization created successfully',
                    token: 'Bearer ' + vendorToken
                });
            }
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server ' });
    }
});

const loginValidationSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }).optional(),
    userName:z.string().optional(),
    phone:z.string().optional(),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
}).refine(data => !!(data.email || data.userName || data.phone), { message: "Either email, username, or phone is required" });

userRouter.post('/login', async (req, res) => {
    const validationResult = loginValidationSchema.safeParse(req.body);
    if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
    }

    const { email, userName, phone, password } = validationResult.data;

    try {
        const user = await Users.findOne({ $or: [{ email }, { userName }, { phone }] });
        if (!user) {
            return res.status(403).json({ error: 'User not registered' });
        }

        if (user.password !== password) {
            return res.status(403).json({ error: 'Incorrect password' });
        }

        let token;
        if (user.role === 'Admin' || user.role === 'Customer') {
            token = jwt.sign({ userId: user._id, role: user.role }, jwt_secret);
            res.status(200).json({ token: 'Bearer ' + token });
        } 
        else if (user.role === 'Vendor') {
            const vendor = await Vendors.findOne({ user_id: user._id });
            console.log(vendor)
            if (vendor) {
                token = jwt.sign({ userId: vendor._id, role: 'Vendor' }, jwt_secret);
                res.status(200).json({ token: 'Bearer ' + token });
            } else {
                res.status(404).json({ error: 'Vendor not found' });
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


userRouter.post('/auth', async (req, res) => {
    try {
        const headers = req.headers.authorization;

        if (!headers) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = headers.split(' ')[1];
        const decodedToken = jwt.verify(token, jwt_secret);

        if (!decodedToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let user, vendor, userr;

        try {
            user = await Users.findOne({ _id: decodedToken.userId });
            if (!user) {
                vendor = await Vendors.findOne({ _id: decodedToken.userId });
                if (vendor) {
                    userr = await Users.findById(vendor.user_id);
                }
            }

            if (user && user.role !== 'Vendor') {
                return res.status(200).json({
                    success: 'Authorized',
                    userId: user._id,
                    role: [user.role],
                    info: user
                });
            } else if (vendor) {
                return res.status(200).json({
                    success: 'Authorized',
                    userId: vendor._id,
                    role: ['Vendor'],
                    info: { vendor, userr }
                });
            } else {
                return res.status(404).json({ error: 'User or Vendor not found' });
            }
        } catch (e) {
            console.error('Database query error:', e);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Error during authentication:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        } else {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});




module.exports = {
    userRouter,
};
