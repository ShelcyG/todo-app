
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Check, Circle, LogOut, User } from 'lucide-react';

// Import your authentication components
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to todos if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/todos" replace />;
  }
  
  return children;
};

// Enhanced TodoApp Component with Authentication
const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Base URL for your backend API
  const API_URL = 'http://localhost:5000/api';

  // Fetch todos from backend
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/todos`);
      setTodos(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load todos. Make sure your backend is running.');
      console.error('Error fetching todos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new todo
  const addTodo = async () => {
    if (!newTodo.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/todos`, {
        title: newTodo,
        completed: false
      });
      
      setTodos([...todos, response.data]);
      setNewTodo('');
      setError('');
    } catch (err) {
      setError('Failed to add todo');
      console.error('Error adding todo:', err);
    }
  };

  // Toggle todo completion
  const toggleTodo = async (id, completed) => {
    try {
      const response = await axios.put(`${API_URL}/todos/${id}`, {
        completed: !completed
      });
      
      setTodos(todos.map(todo => 
        todo._id === id ? response.data : todo
      ));
    } catch (err) {
      setError('Failed to update todo');
      console.error('Error updating todo:', err);
    }
  };

  // Delete todo
  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API_URL}/todos/${id}`);
      setTodos(todos.filter(todo => todo._id !== id));
    } catch (err) {
      setError('Failed to delete todo');
      console.error('Error deleting todo:', err);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Load todos on component mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="app-container">
      <div className="todo-wrapper">
        {/* Header with User Info */}
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <h1>Todo App</h1>
              <p>Stay organized and get things done!</p>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={18} />
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-email">{user?.email}</span>
                </div>
                <button onClick={handleLogout} className="logout-button">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="progress-badge">
              {completedCount} of {totalCount} completed
            </div>
          )}
        </div>

        {/* Add Todo Input */}
        <div className="input-container">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What needs to be done?"
            className="todo-input"
          />
          <button
            onClick={addTodo}
            disabled={!newTodo.trim()}
            className="add-button"
          >
            <Plus size={20} />
            Add
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading todos...</p>
          </div>
        )}

        {/* Todo List */}
        {!loading && (
          <div className="todo-list">
            {todos.length === 0 ? (
              <div className="empty-state">
                <div className="icon">
                  <Circle size={48} />
                </div>
                <h3>No todos yet!</h3>
                <p>Add one above to get started.</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo._id}
                  className={`todo-item ${todo.completed ? 'completed' : ''}`}
                >
                  <button
                    onClick={() => toggleTodo(todo._id, todo.completed)}
                    className={`complete-button ${todo.completed ? 'completed' : ''}`}
                  >
                    {todo.completed && <Check size={16} />}
                  </button>
                  
                  <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                    {todo.title}
                  </span>
                  
                  <button
                    onClick={() => deleteTodo(todo._id)}
                    className="delete-button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Built with React and Authentication</p>
        </div>
      </div>

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .todo-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .header-left h1 {
          margin: 0 0 8px;
          color: #1a202c;
          font-size: 32px;
          font-weight: 700;
          text-align: left;
        }

        .header-left p {
          margin: 0;
          color: #718096;
          font-size: 16px;
          text-align: left;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f7fafc;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .user-avatar {
          background: #667eea;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .user-name {
          font-weight: 600;
          color: #2d3748;
          font-size: 14px;
          line-height: 1.2;
        }

        .user-email {
          color: #718096;
          font-size: 12px;
          line-height: 1.2;
        }

        .logout-button {
          background: #e53e3e;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background-color 0.2s;
        }

        .logout-button:hover {
          background: #c53030;
        }

        .progress-badge {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .input-container {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
        }

        .todo-input {
          flex: 1;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .todo-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .add-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s;
        }

        .add-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }

        .loading {
          text-align: center;
          padding: 40px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .todo-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #718096;
        }

        .empty-state .icon {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .todo-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .todo-item:hover {
          border-color: #cbd5e0;
          transform: translateY(-1px);
        }

        .todo-item.completed {
          opacity: 0.7;
        }

        .complete-button {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #cbd5e0;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .complete-button.completed {
          background: #48bb78;
          border-color: #48bb78;
          color: white;
        }

        .todo-text {
          flex: 1;
          font-size: 16px;
          color: #2d3748;
        }

        .todo-text.completed {
          text-decoration: line-through;
          color: #a0aec0;
        }

        .delete-button {
          background: none;
          border: none;
          color: #e53e3e;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .delete-button:hover {
          background: #fed7d7;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .header-content {
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }

          .header-left h1,
          .header-left p {
            text-align: center;
          }

          .user-info {
            flex-wrap: wrap;
            justify-content: center;
          }

          .input-container {
            flex-direction: column;
          }

          .todo-wrapper {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

// Main App Component with Router
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/todos" element={
            <ProtectedRoute>
              <TodoApp />
            </ProtectedRoute>
          } />

          {/* Redirect root to todos if authenticated, login if not */}
          <Route path="/" element={<Navigate to="/todos" replace />} />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;