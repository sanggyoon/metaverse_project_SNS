// app.js
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'ex01_database'
});

connection.connect();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// 회원가입 페이지 렌더링
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 회원가입 폼 제출 처리
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    const user = { username, email, password };

    connection.query('INSERT INTO users SET ?', user, (error, results, fields) => {
        if (error) throw error;
        res.redirect('/signup-success');
    });
});

// 로그인 페이지 렌더링
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 로그인 폼 제출 처리
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results, fields) => {
        if (error) throw error;

        if (results.length > 0) {
            // 로그인 성공
            res.send('로그인 성공!');
        } else {
            // 로그인 실패
            res.render('login', { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    });
});

app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});
