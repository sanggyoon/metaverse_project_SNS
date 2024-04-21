var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var compiler = require("compilex");

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 템플릿 엔진 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

var option = { stats: true };

// 컴파일러 초기화
compiler.init(option);

// 코드 입력 페이지를 렌더링하는 라우터
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

// 컴파일 요청을 처리하고 결과 페이지로 리디렉션하는 라우터
app.post("/compilecode", function (req, res) {
    var code = req.body.code; // 사용자가 입력한 코드
    var input = req.body.input; // 입력값
    var inputRadio = req.body.inputRadio; // 입력값 사용 여부
    var lang = req.body.lang; // 선택된 언어

    // 언어에 따라 적절한 컴파일 함수 호출
    if (lang === "C" || lang === "C++" || lang === "Python") {
        var envData = { OS: "windows", cmd: lang === "Python" ? "python" : "g++", options: { timeout: 10000 } };

        if (inputRadio === "true") {
            // 입력값 사용 시
            compiler.compileWithInput(envData, code, input, lang, function (data) {
                // 결과를 콘솔에 출력
                console.log("Compilation Result:", data.output);
                // 결과를 출력 변수에 할당하여 HTML 파일로 전달
                res.render("compile_result", { code: code, output: data.output });
            });
        } else {
            // 입력값 미사용 시
            // 언어에 따라 적절한 컴파일 함수 호출
            if (lang === "Python") {
                compiler.compilePython(envData, code, function (data) {
                    // 결과를 콘솔에 출력
                    console.log("Compilation Result:", data.output);
                    // 결과를 출력 변수에 할당하여 HTML 파일로 전달
                    res.render("compile_result", { code: code, output: data.output });
                });
            } else {
                compiler.compileCPP(envData, code, function (data) {
                    // 결과를 콘솔에 출력
                    console.log("Compilation Result:", data.output);
                    // 결과를 출력 변수에 할당하여 HTML 파일로 전달
                    res.render("compile_result", { code: code, output: data.output });
                });
            }
        }
    } else {
        res.status(400).send("Unsupported language.");
    }
});

// 서버 실행
app.listen(8080, function () {
    console.log("Server running on port 8080");
});

// 서버 종료 시 임시 파일 삭제
process.on("SIGINT", function () {
    compiler.flush(function () {
        console.log("All temporary files flushed!");
        process.exit();
    });
});
