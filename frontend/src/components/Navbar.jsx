import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Don't show navbar on login page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" className="brand-link">
          🔐 Identity Hub
        </Link>
      </div>
      
      <div className="navbar-nav">
        {isAuthenticated ? (
          <>
            <Link 
              to="/dashboard" 
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              📊 Dashboard
            </Link>
            <Link 
              to="/cards" 
              className={`nav-link ${location.pathname === '/cards' ? 'active' : ''}`}
            >
              💳 Cards
            </Link>
            <Link 
              to="/payment" 
              className={`nav-link ${location.pathname === '/payment' ? 'active' : ''}`}
            >
              💰 Payment
            </Link>
            <div className="nav-user">
              <span className="user-name">👤 {user?.name || 'User'}</span>
              <button onClick={handleLogout} className="logout-btn">
                🚪 Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link 
              to="/enroll" 
              className={`nav-link ${location.pathname === '/enroll' ? 'active' : ''}`}
            >
              📝 Enroll
            </Link>
          </>
        )}
      </div>

      <style jsx>{`
        .navbar {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          padding: 0 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 60px;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
        }

        .brand-link {
          color: white;
          text-decoration: none;
          font-size: 20px;
          font-weight: 700;
          transition: color 0.2s;
        }

        .brand-link:hover {
          color: #3498db;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .nav-link {
          color: #ecf0f1;
          text-decoration: none;
          padding: 10px 15px;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .nav-link.active {
          background-color: rgba(52, 152, 219, 0.3);
          color: white;
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-left: 20px;
          padding-left: 20px;
          border-left: 1px solid rgba(255, 255, 255, 0.2);
        }

        .user-name {
          color: #ecf0f1;
          font-weight: 600;
          font-size: 14px;
        }

        .logout-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: background-color 0.2s;
        }

        .logout-btn:hover {
          background: #c0392b;
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0 15px;
          }

          .brand-link {
            font-size: 16px;
          }

          .navbar-nav {
            gap: 2px;
          }

          .nav-link {
            padding: 8px 10px;
            font-size: 14px;
          }

          .nav-user {
            margin-left: 10px;
            padding-left: 10px;
          }

          .user-name {
            display: none;
          }

          .logout-btn {
            padding: 6px 10px;
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .navbar {
            flex-direction: column;
            height: auto;
            padding: 10px 15px;
          }

          .navbar-brand {
            margin-bottom: 10px;
          }

          .navbar-nav {
            width: 100%;
            justify-content: space-around;
          }

          .nav-user {
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            margin-left: 0;
            padding-left: 0;
            margin-top: 10px;
            padding-top: 10px;
            justify-content: center;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
