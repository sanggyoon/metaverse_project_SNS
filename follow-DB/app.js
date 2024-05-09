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

// 팔로우 페이지 렌더링
app.get('/follow', (req, res) => {
    // 사용자 목록을 데이터베이스에서 가져옴
    connection.query('SELECT * FROM users', (error, results, fields) => {
        if (error) throw error;
        // 팔로우 페이지를 렌더링하고 사용자 목록을 전달
        res.render('follow', { users: results });
    });
});

// 사용자를 팔로우하는 요청 처리
app.post('/follow', (req, res) => {
    const userId = req.body.user_id; // 클라이언트로부터 전달된 사용자 ID
    // 사용자를 팔로우하는 로직 구현
    // 팔로우 수 증가 등의 작업 수행
    // 증가된 팔로우 수를 데이터베이스에 업데이트
    connection.query('UPDATE users SET followers = followers + 1 WHERE id = ?', userId, (error, results, fields) => {
        if (error) throw error;
        // 팔로우 성공 후에는 적절한 응답을 반환하거나 리다이렉트
        res.redirect('/follow');
    });
});

// 사용자를 언팔로우하는 요청 처리
app.post('/unfollow', (req, res) => {
  const userId = req.body.user_id; // 클라이언트로부터 전달된 사용자 ID
  // 해당 사용자의 팔로워 수를 가져옴
  connection.query('SELECT followers FROM users WHERE id = ?', userId, (error, results, fields) => {
      if (error) throw error;
      const followersCount = results[0].followers;
      // 팔로워 수가 0보다 큰 경우에만 언팔로우를 수행
      if (followersCount > 0) {
          // 사용자를 언팔로우하는 로직 구현
          // 팔로우 수 감소 등의 작업 수행
          // 감소된 팔로우 수를 데이터베이스에 업데이트
          connection.query('UPDATE users SET followers = followers - 1 WHERE id = ?', userId, (error, results, fields) => {
              if (error) throw error;
              // 언팔로우 성공 후에는 적절한 응답을 반환하거나 리다이렉트
              res.redirect('/follow');
          });
      } else {
          // 팔로워 수가 0 이하일 때 언팔로우를 수행하지 않고 적절한 응답을 반환
          res.send('이 사용자의 팔로워 수가 이미 0이므로 언팔로우할 수 없습니다.');
      }
  });
});

// 서버 시작
app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});