import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Check, Circle, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';

// Base URL for your backend API
const API_URL = "https://todo-app-wnhg.onrender.com/api";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/todos" replace />;
  return children;
};

// TodoApp Component
const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      const response = await axios.put(`${API_URL}/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => todo._id === id ? response.data : todo));
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
    if (e.key === 'Enter') addTodo();
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="app-container">
      <div className="todo-wrapper">
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <h1>Todo App</h1>
              <p>Stay organized and get things done!</p>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar"><User size={18} /></div>
                <div className="user-details">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-email">{user?.email}</span>
                </div>
                <button onClick={handleLogout} className="logout-button">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="progress-badge">{completedCount} of {totalCount} completed</div>
          )}
        </div>

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
            <Plus size={20} /> Add
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading"><div className="spinner"></div><p>Loading todos...</p></div>}

        {!loading && (
          <div className="todo-list">
            {todos.length === 0 ? (
              <div className="empty-state">
                <div className="icon"><Circle size={48} /></div>
                <h3>No todos yet!</h3>
                <p>Add one above to get started.</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                  <button
                    onClick={() => toggleTodo(todo._id, todo.completed)}
                    className={`complete-button ${todo.completed ? 'completed' : ''}`}
                  >
                    {todo.completed && <Check size={16} />}
                  </button>
                  <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>{todo.title}</span>
                  <button onClick={() => deleteTodo(todo._id)} className="delete-button">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="footer">
          <p>Built with React and Authentication</p>
        </div>
      </div>

      {/* Include your CSS styles here (omitted for brevity, same as before) */}
    </div>
  );
};

// Main App Component with Router
const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/todos" element={<ProtectedRoute><TodoApp /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/todos" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;

