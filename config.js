// const mysql = require('mysql2/promise');

// // 数据库配置
// const configs = {
//   mysql: {
//     host: "localhost",
//     user: "root",
//     password: "1234",
//     database: "zx_rise_booksystem",
//     waitForConnections: true,
//     connectionLimit: 10,  // 最大连接数
//     queueLimit: 0  // 队列限制
//   }
// };

// // 创建数据库连接池
// const pool = mysql.createPool(configs.mysql);

// 获取最大可借阅数量
// const getMaxBorrowableCountFromDB = async (userId) => {
//   let connection;
//   try {
//     // 从连接池获取连接
//     connection = await pool.getConnection();
    
//     // 执行查询操作
//     const [rows] = await connection.query('SELECT max_num FROM t_user WHERE uid = ?', [userId]);

//     // 如果查询结果为空，返回默认最大借阅数量 3
//     if (rows.length === 0) {
//       return 3; // 默认最大借阅数量
//     }

//     return rows[0].max_num;
//   } catch (err) {
//     console.error('Error executing query:', err.message);  // 输出错误信息
//     throw err;  // 抛出错误，供上层捕获
//   } finally {
//     if (connection) {
//       connection.release();  // 释放连接
//     }
//   }
// };

// module.exports = pool 
