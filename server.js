import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mysql from 'mysql2';
import bcrypt from 'bcrypt';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000 || 3306;

// Middleware
app.use(cors({
    origin: 'https://93chidiebere.github.io/buymebiscuit/index.html',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000
});

db.getConnection((err, conn) => {
    if (err) {
        console.error('DB failed:', err);
    } else {
        console.log('✅ Connected');
        conn.release(); // Important!
    }
});

app.post('/api/signup', async (req, res) => {
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
        db.query(sql, [email, hashed], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('Email already exists');
                }
                return res.status(500).send('Database error');
            }
            res.status(200).send('User created successfully');
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});


// Login route

app.post('/api/login', (req, res) => {
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Server error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'User not found. Please check your email.' });
        }

        const user = results[0];


        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }


        return res.status(200).json({
            message: 'Login successful!',
            userId: user.id,
            role: user.role || 'user',
        });
    });
});


app.get('/api/posts/category/:category', (req, res) => {
    const { category } = req.params;

    const sql = 'SELECT * FROM posts WHERE category = ? ORDER BY created_at DESC';
    db.query(sql, [category], (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).json({ error: 'Server error' });
        }

        res.json(results);
    });
});

app.get('/api/posts/latest', (req, res) => {
    const sql = 'SELECT * FROM posts ORDER BY created_at DESC LIMIT 10';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(results);
    });
});

app.get('/api/post/:id', (req, res) => {
    const postId = req.params.id;
    db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (results.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(results[0]);
    });
});

// Create new post
app.post('/api/posts', (req, res) => {
    const { title, content, image, category } = req.body;

    if (!title || !content || !image || !category) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const sql = `INSERT INTO posts (title, content, image_url, category, created_at)
                 VALUES (?, ?, ?, ?, NOW())`;

    db.query(sql, [title, content, image, category], (err) => {
        if (err) {
            console.error('Error saving post:', err);
            return res.status(500).json({ error: 'Server error' });
        }
        res.status(200).json({ message: 'Post saved successfully!' });
    });
});

// Get all posts
app.get('/api/posts', (req, res) => {
    db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Server error' });
        }
        res.json(results);
    });
});

// Delete a post
app.delete('/api/posts/:id', (req, res) => {
    db.query('DELETE FROM posts WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed' });
        res.status(200).json({ message: 'Deleted' });
    });
});

// Get one post
app.get('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM posts WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error loading post' });
        if (results.length === 0) return res.status(404).json({ error: 'Post not found' });
        res.json(results[0]);
    });
});

// Update post
app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, image, category } = req.body;
    const sql = 'UPDATE posts SET title=?, content=?, image_url=?, category=? WHERE id=?';

    db.query(sql, [title, content, image, category, id], (err) => {
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ message: 'Post updated' });
    });
});


// Start
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
