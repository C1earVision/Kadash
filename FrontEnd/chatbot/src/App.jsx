import { Route, Routes } from 'react-router-dom'
import Agent from './pages/Agent';
import Login from './pages/Login';

function App() {
  return (
    <>
      <Routes>
        <Route path="/agent" element={<Agent />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </>
  )
}

export default App
