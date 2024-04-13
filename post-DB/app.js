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
  database: 'ex02_database'
});

connection.connect();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// 게시물 작성 페이지 렌더링
app.get('/post', (req, res) => {
    res.render('post');
});

// 게시물 제출 처리
app.post('/post', (req, res) => {
    const { title, tags, content } = req.body;
    const post = { title, tags, content };

    // MySQL에 데이터 저장
    connection.query('INSERT INTO posts SET ?', post, (error, results, fields) => {
        if (error) throw error;
        console.log('게시물이 성공적으로 저장되었습니다.');
        res.redirect('/post-success');
    });
});

app.get('/post-success', (req, res) => {
  res.send('게시물이 성공적으로 작성되었습니다!');
});

app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});
