// app.js에서 기본 router로 설정한 page.js
const express = require('express');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares'); // 구조분해할당으로 middlewares의 두 미들웨어를 가져옴

const router = express.Router();


// http://127.0.0.1:8001/profile 에 get요청이 왔을 때 
router.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile', { title: '내 정보 - sns'});
});

// http://127.0.0.1:8001/join 에 get요청이 왔을 때 
router.get('/signup', isNotLoggedIn, (req, res)=>{
    res.render('signup', {title: '회원가입 - sns'});
});

// http://127.0.0.1:8001/ 에 get요청이 왔을 때 
router.get('/', (req, res, next) => {
    const twits = [];
    res.render('main', {
        title: 'sns',
        twits,
    });
});

module.exports = router;