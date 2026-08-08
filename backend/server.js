import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoutes.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoutes.js';
import aiRouter from './routes/aiRoutes.js';

// app config 

const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// middlewares

app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
    credentials: true
}));

//api endpoints
app.use('/api/admin', adminRouter);
app.use('/api/doctor',doctorRouter)
app.use('/api/user', userRouter);
app.use('/api/ai', aiRouter);

app.get('/', (req, res) => {
    res.send('API WORKING ')
})

// start server

app.listen(port, () => {
    console.log("Server started ",port);
})