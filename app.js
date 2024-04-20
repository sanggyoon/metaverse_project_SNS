const express = require('express')
const ejs = require('ejs') //ejs 변수 지정
const app = express() //espress 변수 지정
const port = 3000 //포트번호 3000 (localhost:3000)

const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');

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

//라우터 연결
//const pageRouter = require('./routes/page'); 

//페이지 렌더링---------------------------------------------------------
app.get('/', (req, res) => {
  res.render('login')
})//로그인 페이지

app.get('/signup', (req, res) => {
  res.render('signup');
})//회원가입 페이지

app.get('/main', (req, res) => {
  res.render('index')
})//메인 페이지

app.get('/profile', (req, res) => {
  res.render('profile')
})//본인 계정 정보 페이지

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
//--------------------------------------------------------

//로그인 폼 제출 처리
app.post('/', (req, res) => {
  const { username, password } = req.body;
  //MySQL에 데이터 저장
  connection1.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) { //로그인 성공
      res.render('index');
    } else { //로그인 실패
      res.render('/', {error: '아이디 또는 비밀번호가 올바르지 않습니다.'});
    }
  });
});

//회원가입 폼 제출 처리
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  const user = { username, email, password };
  // MySQL에 데이터 저장
  connection1.query('INSERT INTO users SET ?', user, (error, results, fields) => {
    if (error) {
      console.error('데이터베이스 쿼리 중 오류 발생:', error);
      res.render('login', {error: '로그인 처리 중 문제가 발생했습니다.'});
      return;
    } else {
      res.redirect('/'); //회원가입이 완료되면 로그인 페이지로 이동
    }    
  });
});

//게시물 폼 제출 처리
app.post('/post', (req, res) => {
  const { title, tags, content } = req.body;
  const post = { title, tags, content };
  //MySQL에 데이터 저장
  connection2.query('INSERT INTO posts SET ?', post, (error, results, fields) => {
    if (error) throw error;
    console.log('게시물이 성공적으로 저장되었습니다.');
    res.redirect('/post-success');
  });
});

//서버 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})