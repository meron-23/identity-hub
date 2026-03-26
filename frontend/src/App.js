import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Enroll from './pages/Enroll';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CardManagement from './pages/CardManagement';
import Payment from './pages/Payment';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cards" element={<CardManagement />} />
          <Route path="/payment" element={<Payment />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
