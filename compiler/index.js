// 서버 측 코드
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const port = 8080;

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb', type: 'application/json' }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set response encoding to UTF-8
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
});

// Routes
app.get('/', (req, res) => {
    // 파일 이름과 파이썬 코드를 렌더링할 때 전달
    res.render('index', { filename: '', code: '', input: '', result: null });
});

app.post('/compile', (req, res) => {
    const fileName = req.body.filename + '.py'; // 사용자가 입력한 파일 이름
    const pythonScript = req.body.code;
    const input = req.body.input;

    const filePath = path.join(__dirname, 'temp', fileName);

    fs.writeFile(filePath, pythonScript, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).send('Error writing file');
        }

        const pythonProcess = spawn('python', [filePath], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

        let output = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.on('close', (code) => {
            // 결과를 클라이언트로 보냄
            res.render('index', { filename: req.body.filename, code: req.body.code, input: req.body.input, result: output });
        });

        if (input) {
            pythonProcess.stdin.write(input);
            pythonProcess.stdin.end();
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
