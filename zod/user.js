const z = require('zod');


const userValidationSchema = z.object({
  userName: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10,{message:"minimum 10 required"}),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  role:z.string().optional(),
  address:z.string().optional()
});


const loginValidationSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).optional(),
  userName:z.string().optional(),
  phone:z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
}).refine(data => !!(data.email || data.userName || data.phone), { message: "Either email, username, or phone is required" });


module.exports={
  userValidationSchema,
  loginValidationSchema
}