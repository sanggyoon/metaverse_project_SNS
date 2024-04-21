var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var compiler = require("compilex");

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var option = { stats: true };
compiler.init(option);

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/compilecode", function (req, res) {
    var code = req.body.code;
    var input = req.body.input;
    var inputRadio = req.body.inputRadio;
    var lang = req.body.lang;

    console.log("Received request with data:");
    console.log("Code:", code);
    console.log("Input:", input);
    console.log("Input Radio:", inputRadio);
    console.log("Language:", lang);

    if (lang === "C" || lang === "C++") {
        var envData = { OS: "windows", cmd: "g++", options: { timeout: 10000 } };

        if (inputRadio === "true") {
            compiler.compileCPPWithInput(envData, code, input, function (data) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                if (data.error) {
                    console.log("Error:", data.error);
                    res.send(data.error);
                } else {
                    res.send(data.output);
                }
            });
        } else {
            compiler.compileCPP(envData, code, function (data) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                if (data.error) {
                    console.log("Error:", data.error);
                    res.send(data.error);
                } else {
                    res.send(data.output);
                }
            });
        }
    } else if (lang === "Python") {
        var envData = { OS: "windows" };

        if (inputRadio === "true") {
            compiler.compilePythonWithInput(envData, code, input, function (data) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                if (data.error) {
                    console.log("Error:", data.error);
                    res.send(data.error);
                } else {
                    res.send(data.output);
                }
            });
        } else {
            compiler.compilePython(envData, code, function (data) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                if (data.error) {
                    console.log("Error:", data.error);
                    res.send(data.error);
                } else {
                    res.send(data.output);
                }
            });
        }
    }
});

app.get("/fullStat", function (req, res) {
    compiler.fullStat(function (data) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(data);
    });
});

app.listen(8080, function () {
    console.log("Server running on port 8080");
});

compiler.flush(function () {
    console.log("All temporary files flushed!");
});
