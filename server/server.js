const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json());

// Enhanced CORS to support Authorization header
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MONGODB_URI exists:', process.env.MONGODB_URI ? 'YES' : 'NO');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      family: 4
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    try {
      console.log('Retrying connection...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected on retry');
    } catch (retryError) {
      console.error('Retry failed:', retryError.message);
      process.exit(1);
    }
  }
};

// Call the connection function
connectDB();

// User Schema - NEW
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Enhanced Todo Schema with user reference
const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Making it optional for existing todos
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Todo = mongoose.model('Todo', todoSchema);

// JWT Authentication Middleware - NEW
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Simple test route
app.get('/', function(req, res) {
  res.json({ message: 'Todo API with Authentication is running!' });
});

// User Registration - NEW
app.post('/api/register', async function(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });

    const savedUser = await user.save();
    console.log('User registered:', savedUser.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: savedUser._id },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        name: savedUser.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User Login - NEW
app.post('/api/login', async function(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('User logged in:', user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET all todos - Enhanced to filter by user
app.get('/api/todos', async function(req, res) {
  try {
    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let todos;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        // If authenticated, return only user's todos
        todos = await Todo.find({ userId: decoded.userId }).sort({ createdAt: -1 });
        console.log('Found ' + todos.length + ' todos for authenticated user');
      } catch (err) {
        // If token invalid, return all todos (backward compatibility)
        todos = await Todo.find().sort({ createdAt: -1 });
        console.log('Found ' + todos.length + ' todos (unauthenticated)');
      }
    } else {
      // If no token, return all todos (backward compatibility)
      todos = await Todo.find().sort({ createdAt: -1 });
      console.log('Found ' + todos.length + ' todos (no token)');
    }
    
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create new todo - Enhanced to associate with user
app.post('/api/todos', async function(req, res) {
  try {
    const title = req.body.title;
    const completed = req.body.completed || false;
    
    console.log('Creating todo:', title);
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        userId = decoded.userId;
      } catch (err) {
        // Continue without userId for backward compatibility
      }
    }

    const todo = new Todo({
      title: title,
      completed: completed,
      userId: userId // Will be null for unauthenticated users
    });

    const savedTodo = await todo.save();
    console.log('Created todo:', savedTodo._id);
    res.status(201).json(savedTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT update todo - Enhanced with user ownership check
app.put('/api/todos/:id', async function(req, res) {
  try {
    const id = req.params.id;
    const title = req.body.title;
    const completed = req.body.completed;

    console.log('Updating todo:', id, 'completed:', completed);

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;

    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let todo;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        // If authenticated, only allow updating user's own todos
        todo = await Todo.findOneAndUpdate(
          { _id: id, $or: [{ userId: decoded.userId }, { userId: null }] },
          updateData,
          { new: true }
        );
      } catch (err) {
        // If token invalid, allow updating any todo (backward compatibility)
        todo = await Todo.findByIdAndUpdate(id, updateData, { new: true });
      }
    } else {
      // If no token, allow updating any todo (backward compatibility)
      todo = await Todo.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!todo) {
      console.log('Todo not found or unauthorized:', id);
      return res.status(404).json({ message: 'Todo not found' });
    }

    console.log('Updated todo successfully');
    res.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE todo - Enhanced with user ownership check
app.delete('/api/todos/:id', async function(req, res) {
  try {
    const id = req.params.id;
    
    console.log('Deleting todo:', id);
    
    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let todo;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        // If authenticated, only allow deleting user's own todos
        todo = await Todo.findOneAndDelete({
          _id: id,
          $or: [{ userId: decoded.userId }, { userId: null }]
        });
      } catch (err) {
        // If token invalid, allow deleting any todo (backward compatibility)
        todo = await Todo.findByIdAndDelete(id);
      }
    } else {
      // If no token, allow deleting any todo (backward compatibility)
      todo = await Todo.findByIdAndDelete(id);
    }
    
    if (!todo) {
      console.log('Todo not found for deletion:', id);
      return res.status(404).json({ message: 'Todo not found' });
    }

    console.log('Deleted todo successfully');
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});