// app.js에서 기본 router로 설정한 page.js - 기본 페이지에서 적용되는 기능들

const express = require('express');
//const { isLoggedIn, isNotLoggedIn } = require('./middlewares'); // 구조분해할당으로 middlewares의 두 미들웨어를 가져옴
const { Post, User, Hashtag } = require('../models');