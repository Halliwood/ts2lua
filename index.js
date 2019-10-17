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
var luaFilesToCopy = ['dmc_lua\\lua_class', 'trycatch', 'date', 'stringutil', 'tableutil'];
var devMode = false;
var fileCnt = 0;
var requireContent = '';
var funcReplConf = {};
var regexReplConf = {};
var opt = {
    ext: '.lua',
    style: 'xlua',
    addTip: true,
    funcReplConfJson: path.join(__dirname, 'lib\\func.json'),
    regexReplConfTxt: path.join(__dirname, 'lib\\regex.txt'),
    translateRegex: false,
    traceUnknowRegex: undefined,
    ignoreNoUsedExp: true
};
var tc = new TsCollector_1.TsCollector();
var lm = new LuaMaker_1.LuaMaker();
var astMap = {};
var inputFolder;
var outputFolder;
// translateFiles('G:\\ly\\trunk\\TsScripts', 
//   // 'G:\\ly\\trunk\\Assets\\StreamingAssets\\luaScript', 
//   'test\\out',
//   {
//     ext: '.lua.txt', 
//     translateRegex: true, 
//     funcReplConfJson: 'lib\\func.json',
//     regexReplConfTxt: 'lib\\regex.txt'
//   });
/**
 * Translate the input code string.
 * @param tsCode input code string.
 */
function translate(tsCode, option) {
    processOption(option);
    var parsed = parser.parse(tsCode);
    tc.collect(parsed);
    lm.setClassMap(tc.classMap, tc.moduleMap, tc.enumMap);
    var luaCode = lm.toLuaBySource(parsed);
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
    if (!fs.existsSync(outputPath))
        fs.mkdirSync(outputPath, { recursive: true });
    for (var _i = 0, luaFilesToCopy_1 = luaFilesToCopy; _i < luaFilesToCopy_1.length; _i++) {
        var luaFile = luaFilesToCopy_1[_i];
        var dstPath = path.join(outputPath, luaFile) + opt.ext;
        var dstPathDir = path.parse(dstPath).dir;
        if (!fs.existsSync(dstPathDir))
            fs.mkdirSync(dstPathDir, { recursive: true });
        fs.copyFileSync(path.join(__dirname, 'lua', luaFile) + '.lua', dstPath);
    }
    inputFolder = inputPath;
    outputFolder = outputPath;
    fileCnt = 0;
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        collectClass(inputPath);
        lm.setClassMap(tc.classMap, tc.moduleMap, tc.enumMap);
        doTranslateFile(inputPath);
    }
    else {
        console.log('Processing... Please wait.');
        readDir(inputPath, true);
        console.log('Making lua... Please wait.');
        lm.setClassMap(tc.classMap, tc.moduleMap, tc.enumMap);
        readDir(inputPath, false);
    }
    console.log("\x1B[36m%d\x1B[0m .ts files translated.", fileCnt);
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
    if (filePath.match(/\.d\.ts$/i))
        return;
    // console.log('parsing: ', filePath);
    var parsed = astMap[filePath];
    var outFilePath = filePath.replace(inputFolder, outputFolder);
    var outFilePP = path.parse(outFilePath);
    if (devMode) {
        var str = util.inspect(parsed, true, 100);
        fs.writeFileSync(outFilePath.replace(/\.ts$/, '.txt'), str);
    }
    var luaContent = lm.toLuaByFile(parsed, filePath, inputFolder);
    if (luaContent) {
        var luaFilePath = outFilePath.replace(/\.ts$/, opt.ext);
        if (!fs.existsSync(outFilePP.dir))
            fs.mkdirSync(outFilePP.dir, { recursive: true });
        fs.writeFileSync(luaFilePath, luaContent);
    }
    var dotIndex = outFilePP.name.indexOf('.');
    var diffDir = outFilePP.dir + '\\' + (dotIndex >= 0 ? outFilePP.name.substr(0, dotIndex) : outFilePP.name);
    for (var className in lm.classContentMap) {
        var classContent = lm.classContentMap[className];
        var classFilePath = diffDir + '\\' + className + opt.ext;
        var fileFolder = classFilePath.substr(0, classFilePath.lastIndexOf('\\'));
        if (!fs.existsSync(fileFolder))
            fs.mkdirSync(fileFolder, { recursive: true });
        fs.writeFileSync(classFilePath, classContent);
    }
    fileCnt++;
}
function processOption(option) {
    for (var key in option) {
        opt[key] = option[key];
    }
    if (opt.funcReplConfJson) {
        var frj = fs.readFileSync(opt.funcReplConfJson, 'utf-8');
        funcReplConf = JSON.parse(frj);
        console.log("Using \x1B[36m%s\x1B[0m ...", opt.funcReplConfJson);
        // console.log(frj);
    }
    if (opt.regexReplConfTxt) {
        var rrt = fs.readFileSync(opt.regexReplConfTxt, 'utf-8');
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
        console.log("Using \x1B[36m%s\x1B[0m ...", opt.regexReplConfTxt);
        // console.log(rrt);
    }
    lm.setEnv(devMode, opt, funcReplConf, regexReplConf);
}
function collectUnknowRegex() {
    if (opt.traceUnknowRegex && lm.unknowRegexs.length > 0) {
        lm.unknowRegexs.sort();
        var unknowRegexContent = '';
        for (var _i = 0, _a = lm.unknowRegexs; _i < _a.length; _i++) {
            var ur = _a[_i];
            unknowRegexContent += ur + ',\n';
        }
        fs.writeFileSync(opt.traceUnknowRegex, unknowRegexContent, 'utf-8');
        console.log("\x1B[36m%d\x1B[0m unknown regular expression.", lm.unknowRegexs.length);
    }
}
