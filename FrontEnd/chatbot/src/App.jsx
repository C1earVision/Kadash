import { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Chatbot from './pages/Chatbot';
import DashBoard from './pages/dashboard';


function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Chatbot />} />
        <Route path="/dashboard" element={<DashBoard />} />
      </Routes>
    </>
  )
}

export default App
