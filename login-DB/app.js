// app.js
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
// MySQL 연결 설정
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

    // MySQL에 데이터 저장
    connection.query('INSERT INTO users SET ?', user, (error, results, fields) => {
        if (error) throw error;
        res.redirect('/signup-success');
    });
});

app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});
app.get('/signup-success', (req, res) => {
  res.send('가입 성공!');
});