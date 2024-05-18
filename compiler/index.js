const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const port = 3000;

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
app.get('/writingPost', (req, res) => {
    // 파일 이름과 코드를 렌더링할 때 전달
    res.render('index', { filename: '', code: '', input: '', result: null });
});

app.post('/writingPost', (req, res) => {
    console.log('Compilation request received'); // 콘솔에 요청 수신 로그 출력

    const fileName = req.body.filename + '.' + req.body.language; // 파일 확장자를 언어에 따라 결정
    let command, filePath, outputFileName;

    if (req.body.language === 'python') {
        command = 'python';
        filePath = path.join(__dirname, 'temp', fileName);
    } else if (req.body.language === 'c') {
        command = 'gcc';
        filePath = path.join(__dirname, 'temp', req.body.filename + '.c');
        outputFileName = path.join(__dirname, 'temp', req.body.filename);
    } else {
        console.error('Unsupported language:', req.body.language); // 지원되지 않는 언어에 대한 오류 로그 출력
        return res.status(400).send('Unsupported language');
    }

    const code = req.body.code;
    const input = req.body.input;

    fs.writeFile(filePath, code, (err) => {
        if (err) {
            console.error('Error writing file:', err); // 파일 쓰기 오류 로그 출력
            return res.status(500).send('Error writing file');
        }

        const process = spawn(command, [filePath, '-o', outputFileName], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

        let output = '';

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
                if (req.body.language === 'c') {
                    const executionProcess = spawn(outputFileName, [], { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });

                    executionProcess.stdout.on('data', (data) => {
                        output += data.toString();
                    });

                    executionProcess.stderr.on('data', (data) => {
                        output += data.toString();
                    });

                    executionProcess.on('close', (code) => {
                        res.render('index', { filename: req.body.filename, code: req.body.code, input: req.body.input, result: output });
                    });

                    if (input) {
                        executionProcess.stdin.write(input);
                        executionProcess.stdin.end();
                    }
                } else {
                    res.render('index', { filename: req.body.filename, code: req.body.code, input: req.body.input, result: output });
                }
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
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`); // 서버 시작 로그 출력
});
