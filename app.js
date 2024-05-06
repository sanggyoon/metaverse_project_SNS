const express = require('express')
const ejs = require('ejs') 
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');

const router = express.Router();
const app = express() //express 변수 지정
const port = 3000 //포트번호 3000 (localhost:3000)

//DB 연결
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'mz_database'
})
const connection1 = mysql.createConnection({ //test_usersDB
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'ex01_database'
});
const connection2 = mysql.createConnection({ //test_postsDB
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'ex02_database'
});

connection.connect();
connection1.connect(); //test
connection2.connect(); //test

//ejs 뷰엔진 사용
app.set('view engine', 'ejs');
app.set('views', './views');

// 세션 설정
app.use(session({
  secret: 'my_secret_key', // 이 값을 통해 세션을 암호화하여 관리합니다. 복잡한 키를 사용하세요.
  resave: false,
  saveUninitialized: true
}));

//static 요소 사용
app.use(express.static(__dirname+'/public'));
app.use('/profile_image', express.static(path.join(__dirname, 'profile_image')));

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));

//로그인 페이지-----------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.render('login');
});

//로그인 폼 제출 처리
app.post('/', (req, res) => {
  const { userID, userPW } = req.body;
  //MySQL에 데이터 저장
  connection.query('SELECT * FROM users WHERE userID = ? AND userPW = ?', [userID, userPW], (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) { //로그인 성공
      req.session.user = results[0]; // 로그인한 유저의 정보를 세션에 저장
      res.redirect('/main');
    } else { //로그인 실패
      res.render('login', {error: '아이디 또는 비밀번호가 올바르지 않습니다.'});
    }
  });
});

//회원가입 페이지-----------------------------------------------------------------------------
app.get('/signup', (req, res) => {
  res.render('signup');
});

//회원가입 폼 제출 처리
app.post('/signup', (req, res) => {
  const { userID, userPW, email, user_name } = req.body;
  const user = { userID, userPW, email, user_name };
  // MySQL에 데이터 저장
  connection.query('INSERT INTO users SET ?', user, (error, results, fields) => {
    if (error) throw error;
    console.log('새로운 회원이 등록되었습니다.');
    res.redirect('/'); //회원가입이 완료되면 로그인 페이지로 이동
  });
});

//메인 페이지-----------------------------------------------------------------------------
app.get('/main', (req, res) => {
  let lastId = parseInt(req.query.lastId);
  if (isNaN(lastId) || lastId <= 0) { // lastId가 숫자가 아니거나 0 이하인 경우
    lastId = 9999999999; // 예시로 큰 숫자를 사용. 실제로는 테이블의 id 상황에 맞게 조정 필요
  }
  let query = 'SELECT posts.*, users.user_name, users.profile_image FROM posts INNER JOIN users ON posts.user_id = users.id WHERE posts.id < ? ORDER BY posts.id DESC LIMIT 10';

  connection.query(query, [lastId], (error, results, fields) => {
    if (error) throw error;
    if (req.query.ajax) {
      res.json(results);
    } else {
      res.render('index', {posts: results});
    }
  });
});


//개인 프로필 페이지-----------------------------------------------------------------------------
app.get('/profile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    // 세션에서 유저 ID 가져오기
    const userId = req.session.user.id;

    // 유저 ID를 이용하여 유저 정보 조회
    const sql = 'SELECT user_name, introduce, email, profile_image FROM users WHERE id = ?';
    connection.query(sql, [userId], function(err, result) {
      if (err) throw err;
      // EJS에 유저 정보 전달 및 렌더링
      res.render('profile.ejs', { user: result[0] });
    });
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 로그인 페이지로 이동
  }
});

//타인 프로필 페이지-----------------------------------------------------------------------------
app.get('/otherProfile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    res.render('otherProfile', { user: req.session.user }); // 유저 정보와 함께 타인 프로필 페이지 렌더링
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 세션에 유저 정보가 없으면 로그인 페이지로 이동
  }
});

//프로필 수정 페이지-----------------------------------------------------------------------------
app.get('/editProfile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    res.render('editProfile', { user: req.session.user }); // 유저 정보와 함께 프로필 수정 페이지 렌더링
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 세션에 유저 정보가 없으면 로그인 페이지로 이동
  }
});

//게시글 페이지-----------------------------------------------------------------------------
app.get('/postDetails', (req, res) => {
  if (req.session.user) {
    const postId = req.query.postId; // URL에서 postId를 가져옵니다.
    const query = `
      SELECT posts.*, users.user_name 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.id = ?`;

    connection.query(query, [postId], (error, results) => {
      if (error) throw error;
      
      if (results.length > 0) {
        const post = results[0];
        res.render('postDetails', { user: req.session.user, post: post });
      } else {
        res.send('게시글을 찾을 수 없습니다.');
      }
    });
  } else {
    res.redirect('/');
  }
});

//게시글 작성 페이지-----------------------------------------------------------------------------
app.get('/writingPost', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    res.render('writingPost', { user: req.session.user }); // 유저 정보와 함께 게시글작성 렌더링
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 세션에 유저 정보가 없으면 로그인 페이지로 이동
  }
});

app.post('/writingPost', (req, res) => {
  if (req.session.user) {
    const { title, hashtags, content, compileInput, compileOutput } = req.body;
    const user_id = req.session.user.id; // 세션에서 users id 가져오기

    // posts 테이블에 게시글 정보와 userID 저장
    const post = { title, hashtags, content, compileInput, compileOutput, user_id, created_at: new Date() };
    connection.query('INSERT INTO posts SET ?', post, (error, results, fields) => {
      if (error) {
        console.error("게시글 저장 중 오류 발생:", error);
        res.send("게시글 저장 중 오류가 발생했습니다.");
      } else {
        console.log('새 게시글이 추가되었습니다.');
        res.redirect('/main');
      }
    });
  } else {
    res.redirect('/'); // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  }
});
//---------------------------------------------------------------------------------

//서버 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})