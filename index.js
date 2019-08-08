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
var inputFolder;
var outputFolder;
// translateFiles('G:\\ly\\trunk\\TsScripts', 'test\\out');
/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
function translate(tsCode) {
    var parsed = parser.parse(tsCode);
    return lm.toLua(parsed, 'Source', devMode);
}
exports.translate = translate;
// let inputFolder: string;
// let outputFolder: string;
var devMode = false;
var fileCnt = 0;
/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
function translateFiles(inputPath, outputPath) {
    inputFolder = inputPath;
    outputFolder = outputPath;
    fileCnt = 0;
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        doTranslateFile(inputPath);
    }
    else {
        readDir(inputPath);
    }
    console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
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
    if (devMode) {
        var str = util.inspect(parsed, true, 100);
        fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
    }
    var luaContent = lm.toLua(parsed, filePath, devMode);
    var luaFilePath = outFilePath.replace(/\.ts$/, '.lua');
    fs.writeFileSync(luaFilePath, luaContent);
    fileCnt++;
}
