const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { errorHandler } = require("./auth/errorHandler.js");
const authRoutes = require("./auth/routes.js");
const chatRoutes = require("./api/chatRoutes.js");
const { requireAuth } = require("./auth/authMiddleware.js");


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser

// CORS configuration for frontend access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use('/auth', authRoutes);

// Protected route example
app.get('/protected', require('./auth/authMiddleware').requireAuth, async (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Basic route
app.get('/', async (req, res) => {
  res.json({ message: 'API is running' });

});

// Use chat routes
app.use('/', chatRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
