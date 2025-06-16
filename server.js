const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'biscuit_blog'
});
db.connect(err => {
  if (err) throw err;
  console.log('✅ MySQL connected');
});





// Start
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});