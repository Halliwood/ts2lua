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
var LuaMaker_1 = require("./gen/LuaMaker");
var TsCollector_1 = require("./gen/TsCollector");
var luaFilesToCopy = ['class', 'trycatch', 'date'];
var devMode = false;
var fileCnt = 0;
var requireContent = '';
var funcReplConf = {};
var regexReplConf = {};
var luaExt = '.lua';
var luaStyle = 'xlua';
var addTip = true;
var breakUpFiles = true;
var requireAllInOne = false;
var translateRegex;
var traceUnknowRegex;
var opt = {
    ext: '.lua',
    style: 'xlua',
    addTip: true,
    breakUpFiles: true,
    requireAllInOne: false,
    funcReplConfJson: path.join(__dirname, 'lib\\func.json'),
    regexReplConfTxt: path.join(__dirname, 'lib\\regex.txt'),
    translateRegex: false,
    traceUnknowRegex: undefined
};
var tc = new TsCollector_1.TsCollector();
var lm = new LuaMaker_1.LuaMaker();
var astMap = {};
var inputFolder;
var outputFolder;
translateFiles('G:\\ly\\trunk\\TsScripts', 
// 'G:\\ly\\trunk\\Assets\\StreamingAssets\\luaScript', 
'test\\out', {
    ext: '.lua.txt',
    translateRegex: true,
    funcReplConfJson: 'lib\\func.json',
    regexReplConfTxt: 'lib\\regex.txt'
});
/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
function translate(tsCode, option) {
    processOption(option);
    var parsed = parser.parse(tsCode);
    tc.collect(parsed);
    lm.setClassMap(tc.classMap);
    var luaCode = lm.toLua(parsed, 'Source', '');
    collectUnknowRegex();
    return luaCode;
}
exports.translate = translate;
/**
 * Translate typescript files from the given input path and write lua files into the given output path.
 * @param inputPath input path which contains typescript files to translate.
 * @param outputPath output path where to write lua files into.
 */
function translateFiles(inputPath, outputPath, option) {
    processOption(option);
    // copy class.lua & trycatch.lua
    fs.mkdirSync(outputPath, { recursive: true });
    for (var _i = 0, luaFilesToCopy_1 = luaFilesToCopy; _i < luaFilesToCopy_1.length; _i++) {
        var luaFile = luaFilesToCopy_1[_i];
        fs.copyFileSync(path.join(__dirname, 'lua', luaFile) + '.lua', path.join(outputPath, luaFile) + luaExt);
    }
    inputFolder = inputPath;
    outputFolder = outputPath;
    fileCnt = 0;
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        collectClass(inputPath);
        lm.setClassMap(tc.classMap);
        doTranslateFile(inputPath);
    }
    else {
        console.log('Processing... Please wait.');
        readDir(inputPath, true);
        console.log('Making lua... Please wait.');
        lm.setClassMap(tc.classMap);
        readDir(inputPath, false);
    }
    if (requireAllInOne) {
        fs.writeFileSync(path.join(outputPath, 'require') + luaExt, requireContent);
    }
    console.log("\x1B[36m%d\x1B[0m .lua files generated.", fileCnt);
    collectUnknowRegex();
}
exports.translateFiles = translateFiles;
function readDir(dirPath, collectOrTranslate) {
    var files = fs.readdirSync(dirPath);
    for (var i = 0, len = files.length; i < len; i++) {
        var filename = files[i];
        var filePath = path.join(dirPath, filename);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile()) {
            var fileExt = path.extname(filename).toLowerCase();
            if ('.ts' == fileExt) {
                if (collectOrTranslate) {
                    collectClass(filePath);
                }
                else {
                    doTranslateFile(filePath);
                }
            }
        }
        else {
            readDir(filePath, collectOrTranslate);
        }
    }
}
function collectClass(filePath) {
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    var parsed = parser.parse(fileContent);
    astMap[filePath] = parsed;
    tc.collect(parsed);
}
function doTranslateFile(filePath) {
    // console.log('parsing: ', filePath);
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    // const parsed = parser.parse(fileContent);
    var parsed = astMap[filePath];
    var outFilePath = filePath.replace(inputFolder, outputFolder);
    var fileFolder = outFilePath.substr(0, outFilePath.lastIndexOf('\\'));
    fs.mkdirSync(fileFolder, { recursive: true });
    if (devMode) {
        var str = util.inspect(parsed, true, 100);
        fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
    }
    var luaContent = lm.toLua(parsed, filePath, inputFolder);
    var luaFilePath = outFilePath.replace(/\.ts$/, luaExt);
    fs.writeFileSync(luaFilePath, luaContent);
    if (requireAllInOne) {
        var importStr = path.relative(inputFolder, filePath).replace(/\\+/g, '/');
        requireContent += 'require("' + importStr.substr(0, importStr.length - 3) + '")\n';
    }
    fileCnt++;
}
function processOption(option) {
    for (var key in option) {
        opt[key] = option[key];
    }
    if (option.funcReplConfJson) {
        var frj = fs.readFileSync(option.funcReplConfJson, 'utf-8');
        funcReplConf = JSON.parse(frj);
    }
    if (option.regexReplConfTxt) {
        var rrt = fs.readFileSync(option.regexReplConfTxt, 'utf-8');
        var rrLines = rrt.split(/[\r\n]+/);
        for (var _i = 0, rrLines_1 = rrLines; _i < rrLines_1.length; _i++) {
            var rrline = rrLines_1[_i];
            if (rrline) {
                var rrPair = rrline.split(/,\s*/);
                if (rrPair.length > 1) {
                    regexReplConf[rrPair[0]] = rrPair[1];
                }
            }
        }
    }
    lm.setEnv(devMode, opt, funcReplConf, regexReplConf);
}
function collectUnknowRegex() {
    if (traceUnknowRegex && lm.unknowRegexs.length > 0) {
        lm.unknowRegexs.sort();
        var unknowRegexContent = '';
        for (var _i = 0, _a = lm.unknowRegexs; _i < _a.length; _i++) {
            var ur = _a[_i];
            unknowRegexContent += ur + ',\n';
        }
        fs.writeFileSync(traceUnknowRegex, unknowRegexContent, 'utf-8');
        console.log("\x1B[36m%d\x1B[0m unknown regular expression.", lm.unknowRegexs.length);
    }
}
