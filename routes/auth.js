const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');
const User = require('../models/user');

const router = express.Router();
router.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    req.session.destroy();
    req.redirect('/');
});
// 카카오 로그인 라우터, /auth/kakao
router.get('/kakao', passport.authenticate('kakao')); // 카카오 api가 get으로 되어있어서 무조건 get으로 받아옴
                                                      // passport가 알아서 kakao 로그인 창으로 redirect 함
// 카카오 로그인 후 성공 여부 결과를 받음                                                      
router.get('/main', passport.authenticate('kakao', { // 카카오 로그인 전략을 다시 수행함
                                                              // 로컬 로그인과 다른 점: passport.authenticate 메서드에 콜백 함수를 제공하지 않음
                                                              // 로그인 성공 시 내부적으로 req.login을 호출함 (내가 직접 호출할 필요X)
    failureRedirect: '/', // failureRedirect 속성: 콜백 함수 대신 로그인에 실패했을 때 어디로 이동할지를 적음
}), (req, res) => { // 성공 시 어디로 이동할지 적는 미들웨어
    res.redirect('/main'); 
});

module.exports = router;