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