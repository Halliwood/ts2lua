"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = require("path");
var util = require("util");
var parser = require("@typescript-eslint/typescript-estree");
var lm = __importStar(require("./gen/LuaMaker"));
// const args = process.argv.splice(2);
// const inputFolder = 'G:\\ly\\trunk\\TsScripts';
// const inputFolder = 'test\\in';
// const outputFolder = 'test\\out';
// readDir(inputFolder);
function translate(tsCode) {
    var parsed = parser.parse(tsCode);
    return lm.toLua(parsed);
}
exports.translate = translate;
var inputFolder;
var outputFolder;
var saveASTFile = false;
function translateFiles(inputPath, outputPath) {
    inputFolder = inputPath;
    outputFolder = outputPath;
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        doTranslateFile(inputPath);
    }
    else {
        readDir(inputPath);
    }
}
exports.translateFiles = translateFiles;
function readDir(dirPath) {
    var files = fs.readdirSync(dirPath);
    for (var i = 0, len = files.length; i < len; i++) {
        var filename = files[i];
        var filePath = path.join(dirPath, filename);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile()) {
            var fileExt = path.extname(filename).toLowerCase();
            if ('.ts' == fileExt) {
                doTranslateFile(filePath);
            }
        }
        else {
            readDir(filePath);
        }
    }
}
function doTranslateFile(filePath) {
    // console.log('parsing: ', filePath);
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    var parsed = parser.parse(fileContent);
    var outFilePath = filePath.replace(inputFolder, outputFolder);
    var fileFolder = outFilePath.substr(0, outFilePath.lastIndexOf('\\'));
    fs.mkdirSync(fileFolder, { recursive: true });
    if (saveASTFile) {
        var str = util.inspect(parsed, true, 100);
        fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
    }
    var luaContent = lm.toLua(parsed);
    var luaFilePath = outFilePath.replace(/\.ts$/, '.lua');
    fs.writeFileSync(luaFilePath, luaContent);
}
