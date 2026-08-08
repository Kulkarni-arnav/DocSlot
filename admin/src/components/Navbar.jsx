import React, { useContext } from 'react'
import { assets } from '../assets/assets'
import { AdminContext } from '../context/AdminContext'
import { useNavigate } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext'

const Navbar = () => {

    const {aToken,setAToken,setDoctors,setAppointments:setAdminAppointments,setDashData:setAdminDashData} = useContext(AdminContext)
    const {dToken,setDToken,setAppointments:setDoctorAppointments,setDashData:setDoctorDashData,setProfileData} = useContext(DoctorContext)

    const navigate = useNavigate()

    const logout =()=>{
        navigate('/')
        if(aToken){
            setAToken('')
            localStorage.removeItem('aToken')
            setDoctors([])
            setAdminAppointments([])
            setAdminDashData(false)
        }
        if(dToken){
            setDToken('')
            localStorage.removeItem('dToken')
            setDoctorAppointments([])
            setDoctorDashData(false)
            setProfileData(false)
        }
    }

  return (
    <div className='flex justify-between items-center px-4 sm:px-1 py-3 border-b bg-white'>
        <div className='flex items-center gap-2 text-xs'>
            <img className='w-36 sm:4-40 cursor-pointer' src={assets.admin_logo} alt="" />
            <p className='border px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600'>{aToken ? 'Admin' : 'Doctor'}</p>
        </div>
        <button onClick={logout} className='bg-primary text-sm text-white px-10 py-2 rounded-full'>Logout</button>
    </div>
  )
}

export default Navbar