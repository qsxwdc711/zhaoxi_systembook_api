const express = require('express');  
const bodyParser = require('body-parser');  
const bcrypt = require('bcrypt'); 
const cors = require('cors');  
const db = require("./config"); // 假设这是你的数据库连接池配置  
const app = express();  
app.use(cors());  
app.use(bodyParser.json());  
//
const mysql = require('mysql');
// 创建连接池
const pool = mysql.createPool(configs.mysql);

  
app.get('/api', (req, res) => {  
  res.send('Hello, world!');  
});  
  
// 登录接口  
app.post('/api/login', async (req, res) => {  
  const { email, password } = req.body;  
  if (!email || !password) {  
    return res.status(400).json({ success: false, message: '请提供邮箱和密码' });  
  }  
  
  try {  
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);  
    if (results.length === 0) {  
      return res.status(401).json({ success: false, message: '用户不存在' });  
    }  
  
    const user = results[0];  
    const match = await bcrypt.compare(password, user.password);  
    if (!match) {  
      return res.status(401).json({ success: false, message: '密码错误' });  
    }  
  
    return res.json({ success: true, message: '登录成功', user: { email: user.email } }); // 可选：返回用户信息  
  } catch (error) {  
    console.error('登录时发生错误:', error);  
    return res.status(500).json({ success: false, message: '服务器错误' });  
  }  
});  

app.get('/api/get', (req, res) => {
  console.log("get请求");
  const { book_name } = req.query;
  console.log(book_name);

  let sql = `SELECT * FROM Book`;
  if (book_name) {
    sql = `SELECT * FROM Book WHERE book_name LIKE ?`;
  }

  pool.query(sql, [book_name ? `%${book_name}%` : null], (err, results) => {
    if (err) {
      console.error('查询书籍信息时发生错误:', err);
      return res.status(500).json({ code: 1, message: '查询书籍信息失败，请稍后再试。' });
    }
    res.json({ code: 0, data: results });
  });
});
// 注册接口  
app.post('/api/register', async (req, res) => {  
  const { email, password } = req.body;  
  console.log("注册",req.body)
  if (!email || !password) {  
    return res.status(400).json({ code: 1, message: '请提供邮箱和密码' });  
  }  
  
  
  const sql = "SELECT * FROM users WHERE email = ?";  
  try {  
    const [results] = await db.query(sql, [email]);  
    console.log(results);
    
    if (results.length > 0) {  
      return res.json({ code: 1, message: '用户已存在' });  
    }  
  
    const hashedPassword = await bcrypt.hash(password, 10);  
    const sql1 = "INSERT INTO users (email, password) VALUES (?, ?)";  
    await db.query(sql1, [email, hashedPassword]);  
  
    return res.json({ code: 0, message: '注册成功' });  
  } catch (err) {  
    console.error('注册时发生错误:', err);  
    return res.json({  
      code: 1,  
      message: '注册失败，请稍后再试。' // 通用错误信息，避免暴露内部细节  
      // 如果需要调试，可以临时使用：message: err.message  
    });  
  }  
});  
  
app.listen(3001, () => {  
  console.log('Server is running on http://localhost:3001');  
});