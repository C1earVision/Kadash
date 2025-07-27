import { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Chatbot from './pages/Chatbot';



function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Chatbot />} />
      </Routes>
    </>
  )
}

export default App
