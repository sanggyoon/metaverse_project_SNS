const express = require('express')
const ejs = require('ejs') 
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const passport = require('passport');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express() //espress 변수 지정
const port = 3000 //포트번호 3000 (localhost:3000)
const passportConfig = require('./passport'); // require('./passport/index.js')와 같음
// const { sequelize } = require('./models');  // require('./models/index.js')와 같음, 구조분해 할당으로 sequelize 가져옴
require('dotenv').config();
passportConfig(); // 패스포트 설정, 한 번 실행해두면 ()에 있는 deserializeUser 계속 실행

//DB 연결
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'mz_database'
})


connection.connect();


//ejs 뷰엔진 사용
app.set('view engine', 'ejs');
app.set('views', './views');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }));

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

//카카오 로그인 연동
app.get('/auth/kakao', passport.authenticate('kakao'));

app.get('/auth/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


//메인 페이지-----------------------------------------------------------------------------
app.get('/main', (req, res) => {
  if (req.session.user) { //세션에 로그인 정보 확인
    let lastId = parseInt(req.query.lastId);
    if (isNaN(lastId) || lastId <= 0) {
      lastId = 9999999999;
    }
    let query = 'SELECT posts.*, users.user_name, users.profile_image FROM posts INNER JOIN users ON posts.user_id = users.id WHERE posts.id < ? ORDER BY posts.id DESC LIMIT 10';
  
    // 검색 키워드를 가져옴
    const searchKeyword = req.query.search;
  
    // 검색 키워드가 있는 경우, 쿼리에 검색 조건 추가
    if (searchKeyword) {
      query = `SELECT posts.*, users.user_name, users.profile_image FROM posts INNER JOIN users ON posts.user_id = users.id WHERE posts.id < ${lastId} AND hashtags LIKE '%${searchKeyword}%' ORDER BY posts.id DESC LIMIT 10`;
    }
  
    connection.query(query, [lastId], (error, results, fields) => {
      if (error) {
        console.error('검색 중 오류 발생:', error);
        res.status(500).send('검색 중 오류가 발생했습니다.');
      } else {
        if (req.query.ajax) {
          res.json(results);
        } else {
          res.render('index', {posts: results});
        }
      }
    });
  } else { //세션에 유저 정보가 없다면
    res.redirect('/'); // 로그인 페이지로 이동
  }
});



//개인 프로필 페이지-----------------------------------------------------------------------------
app.get('/profile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    // 세션에서 유저 ID 가져오기
    const userId = req.session.user.id;

    // 유저 정보 조회 쿼리
    const userSql = 'SELECT user_name, introduce, email, profile_image FROM users WHERE id = ?';
    
    // 유저가 작성한 게시글 조회 쿼리
    const postsSql = `
        SELECT p.id, p.title, p.content, p.hashtags, p.created_at, u.user_name, u.profile_image
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
    `;

    // 유저 정보 조회
    connection.query(userSql, [userId], function(err, userResult) {
      if (err) throw err;
    
      // 유저가 작성한 게시글 조회 
      connection.query(postsSql, [userId], function(err, postsResult) {
        if (err) throw err;
      
        // EJS에 유저 정보와 게시글 정보 전달 및 렌더링
        res.render('profile.ejs', {
          user: userResult[0],
          posts: postsResult
        });
      });
    });
  } else { // 세션에 유저 정보가 없다면
    res.redirect('/'); // 로그인 페이지로 이동
  }
});


//타인 프로필 페이지-----------------------------------------------------------------------------
app.get('/otherProfile', (req, res) => {
  if (req.session.user) {
      const userId = req.query.userId;

      if (!userId) {
          return res.status(400).send('Bad Request: userId is required');
      }

      const userQuery = "SELECT user_name, profile_image, email, introduce FROM users WHERE id = ?";
      connection.query(userQuery, [userId], (err, userResult) => {
          if (err) throw err;

          if (userResult.length === 0) {
              return res.status(404).send('User not found');
          }

          const postsQuery = `
            SELECT posts.id, posts.title, posts.content, posts.hashtags, posts.created_at, users.profile_image, users.user_name
            FROM posts
            INNER JOIN users ON posts.user_id = users.id
            WHERE user_id = ?
            ORDER BY created_at DESC
          `;

          connection.query(postsQuery, [userId], (err, postsResult) => {
              if (err) throw err;

              // 조회된 사용자 정보와 게시글 정보를 otherProfile.ejs로 전달하여 렌더링
              res.render('otherProfile', { 
                  user: req.session.user, 
                  otherUser: userResult[0], 
                  posts: postsResult 
              });
          });
      });
  } else {
      res.redirect('/');
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

app.post('/updateProfile', (req, res) => {
  if (req.session.user) { // 세션에 유저 정보가 있으면
    const { user_name, introduce, email } = req.body; // 폼에서 수정된 정보를 가져옴
    const userID = req.session.user.userID; // 세션에서 userID를 가져옴

    // 데이터베이스 연결 및 쿼리 실행
    const query = "UPDATE users SET user_name = ?, introduce = ?, email = ? WHERE userID = ?";
    connection.query(query, [user_name, introduce, email, userID], (error, results) => {
      if (error) {
        console.error('데이터베이스 업데이트 중 오류 발생: ', error);
        return res.send('데이터베이스 업데이트 중 오류가 발생했습니다.');
      }
      // 세션 정보 업데이트
      req.session.user = { ...req.session.user, user_name, introduce, email };
      res.redirect('/profile'); // 프로필 수정 페이지로 리다이렉트
    });
  } else { // 세션에 유저 정보가 없다면
    res.redirect('/'); // 로그인 페이지로 이동
  }
});

//게시글 페이지-----------------------------------------------------------------------------
app.get('/postDetails', (req, res) => {
  if (req.session.user) {
    const postId = req.query.postId;
    let postQuery = `
      SELECT posts.*, users.user_name, users.profile_image 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.id = ?`;
    let commentsQuery = `
      SELECT comments.*, users.user_name, users.profile_image 
      FROM comments 
      JOIN users ON comments.user_id = users.id 
      WHERE comments.post_id = ? 
      ORDER BY comments.id DESC`;

    connection.query(postQuery, [postId], (error, postResults) => {
      if (error) throw error;
      
      if (postResults.length > 0) {
        const post = postResults[0];
        
        // 게시글에 대한 댓글을 불러옵니다.
        connection.query(commentsQuery, [postId], (error, commentResults) => {
          if (error) throw error;
          res.render('postDetails', { user: req.session.user, post: post, comments: commentResults });
        });
      } else {
        res.send('게시글을 찾을 수 없습니다.');
      }
    });
  } else {
    res.redirect('/');
  }
});

// 댓글 작성 폼 제출
app.post('/addComment', (req, res) => {
  if (req.session.user) {
    const { content, postId } = req.body;
    const userId = req.session.user.id; // 세션에서 사용자 ID를 가져옵니다.
    const query = `INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)`;
    
    connection.query(query, [content, userId, postId], (error, results) => {
      if (error) throw error;
      res.redirect('/postDetails?postId=' + postId); // 댓글을 추가한 후, 게시글 상세 페이지로 리다이렉트합니다.
    });
  } else {
    res.redirect('/login');
  }
});

//게시글작성-----------------------------------------------------------------------------------------------------
app.get('/writingPost', (req, res) => {
  if (req.session.user) {
    return res.render('writingPost', { 
      user_id: req.session.user, 
      filename: '', 
      code: '', // 코드 변수를 빈 문자열로 전달
      input: '', 
      result: null,
      title: '', 
      hashtags: '', 
      content: '' 
    });
  } else {
    return res.redirect('/');
  }
});




let output = null; // output 변수 정의 및 초기화

// POST 요청 핸들러
app.post('/writingPost', (req, res) => {
  // 만약 세션에 유저 정보가 없으면 로그인 페이지로 리다이렉트
  if (!req.session.user) {
      return res.redirect('/');
  }

  // 제목, 태그, 내용, 코드 등의 입력 값을 변수에 할당
  const { filename, title, hashtags, content, code, input, action } = req.body;

  // 컴파일 버튼을 눌렀을 때
  if (action === 'compile') {
      console.log('Compilation request received'); // 콘솔에 컴파일 요청 수신 로그 출력

      const fileName = filename ; // 파일 확장자를 언어에 따라 결정
      let command, filePath, outputFileName;

      if (req.body.language === 'python') {
          command = 'python';
          filePath = path.join(__dirname, 'temp', fileName + '.py');
      } else if (req.body.language === 'c') {
          command = 'gcc';
          filePath = path.join(__dirname, 'temp', filename + '.c');
          outputFileName = path.join(__dirname, 'temp', filename);
      } else {
          console.error('Unsupported language:', req.body.language); // 지원되지 않는 언어에 대한 오류 로그 출력
          return res.status(400).send('Unsupported language');
      }

      // 코드 변수 설정
      const userCode = code; // userCode 변수에 코드 할당

      fs.writeFile(filePath, userCode, (err) => {
          if (err) {
              console.error('Error writing file:', err); // 파일 쓰기 오류 로그 출력
              return res.status(500).send('Error writing file');
          }

          const process = spawn(command, [filePath, '-o', outputFileName], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

          output = ''; // output 변수 초기화

          process.stdout.on('data', (data) => {
              output += data.toString();
              console.log(data.toString()); // 컴파일 결과를 콘솔에 출력
          });

          process.stderr.on('data', (data) => {
              output += data.toString();
              console.error(data.toString()); // 컴파일 오류를 콘솔에 출력
          });

          process.on('close', (code) => {
              if (code === 0) {
                  // 컴파일이 성공하면 결과를 클라이언트로 반환
                  res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: output, action: 'compile', title: title, hashtags: hashtags, content: content });
              } else {
                  // 컴파일이 실패하면 오류 메시지를 클라이언트로 반환
                  res.status(500).send('Compilation failed:\n' + output);
              }
          });

          if (input && req.body.language !== 'c') {
              process.stdin.write(input);
              process.stdin.end();
          }
      });
  } else {
      // 게시물 작성 버튼을 눌렀을 때
      const user_id = req.session.user.id; // 직접 사용자 ID를 변수에 할당
      const post = { user_id: req.session.user.id, filename: filename, code: code, input: input, result: output, title: title, hashtags: hashtags, content: content }; // 결과값은 null로 저장
      connection.query('INSERT INTO posts SET ?', post, (error, results, fields) => {
          if (error) {
              console.error("게시글 저장 중 오류 발생:", error);
              res.send("게시글 저장 중 오류가 발생했습니다.");
          } else {
              console.log('새 게시글이 추가되었습니다.');
              res.redirect('/main');
          }
      });
  }
});

//---------------------------------------------------------------------------------

//서버 실행
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.post('/likePost', (req, res) => {
  const postId = req.body.post_id;

  // postId에 해당하는 게시물의 좋아요 수를 데이터베이스에서 가져와 증가시킴
  connection.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId], (error, results, fields) => {
      if (error) {
          console.error('Error updating likes:', error);
          res.json({ success: false, message: 'Failed to update likes' });
      } else {
          // 업데이트된 좋아요 수를 클라이언트에게 응답으로 보냄
          connection.query('SELECT likes FROM posts WHERE id = ?', [postId], (error, results, fields) => {
              if (error) {
                  console.error('Error fetching updated likes:', error);
                  res.json({ success: false, message: 'Failed to fetch updated likes' });
              } else {
                  if (results.length > 0) {
                      const updatedLikesCount = results[0].likes; // 수정된 코드
                      res.json({ success: true, likes: updatedLikesCount });
                  } else {
                      console.error('No likes found for the post');
                      res.json({ success: false, message: 'No likes found for the post' });
                  }
              }
          });
      }
  });
});
