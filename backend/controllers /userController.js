import validator from 'validator';
import bcrypt from 'bcrypt';
import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import {v2 as cloudinary} from 'cloudinary';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';

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

        const token = jwt.sign({id : user._id} , process.env.JWT_SECRET );

        res.json({success:true , token});


    } catch (error) {
        console.log(error);
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
        const token = jwt.sign({id : user._id} , process.env.JWT_SECRET );

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

        await userModel.findByIdAndUpdate(userId , {name ,phone ,address:JSON.parse(address),dob,gender})

        if(imageFile){
            //upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})
            const imageURL = imageUpload.secure_url;

            await userModel.findByIdAndUpdate(userId , {image : imageURL})
        }

        res.json({success:true ,message : "Profile updated successfully"})

    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}


//API to book an appointment
const bookAppointment = async (req ,res)=>{
    
    try {
        
        const {docId , slotDate , slotTime } = req.body;
        const userId = req.userId; 

        const docData = await doctorModel.findById(docId).select("-password");

        if(!docData.available){
            return res.json({success:false ,message : "Doctor is not available"});
        }

        let slots_booked = docData.slots_booked;

        //checking for slots availability
        if(slots_booked[slotDate]){
            if(slots_booked[slotDate].includes(slotTime)){
                return res.json({success:false ,message : "Slot not available"});
            } else{
                slots_booked[slotDate].push(slotTime);
            }
        }else{
            slots_booked[slotDate]=[]
            slots_booked[slotDate].push(slotTime);
        }

        const userData = await userModel.findById(userId).select("-password");

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            slotDate,
            slotTime,
            userData,
            docData,
            amount : docData.fees,
            date : Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        //updating the slots_booked in doctor model
        await doctorModel.findByIdAndUpdate(docId , {slots_booked})

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

        //verify appointment belongs to the user
        if(appointmentData.userId !== userId){
            return res.json({success:false ,message : "You are not authorized to cancel this appointment"});
        }

        await appointmentModel.findByIdAndUpdate(appointmentId , {cancelled: true});

        //releasing doctors slot
        const {docId , slotDate , slotTime} = appointmentData;
        const docData = await doctorModel.findById(docId)
        let slots_booked = docData.slots_booked;
        slots_booked[slotDate] = slots_booked[slotDate].filter(e =>e !== slotTime);
        await doctorModel.findByIdAndUpdate(docId , {slots_booked})

        res.json({success:true ,message : "Appointment cancelled successfully"})
    } catch (error) {
        console.log(error);
        res.json({ success:false, message: error.message });
    }
}
 
export {registerUser,loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment};