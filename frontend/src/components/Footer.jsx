import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='md:mx-10'>
        <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm '>
        {/* -----left----- */}
        <div>
            <img className='mb-5 w-40' src={assets.logo} alt="" />
            <p className='w-full md:w-2/3 text-gray-600 leading-6'>DocLock is a trusted platform for booking a doctor appointment hustle free. Here you can find all trusted and experienced doctors of all specializations all the time and book a apppoinntment if necessary.</p>
        </div>
        {/* -----center----- */}
        <div>
            
            <p className='text-xl font-medium mb-5'>Company</p>
            <ul className='flex flex-col gap-2 text-gray-600'>
                <li>Home</li>
                <li>About Us</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
            </ul>
        </div>
        {/* -----right----- */}
        <div>
            <p className='text-xl font-medium mb-5'>Get In Touch</p>
            <ul className='flex flex-col gap-2 text-gray-600'>
                <li>+91 8766800000</li>
                <li>arnav1234@gmail.com</li>
            </ul>
        </div>
        {/* ------Copy right test------ */}
        <div>
            <hr/>
            <p className='py-5 text-sm text-center'>Copyright 2025@ DocLock - All Rights Reserved</p>
        </div>
        </div>
    </div>
  )
}

export default Footer