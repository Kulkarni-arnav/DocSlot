import React from 'react'
import { useContext } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { useEffect } from 'react'

const DoctorAppointments = () => {

  const {dToken, getAppointments, appointments} = useContext(DoctorContext)
  useEffect(()=>{
    if(dToken){
      getAppointments()
    }
  },[dToken])

  return (
    <div>DoctorAppointments</div>
  )
}

export default DoctorAppointments