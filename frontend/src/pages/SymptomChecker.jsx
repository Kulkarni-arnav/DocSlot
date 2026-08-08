import React, { useState, useContext } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const SymptomChecker = () => {

  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onSubmitHandler = async (event) => {
    event.preventDefault()

    if (!symptoms.trim()) {
      toast.warning('Please describe your symptoms')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const { data } = await axios.post(backendUrl + '/api/ai/recommend-doctor', { symptoms })
      if (data.success) {
        setResult(data)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='my-10'>
      <p className='text-2xl font-medium text-gray-700'>AI Symptom Checker</p>
      <p className='text-gray-500 mt-1 max-w-2xl'>Describe how you're feeling and we'll suggest which type of doctor to see. This is not a medical diagnosis — always consult a qualified doctor for medical advice.</p>

      <form onSubmit={onSubmitHandler} className='mt-6 max-w-2xl'>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={5}
          placeholder='e.g. I have had a sore throat and mild fever for the past two days...'
          className='w-full border border-gray-300 rounded p-3 text-sm text-gray-700 focus:outline-none focus:border-primary'
        />
        <button type='submit' disabled={loading} className='mt-3 bg-primary text-white text-sm font-light px-8 py-3 rounded-full disabled:opacity-50'>
          {loading ? 'Thinking...' : 'Get Recommendation'}
        </button>
      </form>

      {result && (
        <div className='mt-8 max-w-2xl'>
          {result.urgent && (
            <div className='border border-red-400 bg-red-50 text-red-600 rounded p-4 mb-4 text-sm'>
              <p className='font-medium'>Seek immediate medical care</p>
              <p className='mt-1'>{result.urgentMessage}</p>
            </div>
          )}

          <div className='border border-gray-200 rounded p-4'>
            <p className='text-gray-500 text-sm'>Recommended speciality</p>
            <p className='text-xl font-medium text-gray-800'>{result.speciality}</p>
            <p className='text-gray-600 text-sm mt-2'>{result.reason}</p>
          </div>

          <p className='text-gray-700 font-medium mt-6 mb-3'>Doctors you can book with</p>
          {result.doctors.length === 0 ? (
            <p className='text-gray-500 text-sm'>No available doctors found for this speciality right now.</p>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {result.doctors.map((item) => (
                <div onClick={() => navigate(`/appointment/${item._id}`)} className='border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-4px] transition-all duration-300' key={item._id}>
                  <img className='bg-blue-50 w-full' src={item.image} alt="" />
                  <div className='p-4'>
                    <p className='text-gray-900 font-medium'>{item.name}</p>
                    <p className='text-gray-600 text-sm'>{item.speciality}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SymptomChecker
