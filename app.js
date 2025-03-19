const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors'); 
const app = express();
const mongoose = require('mongoose');
app.use(cors())
app.use(express.json());
app.use(bodyParser.json());
const port = 3001;
// const pool = require('./config');
// 检查连接池是否正确创建
// console.log('MySQL Pool:', pool);
mongoose.connect('mongodb://localhost:27017/book')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });
app.use(bodyParser.urlencoded({ extended: false }));


//定义书籍模型
const bookSchema = new mongoose.Schema({
    bid: Number,
    book_name: String,
    author: String,
    type_name: String,
    num: Number
});

const Book = mongoose.model('Book', bookSchema,'t_book');
//用户模型
const userSchema = new mongoose.Schema({
    uid: Number,
    account: String,
    password: String,
    role: String,
    // 根据实际表结构补充其他字段，如lend_num、max_num等
    lend_num: Number,
    max_num: Number
});
const User = mongoose.model('User', userSchema, 't_user');

//借阅历史模型
const historySchema = new mongoose.Schema({
    // hid: { type: Number, required: false }, 
    book_name: String,
    account: String,
    begin_time: Date,
    end_time: Date,
    status: Number,
    return_time: Date,
    uid: { type: Number, ref: 'User', required: true },

    bid: { type: Number, ref: 'Book', required: true },
    status: { type: Number, default: 1 },  // 1 表示未归还，2 表示已归还
    return_time: Date
});

const History = mongoose.model('History', historySchema,'t_history');
//图书分类模型
const typeSchema = new mongoose.Schema({
    tid: { type: Number, required: true, unique: true },
    type_name: String
});
const Type = mongoose.model('Type', typeSchema,'t_type');
// 添加书籍  
app.post('/api/add', async (req, res) => {
    const { book_name, author, type_name, num } = req.body;
    const newBook = new Book({
        book_name,
        author,
        type_name,
        num
    });
    try {
        await newBook.save();
        res.json({ success: true, message: "新增成功！" });
    } catch (err) {
        console.error('添加书籍时发生错误:', err);
        res.status(500).json({ success: false, message: "操作失败，请稍后再试。" });
    }
});
// 编辑书籍  
app.post('/api/edit', async (req, res) => {
    // 从请求体中解构出要更新的书籍各字段信息以及用于定位书籍的bid
    const { book_name, author, type_name, num, bid } = req.body;
    try {
        // 使用findOneAndUpdate方法，第一个参数为查询条件（这里依据bid查找要更新的书籍）
        // 第二个参数为要更新的具体字段和对应新值，使用 $set 操作符来明确是进行更新操作
        const updatedBook = await Book.findOneAndUpdate(
            { bid: bid },
            { $set: {
                book_name: book_name,
                author: author,
                type_name: type_name,
                num: num
            } }
        );
        if (updatedBook) {
            // 如果找到了并成功更新，返回成功消息及相应状态码
            res.status(200).json({ success: true, message: "编辑成功！", data: updatedBook });
        } else {
            // 如果没找到对应bid的书籍，返回相应提示及状态码
            res.status(404).json({ success: false, message: `未找到bid为${bid}的书籍，无法编辑` });
        }
    } catch (err) {
        console.error('编辑书籍时发生错误:', err);
        // 如果出现错误，返回错误提示及相应状态码
        res.status(500).json({ success: false, message: "操作失败，请稍后再试。" });
    }
});

// 删除书籍  
app.delete('/api/del/:id', async (req, res) => {
    const targetBid = req.params.id;  // 正确获取路由中传递过来的bid参数值
    try {
        const deletedBook = await Book.findOneAndDelete({ bid: targetBid });
        if (deletedBook) {
            // 如果成功删除，返回200状态码以及成功消息
            res.status(200).json({ message: '书籍删除成功', data: deletedBook });
        } else {
            // 如果没找到对应书籍，返回404状态码以及提示消息
            res.status(404).json({ message: `未找到bid为${targetBid}的书籍，无法删除` });
        }
    } catch (err) {
        // 如果出现错误，返回500状态码以及错误消息
        console.log(`删除书籍时出现错误：`, err);
        res.status(500).json({ message: '删除书籍时出现内部错误', error: err });
    }
});
// 获取书籍  (模糊查询)
app.get('/api/get', async (req, res) => {
    const { book_name, type_name, author, numMin, numMax } = req.query;
    let query = {};
    if (book_name) {
        query.book_name = { $regex: book_name, $options: 'i' };
    }
    if (type_name) {
        query.type_name = { $regex: type_name, $options: 'i' };
    }
    if (author) {
        query.author = { $regex: author, $options: 'i' };
    }
    if (numMin || numMax) {
        query.num = {};
        if (numMin) {
            query.num.$gte = parseFloat(numMin);
        }
        if (numMax) {
            query.num.$lte = parseFloat(numMax);
        }
    }
    try {
        const results = await Book.find(query);
        res.json({ success: true, data: results, totalCount: results.length });
    } catch (err) {
        console.error('查询书籍信息时发生错误:', err);
        res.status(500).json({ success: false, message: "查询书籍信息失败，请稍后再试。" });
    }
});
// 注册接口  
app.post('/api/register', async (req, res) => {
    const { account, password } = req.body;
    // 检查账号和密码是否提供
    if (!account ||!password) {
        return res.status(400).json({ success: false, message: '请提供账号和密码' });
    }
    // 检查用户是否已存在
    const existingUser = await User.findOne({ account });
    if (existingUser) {
        return res.status(400).json({ success: false, message: '用户已存在' });
    }
    // 哈希密码并插入新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        account,
        password: hashedPassword
    });
    try {
        await newUser.save();
        res.json({ success: true, message: '注册成功' });
    } catch (err) {
        console.error('注册时发生错误:', err);
        return res.status(500).json({ success: false, message: '注册失败，请稍后再试。' });
    }
});
//登录接口
app.post('/api/login', async (req, res) => {
    const { account, password } = req.body;
    // 检查账号和密码是否提供
    if (!account ||!password) {
        return res.status(400).json({ success: false, message: '请提供账号和密码' });
    }
    try {
        
        const user = await User.findOne({ account });
        console.log('查询到的登录用户信息:', user);  
        if (!user) {
            return res.status(401).json({ success: false, message: '登录失败，账号或密码错误' });
        }
        let isPasswordValid = false;
        if (user.role === '2') {
            // 管理员密码为明文，不需要加密（根据实际情况判断是否合理）
            isPasswordValid = (password === user.password);
        } else {
            isPasswordValid = await bcrypt.compare(password, user.password);
        }
        if (isPasswordValid) {
            const userType = user.role === '2'? 'admin' : 'user';
            res.json({
                success: true,
                message: '登录成功',
                userType,
                userId: user.uid,
                user: { uid: user.uid, account: user.account, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: '登录失败，账号或密码错误' });
        }
    } catch (error) {
        console.error('登录时发生错误:', error);
        return res.status(500).json({ success: false, message: '服务器错误，请稍后再试。' });
    }
});

//图书分页查询接口
app.get('/api/books', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    try {
        const results = await Book.find().skip(skip).limit(pageSize);
        const totalCount = await Book.countDocuments();
        res.json({
            data: results,
            totalCount: totalCount,
            success: true,
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});
//用户管理数据库连接
app.get('/api/users', async (req, res) => {
    try {
        const results = await User.find();
        res.json(results);
    } catch (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Error fetching users');
    }
});
//用户数据删除
app.delete('/api/del1/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, message: '请提供用户 ID。' });
    }
    try {
        const result = await User.findByIdAndDelete(id);
        if (result) {
            res.json({ success: true, message: '用户删除成功。' });
        } else {
            res.status(404).json({ success: false, message: '用户未找到' });
        }
    } catch (err) {
        console.error('删除用户时发生错误:', err);
        res.status(500).json({ success: false, message: '删除用户失败，请稍后再试。' });
    }
});
//用户数据编辑
app.post('/api/handleUserEdit', async (req, res) => {
    const { uid, account, lend_num, max_num, password, originalPassword } = req.body;
    try {
        // 根据 uid 查找用户，而不是根据 _id 查找
        const user = await User.findOne({ uid: uid });  // 使用 findOne 查询 uid 字段
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        
        // 如果提供了新密码，验证原密码并更新密码
        if (password) {
            if (!originalPassword) {
                return res.status(400).json({ success: false, message: '修改密码需要提供原密码' });
            }
            const passwordMatch = await bcrypt.compare(originalPassword, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: '原密码输入错误，无法修改密码' });
            }
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            // 更新用户信息，包括密码
            user.account = account;
            user.lend_num = lend_num;
            user.max_num = max_num;
            user.password = hashedPassword;
            await user.save();
        } else {
            // 如果没有修改密码，只更新其他字段
            user.account = account;
            user.lend_num = lend_num;
            user.max_num = max_num;
            await user.save();
        }

        res.json({ success: true, message: '用户信息更新成功' });
    } catch (err) {
        console.error('编辑用户时发生错误:', err);
        res.status(500).json({ success: false, message: '编辑用户失败，请稍后再试' });
    }
});

//重置用户密码
app.post('/api/reset-password', async (req, res) => {
    const { uid, password } = req.body;

    try {
        // 1. 对新密码进行哈希处理（使用bcrypt库加密密码）
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. 使用User模型根据自定义的uid字段查找并更新用户密码
        const result = await User.findOneAndUpdate(
            { uid: uid },  // 通过自定义的uid字段来查找用户
            { password: hashedPassword },
            { new: true }  // 设置new为true，返回更新后的用户文档
        );

        // 3. 根据查找更新结果给客户端不同反馈
        if (result) {
            res.status(200).json({
                success: true,
                message: '密码已成功重置',
                data: result  // 可选择将更新后的用户信息返回给客户端（根据实际需求决定）
            });
        } else {
            res.status(404).json({
                success: false,
                message: `未找到uid为${uid}的用户，无法重置密码`
            });
        }
    } catch (error) {
        // 4. 区分不同类型错误，给客户端更具体反馈（这里简单示例，可按需细化）
        if (error.name === 'ValidationError') {
            res.status(400).json({
                success: false,
                message: '输入的参数不符合要求，请检查后重新尝试重置密码'
            });
        } else {
            console.error('重置密码时发生错误:', error);
            res.status(500).json({
                success: false,
                message: '重置密码出现内部错误，请稍后再试'
            });
        }
    }
});
//管理员修改用户
app.post('/api/handleUserEdit1', async (req, res) => {
    const { uid, account, lend_num, max_num } = req.body;
    try {
        const result = await User.findOneAndUpdate(
            { uid: uid },  // 依据自定义的uid字段来查找用户
            {
                account: account,
                lend_num: lend_num,
                max_num: max_num
            },
            { new: true }  // 返回更新后的用户文档
        );

        if (result) {
            res.status(200).json({
                success: true,
                message: '用户信息更新成功',
                data: result  // 将更新后的用户信息返回给客户端（可选，根据实际需求决定是否返回）
            });
        } else {
            res.status(404).json({
                success: false,
                message: `未找到uid为${uid}的用户，无法更新信息`
            });
        }
    } catch (err) {
        console.error('管理员修改用户时发生错误:', err);
        res.status(500).json({
            success: false,
            message: '用户信息更新出现内部错误，请稍后再试'
        });
    }
});

//获取借阅书籍数据
app.get('/api/getLoanDataFrom/:bid', async (req, res) => {
    try {
        const bid = req.params.bid;
        const uid = req.query.uid || req.body.uid;

        if (!bid || !uid) {
            return res.status(400).json({ success: false, message: '缺少必要的参数。' });
        }

        // 使用 uid 来查找用户，假设 uid 是 User 模型中的字段
        const user = await User.findOne({ uid: uid });
        if (!user) {
            console.error('用户信息未找到');
            return res.status(404).json({ success: false, message: '用户信息未找到' });
        }

        // 使用 bid 来查找图书，假设 bid 是 Book 模型中的字段
        const book = await Book.findOne({ bid: bid });
        if (!book) {
            console.error('图书信息未找到');
            return res.status(404).json({ success: false, message: '图书信息未找到' });
        }

        res.json({ success: true, userData: user, bookData: book });
    } catch (err) {
        console.error('获取借阅数据时发生错误:', err);
        res.status(500).json({ success: false, message: '获取借阅数据失败，请稍后再试。' });
    }
});

//借阅
app.post('/api/borrow', async (req, res) => {
    const { bid, uid } = req.body;
    
    // 检查必需的参数
    if (!bid) {
        return res.status(400).json({ success: false, message: '缺少图书 ID。' });
    }
    if (!uid) {
        return res.status(400).json({ success: false, message: '缺少用户 ID。' });
    }

    try {
        // 查询图书记录（根据 bid 进行查询）
        const book = await Book.findOne({ bid });  // 使用 bid 进行匹配
        if (!book) {
            return res.status(404).json({ success: false, message: '图书未找到' });
        }

        // 检查库存
        if (book.num <= 0) {
            return res.status(400).json({ success: false, message: '库存不足' });
        }

        // 查询用户记录（根据 uid 进行查询）
        const user = await User.findOne({ uid });  // 使用 uid 进行匹配
        if (!user) {
            return res.status(404).json({ success: false, message: '用户账号信息未找到' });
        }

        // 统计该用户已经借阅的书籍数量
        const userLoanCount = await History.countDocuments({ uid, status: 1 });
        
        // 获取该用户可以借阅的最大数量
        const maxBorrowableCount = await getMaxBorrowableCountFromDB(uid);
        
        // 检查是否超过借阅限制
        if (userLoanCount >= maxBorrowableCount) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            const borrowLimitReachedResponse = {
                success: false,
                message: `你已达到最大借阅数量(${maxBorrowableCount}本)，无法再借阅。`,
                loan: {
                    bid: book.bid,
                    book_name: book.book_name,
                    account: user.account,
                    begin_time: null,
                    end_time: null,
                    status: 0
                }
            };
            return res.json(borrowLimitReachedResponse);
        }

        // 更新库存
        book.num -= 1;
        await book.save();

        // 设置借阅日期和到期日期
        const borrowDate = new Date();
        const dueDate = new Date(borrowDate);
        dueDate.setDate(dueDate.getDate() + 7);

        // 创建新的借阅记录
        const newLoan = new  History({
            hid: 0,
            uid: user.uid,
            account: user.account,
            book_name: book.book_name,
            bid: book.bid,
            begin_time: borrowDate,
            end_time: dueDate,
            status: 1  // 借阅中
        });
        await newLoan.save();

        // 返回借阅成功的响应
        res.json({
            success: true,
            message: '借阅成功',
            loan: {
                uid:uid,
                bid: book.bid,
                book_name: book.book_name,
                account: user.account,
                begin_time: borrowDate,
                end_time: dueDate,
                status: 1
            }
        });
    } catch (err) {
        console.error('借阅时发生错误:', err);
        res.status(500).json({ success: false, message: '借阅失败，请稍后再试。' });

    }
});


//获取用户借阅记录
app.get('/api/getLoanRecords', async (req, res) => {  
    const { userId, userType } = req.query; 
    
    // 输入验证：确保 userId 是有效的
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // 根据用户类型（userType）构建查询条件
        let query = {};
        if (userType === "admin") {
            // 如果是管理员，查询所有记录
            query = {};  // 查询所有借阅记录
        } else {
            // 否则，使用 uid 来查询
            // 假设 userId 是字符串，转换为数字（如果数据库中的 uid 是数字类型）
            query = { uid: Number(userId) };  
        }

        // 查询历史借阅记录

        const results = await History.find(query);
  

        // 格式化返回的借阅记录数据
        const formattedResults = results.map(record => ({
            ...record._doc,  // 使用 _doc 来获取原始文档数据
            isReturned: record.status === 2,  // 判断是否已归还
            statusText: record.status === 1 ? '正在借阅' : '已归还',  // 根据借阅状态显示文字
            returnDate: record.status === 2 ? record.return_time : '未归还'  // 处理归还日期显示
        }));

        // 获取用户当前的借书数量（借阅中状态），在过去7天内的记录
        const countResult = await History.countDocuments({
            uid: Number(userId),  // 确保 userId 是数字类型
            status: 1,  // 借阅中状态
           
        });
        const currentCount = countResult;

        // 获取用户最大可借阅数量（假设是从数据库查询）
        const maxBorrowableCount = await getMaxBorrowableCountFromDB(userId); // 假设此函数根据 userId 查询最大可借数量

        // 返回格式化后的借阅记录、当前借书数量和最大可借阅数量
        res.json({ records: formattedResults, currentCount, maxCount: maxBorrowableCount });
    } catch (error) {
        // 捕获并返回异常信息
        console.error('Error occurred:', error);

        // 判断错误类型并返回相应信息
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
});




//历史记录获取
app.get('/api/getHistoryRecords', async (req, res) => {
    try {
        const results = await History.find();
        const formattedResults = results.map(record => ({
          ...record._doc,
            isReturned: record.status === 2,
            statusText: record.status === 1? '正在借阅' : '已归还',
            returnDate: record.status === 2? record.return_time : '未归还'
        }));
        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//管理员历史
app.get('/api/getReturnInfo', async (req, res) => {
    try {
        const results = await History.find();
        const formattedResults = results.map(record => ({
          ...record._doc,
            isReturned: record.status === 2,
            statusText: record.status === 1? '正在借阅' : '已归还',
            returnDate: record.status === 2? record.return_time : '未归还'
        }));
        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//管理员还书
// 用户还书接口
// 用户还书接口
app.put('/api/returnBook/:uid', async (req, res) => {
  const uid = req.params.uid;

  // 验证 uid 是否是一个有效的数字
  if (isNaN(uid)) {
    return res.status(400).json({ success: false, message: '无效的用户 ID' });
  }

  // 转换为数字类型
  const userId = Number(uid);

  try {
      // 根据 uid 查找借阅历史记录
      const history = await History.findOne({ uid: userId, status: 1 });
      if (!history) {
          return res.status(404).json({ success: false, message: '借阅记录未找到' });
      }
      // 根据图书 ID 查找图书信息
      const book = await Book.findOne({ bid: history.bid });
      if (!book) {
          return res.status(404).json({ success: false, message: '图书未找到' });
      }
      // 更新图书库存
      book.num += 1;
      await book.save();
      // 设置还书时间，并更新借阅记录状态
      const returnTime = new Date();
      history.status = 2;
      history.return_time = returnTime;
      await history.save();
      res.json({ success: true, message: '还书成功' });
  } catch (err) {
      console.error('还书时发生错误:', err);
      res.status(500).json({ success: false, message: '还书失败，请稍后再试。' });
  }
});

//管理员归还
app.post('/api/returnBook', async (req, res) => {
    console.log("req.body", req.body);

    const { uid } = req.body;  // 从请求中获取 uid（用户ID）

    // 验证 uid 是否存在
    if (!uid) {
        return res.status(400).json({ message: '请提供用户ID。' });
    }

    try {
        // 使用 uid 字段查询借阅记录，假设只归还一个借阅记录
        const history = await History.findOne({ uid, status: 1 });  // status: 1 表示正在借阅
        if (!history) {
            return res.status(404).json({ success: false, message: '借阅记录未找到' });
        }

        // 查找与该借阅记录相关联的图书
        const book = await Book.findOne({ bid: history.bid });
        if (!book) {
            return res.status(404).json({ success: false, message: '图书未找到' });
        }

        // 更新图书的库存数量
        book.num += 1;
        await book.save();

        // 更新借阅记录的状态为已归还，并记录归还时间
        history.status = 2;
        history.return_time = new Date();
        await history.save();

        // 返回成功响应
        res.json({ success: true, message: '图书归还成功' });

    } catch (err) {
        console.error('还书时发生错误:', err);
        res.status(500).json({ success: false, message: '还书失败，请稍后再试。' });
    }
});

//图书分类增删改查
app.get('/api/getCategory', async (req, res) => {
    try {
        const results = await Type.find();
        res.json(results);
    } catch (err) {
        console.error('获取图书分类时发生错误:', err);
        res.status(500).json({ success: false, message: '获取图书分类失败，请稍后再试。' });
    }
});
app.delete('/api/deleteCategory/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ success: false, message: '请提供分类ID。' });
    }

    try {
        // 使用 tid 字段进行查找并删除
        const result = await Type.findOneAndDelete({ tid: id });

        if (result) {
            res.json({ success: true, message: '分类删除成功。' });
        } else {
            res.status(404).json({ success: false, message: '分类未找到' });
        }
    } catch (err) {
        console.error('删除分类时发生错误:', err);
        res.status(500).json({ success: false, message: '删除分类失败，请稍后再试。' });
    }
});

app.post('/api/addCategory', async (req, res) => {
    const { categoryName } = req.body;
    if (!categoryName) {
        return res.status(400).json({ success: false, message: '请提供分类名称。' });
    }
    const newType = new Type({ type_name: categoryName });
    try {
        await newType.save();
        res.json({ success: true, message: '分类添加成功。' });
    } catch (err) {
        console.error('添加分类时发生错误:', err);
        res.status(500).json({ success: false, message: '添加分类失败，请稍后再试。' });
    }
});
app.post('/api/editCategory', async (req, res) => {
    const { id, categoryName } = req.body;
    
    if (!id || !categoryName) {
        return res.status(400).json({ success: false, message: '请提供分类ID和新的分类名称。' });
    }

    try {
        // 使用 tid 字段查找分类并更新
        const result = await Type.findOneAndUpdate(
            { tid: id },  // 根据 tid 查找分类
            { type_name: categoryName },  // 更新分类名称
            { new: true }  // 返回更新后的文档
        );

        if (!result) {
            return res.status(404).json({ success: false, message: '分类未找到。' });
        }

        res.json({ success: true, message: '分类修改成功。' });
    } catch (err) {
        console.error('修改分类时发生错误:', err);
        res.status(500).json({ success: false, message: '修改分类失败，请稍后再试。' });
    }
});

//获取所有图书分类
app.get('/api/getCategories', async (req, res) => {
    try {
        const results = await Type.find({}, 'type_name');  // 只获取type_name字段
        res.json({ success: true, categories: results.map(result => result.type_name) });
    } catch (err) {
        console.error('获取图书分类时发生错误:', err);
        res.status(500).json({ success: false, message: '获取图书分类失败，请稍后再试。' });
    }
});
//延期还书
app.post('/api/updateReturnDate', async (req, res) => {
    const { bid, newReturnDate } = req.body;
    try {
        const history = await History.findOneAndUpdate(
            { hid: bid },  // 根据实际情况这里可能是 _id 等字段来查找，需对应调整
            { end_time: newReturnDate },
            { new: true }  // 返回更新后的文档
        );
        if (history) {
            res.json({ success: true, message: '还书时间更新成功' });
        } else {
            res.status(404).json({ success: false, message: '未找到对应的借阅记录' });
        }
    } catch (err) {
        console.error('更新还书时间时发生错误:', err);
        res.status(500).json({ success: false, message: '更新还书时间失败，请稍后再试' });
    }
});
//最大借阅量
app.get('/api/user/max-borrowable-count', async (req, res) => {
    const userId = req.query.userId;  // 获取请求中的 userId 参数
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // 使用 findOne 来匹配 uid 字段，而不是 _id
        const user = await User.findOne({ uid: userId });  // 查找 uid 字段等于 userId 的用户
        if (!user) {
            return res.status(404).json({ message: '用户未找到' });
        }
        // 返回用户的最大借阅数
        res.json({ maxBorrowableCount: user.max_num });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('connection')) {
                res.status(500).json({ message: '无法连接到数据库。' });
            } else if (error.message.includes('query')) {
                res.status(500).json({ message: '数据库查询错误。' });
            } else {
                res.status(500).json({ message: '内部服务器错误。' });
            }
        }
        // 记录错误以便调试
        console.error('Error fetching max borrowable count:', error);
    }
});

const getMaxBorrowableCountFromDB = async (userId) => {
    try {
        const user = await User.findOne({ uid: userId });
        if (!user) {
            return 3;
        }
        return user.max_num;
    } catch (err) {
        console.error('获取最大可借阅数量时发生错误:', err);
        throw err;
    }
};

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})