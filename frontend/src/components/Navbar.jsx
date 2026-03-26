import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{ padding: '10px', background: '#333', color: '#fff' }}>
      <Link to="/" style={{ color: '#fff', margin: '10px' }}>Login</Link>
      <Link to="/enroll" style={{ color: '#fff', margin: '10px' }}>Enroll</Link>
      <Link to="/dashboard" style={{ color: '#fff', margin: '10px' }}>Dashboard</Link>
      <Link to="/cards" style={{ color: '#fff', margin: '10px' }}>Cards</Link>
      <Link to="/payment" style={{ color: '#fff', margin: '10px' }}>Payment</Link>
    </nav>
  );
};

export default Navbar;
