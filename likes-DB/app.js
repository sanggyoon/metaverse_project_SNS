// 필요한 패키지와 모듈 import
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');

const app = express();

// MySQL 연결 설정
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0000',
    database: 'ex01_database'
});

// MySQL 연결
connection.connect();

// 뷰 엔진 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 바디파서 설정
app.use(bodyParser.urlencoded({ extended: true }));

// 홈 페이지 렌더링
app.get('/', (req, res) => {
    res.render('index');
});

// 좋아요 처리
app.post('/like', (req, res) => {
    const postId = req.body.post_id; // 클라이언트로부터 전달된 게시물 ID
    const userId = req.body.user_id; // 클라이언트로부터 전달된 사용자 ID

    // post_likes 테이블에 새로운 좋아요 행 추가
    const query = 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)';
    connection.query(query, [postId, userId], (error, results, fields) => {
        if (error) {
            res.status(500).send('좋아요 처리에 실패했습니다.');
        } else {
            res.status(200).send('좋아요 처리 완료!');
        }
    });
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});
