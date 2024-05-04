const express = require('express')
const ejs = require('ejs') 
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const router = express.Router();

const app = express() //espress 변수 지정
const port = 3000 //포트번호 3000 (localhost:3000)

// 세션 설정
app.use(session({
  secret: 'my_secret_key', // 이 값을 통해 세션을 암호화하여 관리합니다. 복잡한 키를 사용하세요.
  resave: false,
  saveUninitialized: true
}));

//DB 연결
const connection1 = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'ex01_database'
});
const connection2 = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'ex02_database'
});

connection1.connect();
connection2.connect();

//ejs 뷰엔진 사용
app.set('view engine', 'ejs');
app.set('views', './views');

//static 요소 사용
app.use(express.static(__dirname+'/public'));

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));

//라우터 연결 (미구현)
//const pageRouter = require('./routes/page'); 

//페이지 렌더링---------------------------------------------------------------------
app.get('/', (req, res) => {
  res.render('login')
})//로그인 페이지

app.get('/signup', (req, res) => {
  res.render('signup');
})//회원가입 페이지

app.get('/main', (req, res) => {
  let lastId = parseInt(req.query.lastId);
  if (isNaN(lastId) || lastId <= 0) { // lastId가 숫자가 아니거나 0 이하인 경우
    lastId = 9999999999; // 예시로 큰 숫자를 사용. 실제로는 테이블의 id 상황에 맞게 조정 필요
  }
  let query = 'SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT 10';

  connection2.query(query, [lastId], (error, results, fields) => {
    if (error) throw error;
    if (req.query.ajax) {
      res.json(results);
    } else {
      res.render('index', {posts: results});
    }
  });
});
//메인 페이지

app.get('/profile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    res.render('profile', { user: req.session.user }); // 유저 정보와 함께 프로필 페이지 렌더링
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 세션에 유저 정보가 없으면 로그인 페이지로 이동
  }
});

app.get('/otherProfile', (req, res) => {
  res.render('otherProfile')
})//타인 계정 정보 페이지

app.get('/editProfile', (req, res) => {
  res.render('editProfile')
})//계정 정보 수정 페이지

app.get('/postDetails', (req, res) => {
  res.render('postDetails')
})//게시글 디테일 페이지

app.get('/writingPost', (req, res) => {
  res.render('writingPost')
})//게시글 작성 페이지

//---------------------------------------------------------------------------------

//로그인 폼 제출 처리
app.post('/', (req, res) => {
  const { userID, userPW } = req.body;
  //MySQL에 데이터 저장
  connection1.query('SELECT * FROM users WHERE userID = ? AND userPW = ?', [userID, userPW], (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) { //로그인 성공
      req.session.user = results[0]; // 로그인한 유저의 정보를 세션에 저장
      res.redirect('/main');
    } else { //로그인 실패
      res.render('login', {error: '아이디 또는 비밀번호가 올바르지 않습니다.'});
    }
  });
});

//회원가입 폼 제출 처리
app.post('/signup', (req, res) => {
  const { userID, userPW, email, username } = req.body;
  const user = { userID, userPW, email, username };
  // MySQL에 데이터 저장
  connection1.query('INSERT INTO users SET ?', user, (error, results, fields) => {
    if (error) throw error;
    console.log('새로운 회원이 등록되었습니다.');
    res.redirect('/'); //회원가입이 완료되면 로그인 페이지로 이동
  });
});

//서버 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})