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

// JSON 데이터를 파싱하기 위한 미들웨어 추가
app.use(express.json());

//static 요소 사용
app.use(express.static(__dirname+'/public'));
app.use('/profile_image', express.static(path.join(__dirname, 'profile_image')));

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));

//시간 포맷
app.locals.formatDate = function(date){
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  return new Date(date).toLocaleString('ko-KR', options).replace(/\./g, '-').replace(/(\d{4})-(\d{2})-(\d{2})\s(\d{2}:\d{2}:\d{2})/, '$1-$2-$3 $4');
};

// 게시물 소유권 확인 미들웨어
function checkOwnership(req, res, next) {
  const postId = req.params.id;
  const userId = req.session.user.id; // 세션에서 사용자 ID 가져오기

  // 게시물 조회 쿼리
  const getPostQuery = 'SELECT user_id FROM posts WHERE id = ?';

  connection.query(getPostQuery, [postId], (error, results) => {
      if (error) {
          console.error('Error fetching post:', error);
          return res.status(500).json({ success: false, message: 'Failed to fetch post' });
      }

      if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Post not found' });
      }

      const post = results[0];

      // 게시물의 작성자와 세션 사용자가 일치하는지 확인
      if (post.user_id === userId) {
          return next(); // 일치하면 다음 미들웨어로 이동
      } else {
          return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
      }
  });
}

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
      res.render('login', { loginFailed: true });
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

//헤더-----------------------------
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return console.log(err);
      }
      res.redirect('/');
  });
});

//메인 페이지--------------------------------------------------------------------------------
app.get('/main', (req, res) => {
  if (req.session.user) {
    let lastId = parseInt(req.query.lastId);
    if (isNaN(lastId) || lastId <= 0) {
      lastId = 9999999999;
    }
    const searchKeyword = req.query.search;
    let params = [lastId];

    let baseQuery = `SELECT posts.*, users.user_name, users.profile_image, 
                     COUNT(DISTINCT comments.id) AS comments_count, 
                     COUNT(DISTINCT post_likes.id) AS likes
                     FROM posts 
                     INNER JOIN users ON posts.user_id = users.id
                     LEFT JOIN comments ON posts.id = comments.post_id
                     LEFT JOIN post_likes ON posts.id = post_likes.post_id
                     WHERE posts.id < ?`;

    if (searchKeyword) {
      baseQuery += " AND posts.hashtags LIKE ?";
      params.push(`%${searchKeyword}%`);
    }

    baseQuery += ` GROUP BY posts.id ORDER BY posts.id DESC LIMIT 10`;

    let popularPostsQuery = `
        SELECT posts.*, 
               COUNT(DISTINCT post_likes.id) AS likes_count, 
               COUNT(DISTINCT comments.id) AS comments_count
        FROM posts 
        LEFT JOIN post_likes ON posts.id = post_likes.post_id 
        LEFT JOIN comments ON posts.id = comments.post_id
        WHERE posts.id < ?`;

    if (searchKeyword) {
        popularPostsQuery += " AND posts.hashtags LIKE ?";
    }

    popularPostsQuery += ` GROUP BY posts.id ORDER BY likes_count DESC`;

    connection.query(popularPostsQuery, params, (popularError, popularResults) => {
        if (popularError) {
            console.error('인기 게시물 가져오기 오류:', popularError);
            res.status(500).send('인기 게시물을 가져오는 중 오류가 발생했습니다.');
        } else {
            connection.query(baseQuery, params, (error, results) => {
                if (error) {
                    console.error('검색 중 오류 발생:', error);
                    res.status(500).send('검색 중 오류가 발생했습니다.');
                } else {
                    if (req.query.ajax) {
                        res.json({ posts: results, popularPosts: popularResults });
                    } else {
                        res.render('index', { posts: results, popularPosts: popularResults });
                    }
                }
            });
        }
    });
  } else {
      res.redirect('/');
  }
});

// 좋아요 기능 추가
app.post('/like', (req, res) => {
  const postId = req.body.postId;
  const userId = req.session.user.id;

  // 좋아요 여부 체크
  const checkLikeQuery = 'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?';
  connection.query(checkLikeQuery, [postId, userId], (checkError, checkResults) => {
      if (checkError) {
          console.error('좋아요 체크 중 오류 발생:', checkError);
          res.status(500).send('좋아요 체크 중 오류가 발생했습니다.');
      } else if (checkResults.length > 0) {
          // 이미 좋아요를 누른 경우, 좋아요 취소
          const deleteLikeQuery = 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?';
          connection.query(deleteLikeQuery, [postId, userId], (deleteError) => {
              if (deleteError) {
                  console.error('좋아요 삭제 중 오류 발생:', deleteError);
                  res.status(500).send('좋아요 삭제 중 오류가 발생했습니다.');
              } else {
                  res.json({ liked: false });
              }
          });
      } else {
          // 좋아요 추가
          const insertLikeQuery = 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)';
          connection.query(insertLikeQuery, [postId, userId], (insertError) => {
              if (insertError) {
                  console.error('좋아요 추가 중 오류 발생:', insertError);
                  res.status(500).send('좋아요 추가 중 오류가 발생했습니다.');
              } else {
                  res.json({ liked: true });
              }
          });
      }
  });
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
    const userId = req.session.user.id;

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
      ORDER BY comments.created_at DESC`;
    

    connection.query(postQuery, [postId], (error, postResults) => {
      if (error) throw error;

      if (postResults.length > 0) {
        const post = postResults[0];
        const isOwner = userId === post.user_id;

        // 게시글에 대한 댓글을 불러옵니다.
        connection.query(commentsQuery, [postId], (error, commentResults) => {
          if (error) throw error;
          res.render('postDetails', { user: req.session.user, post: post, comments: commentResults, isOwner: isOwner });
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
  if (!req.session.user) {
      return res.redirect('/');
  }

  const { filename, title, hashtags, content, code, input, action, language } = req.body;

  if (action === 'compile') {
      console.log('컴파일 요청 수신');

      let command, filePath, outputFileName;

      if (language === 'python') {
          command = 'python';
          filePath = path.join(__dirname, 'temp', filename + '.py');
      } else if (language === 'c') {
          command = 'gcc';
          filePath = path.join(__dirname, 'temp', filename + '.c');
          outputFileName = path.join(__dirname, 'temp', filename);
      } else {
          console.error('지원되지 않는 언어:', language);
          return res.status(400).send('지원되지 않는 언어');
      }

      const userCode = code;

      fs.writeFile(filePath, userCode, (err) => {
          if (err) {
              console.error('파일 쓰기 오류:', err);
              return res.status(500).send('파일 쓰기 오류');
          }

          if (language === 'python') {
              const process = spawn(command, [filePath], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

              let output = '';

              process.stdout.on('data', (data) => {
                  output += data.toString();
                  console.log(data.toString());
              });

              process.stderr.on('data', (data) => {
                  output += data.toString();
                  console.error(data.toString());
              });

              process.on('close', (code) => {
                  if (code === 0) {
                      // 이미 실행 결과가 저장된 경우 그대로 사용
                      req.session.result = output; // 결과를 세션에 저장
                      res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: output, action: 'compile', title: title, hashtags: hashtags, content: content });
                  } else {
                      // 오류가 발생한 경우에도 결과를 세션에 저장하고 렌더링
                      req.session.result = output;
                      res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: '컴파일 실패:\n' + output, action: 'compile', title: title, hashtags: hashtags, content: content });
                  }
              });

              if (input) {
                  process.stdin.write(input);
                  process.stdin.end();
              }
          } else if (language === 'c') {
              const compileProcess = spawn(command, [filePath, '-o', outputFileName]);

              compileProcess.stderr.on('data', (data) => {
                  output += data.toString();
                  console.error(data.toString());
              });

              compileProcess.on('close', (code) => {
                  if (code === 0) {
                      const runProcess = spawn(outputFileName, [], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

                      let output = '';

                      runProcess.stdout.on('data', (data) => {
                          output += data.toString();
                          console.log(data.toString());
                      });

                      runProcess.stderr.on('data', (data) => {
                          output += data.toString();
                          console.error(data.toString());
                      });

                      runProcess.on('close', (code) => {
                          if (code === 0) {
                              // 이미 실행 결과가 저장된 경우 그대로 사용
                              req.session.result = output; // 결과를 세션에 저장
                              res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: output, action: 'compile', title: title, hashtags: hashtags, content: content });
                          } else {
                            req.session.result = output;
                            res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: '실행 실패:\n' + output, action: 'compile', title: title, hashtags: hashtags, content: content });
                          }
                      });

                      if (input) {
                          runProcess.stdin.write(input);
                          runProcess.stdin.end();
                      }
                  } else {
                    req.session.result = output;
                    res.render('writingPost', { user_id: req.session.user.id, filename: filename, code: userCode, input: input, result: '컴파일 실패:\n' + output, action: 'compile', title: title, hashtags: hashtags, content: content });
                  }
              });
          }
      });
  } else {
      const user_id = req.session.user.id;
      const post = { user_id, filename, code, input, result: req.session.result, title, hashtags, content }; // 이미 저장된 결과를 사용
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

//게시글 수정---------------------------------------------------------------------------------
app.get('/editPost/:id', checkOwnership, (req, res) => {
  const postId = req.params.id;

  // postId를 사용하여 데이터베이스에서 해당 게시물을 검색합니다.
  const queryString = 'SELECT * FROM posts WHERE id = ?';
  connection.query(queryString, [postId], (error, results, fields) => {
    if (error) {
      console.error('Error fetching post:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch post' });
    } else {
      // postId에 해당하는 게시물을 찾습니다.
      const post = results[0]; // 결과가 배열이므로 첫 번째 요소를 가져옵니다.

      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      // 검색된 결과를 수정 폼 페이지로 렌더링합니다.
      return res.render('editPost', {
        user_id: req.session.user,
        post: post // 게시글 정보를 템플릿으로 전달합니다.
      });
    }
  });
});

// 수정된 게시글을 처리하는 라우트
app.post('/updatePost/:id', checkOwnership, (req, res) => {
  const postId = req.params.id;
  const { title, hashtags, content, code, input, filename, language } = req.body;

  // SQL 쿼리 수정
  const queryString = 'UPDATE posts SET title = ?, hashtags = ?, content = ?, code = ?, input = ?, filename = ? WHERE id = ?';
  const values = [title, hashtags, content, code, input, filename, postId];

  connection.query(queryString, values, (error, results, fields) => {
    if (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ success: false, message: 'Failed to update post' });
    } else {
      console.log('Post updated successfully:', results);
      res.redirect(`/postDetails?postId=${postId}`);
    }
  });
});
// 게시물 삭제 요청 처리
app.get('/deletePost/:id', checkOwnership, (req, res) => {
  const postId = req.params.id;

  // post_likes 삭제
  const deletePostLikesQuery = 'DELETE FROM post_likes WHERE post_id = ?';
  connection.query(deletePostLikesQuery, [postId], (error, postLikesResults) => {
    if (error) {
      console.error('Error deleting post likes:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete post likes' });
    }

    // 댓글 삭제
    const deleteCommentsQuery = 'DELETE FROM comments WHERE post_id = ?';
    connection.query(deleteCommentsQuery, [postId], (error, commentResults) => {
      if (error) {
        console.error('Error deleting comments:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete comments' });
      }

      // 게시물 삭제
      const deletePostQuery = 'DELETE FROM posts WHERE id = ?';
      connection.query(deletePostQuery, [postId], (error, postResults) => {
        if (error) {
          console.error('Error deleting post:', error);
          return res.status(500).json({ success: false, message: 'Failed to delete post' });
        }

        console.log('Post, related comments, and post likes deleted successfully');
        res.redirect('/main');
      });
    });
  });
});


//서버 실행------------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})