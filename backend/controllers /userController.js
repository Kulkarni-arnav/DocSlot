import validator from 'validator';
import bcrypt from 'bcrypt';
import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import {v2 as cloudinary} from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';

//Api to register a user
const registerUser = async (req ,res)=>{
    try {
        const {name , email , password} = req.body;
       if(!name || !email || !password){
        return res.json({success:false ,message : "Please enter all the fields"});
       }

       if(!validator.isEmail(email)){
        return res.json({success:false ,message : "Please enter a valid email"});
       }

        if(password.length < 8 ){ 
        return res.json({success:false ,message : "Password must be at least 8 characters long"});
        }  
        
        //hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password , salt);

        const userData = {
            name,
            email,
            password : hashedPassword
        }

        //store the user in the database

        const newUser = new userModel(userData);
        const user = await newUser.save();

        //_id is created by default in mongodb

        const token = jwt.sign({id : user._id} , process.env.JWT_SECRET , {expiresIn:'7d'});

        res.json({success:true , token});


    } catch (error) {
        console.log(error);
        if(error.code === 11000){
            return res.json({ success:false, message: "Email already registered" });
        }
        res.json({ success:false, message: error.message });
    }
}

//Api to login a user

const loginUser = async (req ,res)=>{
    try {
        
        const {email , password} = req.body;

       const user = await userModel.findOne({email});
       if(!user){
        return res.json({success:false ,message : "User not found"});
       }

       const isMatch = await bcrypt.compare(password , user.password);
       if(isMatch){
        const token = jwt.sign({id : user._id} , process.env.JWT_SECRET , {expiresIn:'7d'});

        res.json({success:true , token});
       } else{
             res.json({success:false ,message : "Invalid credentials"});
       }


    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

//API to get user profile data

const getProfile = async (req ,res)=>{
    try {
        const userId = req.userId; //const {userId} = req.body;
        const userData = await userModel.findById(userId).select("-password");
        res.json({success:true ,userData});
    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

//API to update user profile data

const updateProfile = async (req ,res)=>{
    try {
        const userId = req.userId; //const {userId} = req.body;
        const {name , email, phone , address,dob ,gender} = req.body;
        const imageFile=req.file

        if(!name || !phone || !dob || !gender ){
            return res.json({success:false ,message : "Please enter all the fields"});
        }

        const updateData = {name ,phone ,address:JSON.parse(address),dob,gender};

        if(email){
            if(!validator.isEmail(email)){
                return res.json({success:false ,message : "Please enter a valid email"});
            }
            updateData.email = email;
        }

        await userModel.findByIdAndUpdate(userId , updateData)

        if(imageFile){
            //upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})
            const imageURL = imageUpload.secure_url;
            fs.unlink(imageFile.path, ()=>{});

            await userModel.findByIdAndUpdate(userId , {image : imageURL})
        }

        res.json({success:true ,message : "Profile updated successfully"})

    } catch (error) {
        console.log(error);
        if(error.code === 11000){
            return res.json({ success:false, message: "Email already in use" });
        }
        res.json({ success:false, message: error.message });
    }
}


//API to book an appointment
const bookAppointment = async (req ,res)=>{
    
    try {

        const {docId , slotDate , slotTime } = req.body;
        const userId = req.userId;

        if(!docId || !slotDate || !slotTime){
            return res.json({success:false ,message : "Please select a valid slot"});
        }

        const docData = await doctorModel.findById(docId).select("-password");

        if(!docData){
            return res.json({success:false ,message : "Doctor not found"});
        }

        if(!docData.available){
            return res.json({success:false ,message : "Doctor is not available"});
        }

        //atomically claim the slot only if it isn't already booked, preventing double-booking
        const updatedDoc = await doctorModel.findOneAndUpdate(
            { _id: docId, [`slots_booked.${slotDate}`]: { $ne: slotTime } },
            { $push: { [`slots_booked.${slotDate}`]: slotTime } }
        );

        if(!updatedDoc){
            return res.json({success:false ,message : "Slot not available"});
        }

        const userData = await userModel.findById(userId).select("-password");

        if(!userData){
            //release the slot we just claimed since we can't create the appointment
            await doctorModel.findByIdAndUpdate(docId , { $pull: { [`slots_booked.${slotDate}`]: slotTime } });
            return res.json({success:false ,message : "User not found"});
        }

        const docDataToSave = docData.toObject();
        delete docDataToSave.slots_booked;

        const appointmentData = {
            userId,
            docId,
            slotDate,
            slotTime,
            userData,
            docData: docDataToSave,
            amount : docData.fees,
            date : Date.now()
        }

        try {
            const newAppointment = new appointmentModel(appointmentData);
            await newAppointment.save();
        } catch (saveError) {
            //release the slot we just claimed since the appointment was never created
            await doctorModel.findByIdAndUpdate(docId , { $pull: { [`slots_booked.${slotDate}`]: slotTime } });
            throw saveError;
        }

        res.json({success:true ,message : "Appointment booked successfully"})


    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

//API to get user appointments for frontend my-appointments page 

const listAppointment = async (req ,res)=>{
    try {
        const userId = req.userId;
        const appointments = await appointmentModel.find({userId})
        res.json({success:true ,appointments})
    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

//Api to cancel an appointment

const cancelAppointment = async (req ,res)=>{
    try {
        const userId = req.userId; 
        const {appointmentId} = req.body;
        
        const appointmentData = await appointmentModel.findById(appointmentId);

        if(!appointmentData){
            return res.json({success:false ,message : "Appointment not found"});
        }

        //verify appointment belongs to the user
        if(appointmentData.userId !== userId){
            return res.json({success:false ,message : "You are not authorized to cancel this appointment"});
        }

        await appointmentModel.findByIdAndUpdate(appointmentId , {cancelled: true});

        //releasing doctors slot
        const {docId , slotDate , slotTime} = appointmentData;
        await doctorModel.findByIdAndUpdate(docId , { $pull: { [`slots_booked.${slotDate}`]: slotTime } });

        res.json({success:true ,message : "Appointment cancelled successfully"})
    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

const razorpayInstance = new razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET,
});

// Api to make payment using razorpay

const paymentRazorpay = async (req ,res)=>{

    try {
        const {appointmentId} = req.body;
        const userId = req.userId;
        const appointmentData = await appointmentModel.findById(appointmentId);
        if(!appointmentData||appointmentData.cancelled){
            return res.json({success:false ,message : "No appointment found"});
        }

        if(appointmentData.userId !== userId){
            return res.json({success:false ,message : "You are not authorized to pay for this appointment"});
        }

        //creating options for razorpay payments
        const options = {
            amount: appointmentData.amount * 100, //amount in paise
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        //creating order
        const order = await razorpayInstance.orders.create(options);
        res.json({success:true ,order})
    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}

//Api to varify payment of razorpay

const verifyRazorpay = async (req ,res)=>{
    try {
        const {razorpay_order_id , razorpay_payment_id , razorpay_signature} = req.body;
        const userId = req.userId;

        //verify the payment actually came from razorpay and wasn't forged
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const signaturesMatch = razorpay_signature
            && expectedSignature.length === razorpay_signature.length
            && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

        if(!signaturesMatch){
            return res.json({success:false ,message : "Payment verification failed"});
        }

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
        if(orderInfo.status==='paid'){
            const appointmentData = await appointmentModel.findById(orderInfo.receipt);
            if(!appointmentData || appointmentData.userId !== userId){
                return res.json({success:false ,message : "You are not authorized to verify this payment"});
            }
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt , {payment : true});
            res.json({success:true ,message : "Payment successful"})
        }else{
            res.json({success:false ,message : "Payment not successful"})
        }


    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}
 
export {registerUser,loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay};