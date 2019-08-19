"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_estree_1 = require("@typescript-eslint/typescript-estree");
var util = require("util");
var path = require("path");
var LuaMaker = /** @class */ (function () {
    function LuaMaker() {
        this.noBraceTypes = [typescript_estree_1.AST_NODE_TYPES.MemberExpression, typescript_estree_1.AST_NODE_TYPES.ThisExpression, typescript_estree_1.AST_NODE_TYPES.Identifier, typescript_estree_1.AST_NODE_TYPES.CallExpression, typescript_estree_1.AST_NODE_TYPES.TSAsExpression];
        // TODO: Typeof's return value may be different between ts and lua
        this.tsType2luaType = {
            'undefined': 'nil',
            'object': 'table'
        };
        this.luaKeyWords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while'];
        this.pv = 0;
        this.operatorPriorityMap = {};
        this.usedIdMap = {};
        this.importAsts = [];
        this.importContents = [];
        this.allClasses = [];
        this.classQueue = [];
        this.moduleQueue = [];
        this.hasContinue = false;
        this.inSwitchCase = false;
        this.inStatic = false;
        this.isDevMode = false;
        this.luaStyle = 'xlua';
        this.addTip = true;
        this.requireAllInOne = false;
        this.funcReplConf = {};
        this.regexReplConf = {};
        this.translateRegex = false;
        this.unknowRegexs = [];
        this.setPriority(['( … )'], this.pv++);
        this.setPriority(['… . …', '… [ … ]', 'new … ( … )', '… ( … )'], this.pv++);
        this.setPriority(['new …'], this.pv++);
        this.setPriority(['… ++', '… --'], this.pv++);
        this.setPriority(['! …', '~ …', '+ …', '- …', '++ …', '-- …', 'typeof …', 'void …', 'delete …', 'await …'], this.pv++);
        this.setPriority(['… ** …'], this.pv++);
        this.setPriority(['… * …', '… / …', '… % …'], this.pv++);
        this.setPriority(['… + …', '… - …'], this.pv++);
        this.setPriority(['… << …', '… >> …', '… >>> …'], this.pv++);
        this.setPriority(['… < …', '… <= …', '… > …', '… >= …', '… in …', '… instanceof …'], this.pv++);
        this.setPriority(['… == …', '… != …', '… === …', '… !== …'], this.pv++);
        this.setPriority(['… & …'], this.pv++);
        this.setPriority(['… ^ …'], this.pv++);
        this.setPriority(['… | …'], this.pv++);
        this.setPriority(['… && …'], this.pv++);
        this.setPriority(['… || …'], this.pv++);
        this.setPriority(['… ? … : …'], this.pv++);
        this.setPriority(['… = …', '… += …', '… -= …', '… *= …', '… /= …', '… %= …', '… <<= …', '… >>= …', '… >>>= …', '… &= …', '… ^= …', '… |= …'], this.pv++);
        this.setPriority(['yield …', 'yield* …'], this.pv++);
        this.setPriority(['...'], this.pv++);
        this.setPriority(['… , …'], this.pv++);
    }
    LuaMaker.prototype.setPriority = function (keys, value) {
        for (var i = 0, len = keys.length; i < len; i++) {
            this.operatorPriorityMap[keys[i]] = value;
        }
    };
    LuaMaker.prototype.getPriority = function (raw) {
        var idx = this.operatorPriorityMap[raw];
        if (idx < 0) {
            idx = 999;
            console.error('no prioritys: ' + raw);
        }
        return idx;
    };
    LuaMaker.prototype.calPriority = function (ast) {
        if ('__calPriority' in ast) {
            return ast.__calPriority;
        }
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
                {
                    var ue = ast;
                    ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
                {
                    var ue = ast;
                    ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
                {
                    var be = ast;
                    ast.__calPriority = this.getPriority('… ' + be.operator + ' …');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
                {
                    var ae = ast;
                    ast.__calPriority = this.getPriority('… ' + ae.operator + ' …');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
                {
                    var le = ast;
                    ast.__calPriority = this.getPriority('… ' + le.operator + ' …');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                {
                    var me = ast;
                    ast.__calPriority = this.getPriority(me.computed ? '… [ … ]' : '… . …');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
                {
                    ast.__calPriority = this.getPriority('… ? … : …');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.CallExpression:
                {
                    ast.__calPriority = this.getPriority('… ( … )');
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.NewExpression:
                {
                    var ne = ast;
                    if (ne.arguments.length > 0) {
                        ast.__calPriority = this.getPriority('new … ( … )');
                    }
                    else {
                        ast.__calPriority = this.getPriority('new …');
                    }
                }
                break;
            case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
                {
                    ast.__calPriority = this.getPriority('… , …');
                }
                break;
        }
        return ast.__calPriority;
    };
    LuaMaker.prototype.setEnv = function (devMode, style, addTip, pRequireAllInOne, funcReplConf, regexReplConf, translateRegex) {
        this.isDevMode = devMode;
        this.luaStyle = style;
        this.addTip = addTip;
        this.requireAllInOne = pRequireAllInOne;
        this.funcReplConf = funcReplConf;
        this.regexReplConf = regexReplConf;
        this.translateRegex = translateRegex;
    };
    LuaMaker.prototype.toLua = function (ast, pfilePath, rootPath) {
        this.filePath = pfilePath;
        this.usedIdMap = {};
        this.importContents.length = 0;
        this.importAsts.length = 0;
        this.allClasses.length = 0;
        this.classQueue.length = 0;
        var outStr = '';
        var content = this.codeFromAST(ast);
        content = content.replace(/console[\.|:]log/g, 'print');
        content = this.formatTip(content);
        if (!this.requireAllInOne) {
            if (this.allClasses.length > 0) {
                this.importContents.push('class');
            }
            for (var _i = 0, _a = this.importAsts; _i < _a.length; _i++) {
                var ia = _a[_i];
                var importIsUsed = false;
                for (var _b = 0, _c = ia.specifiers; _b < _c.length; _b++) {
                    var s = _c[_b];
                    if (this.usedIdMap[s.local.name]) {
                        importIsUsed = true;
                        break;
                    }
                }
                if (importIsUsed) {
                    var p = ia.source.value;
                    if (this.importContents.indexOf(p) < 0) {
                        this.importContents.push(p);
                    }
                }
            }
            this.importContents.sort();
            for (var _d = 0, _e = this.importContents; _d < _e.length; _d++) {
                var p = _e[_d];
                if (p.indexOf('./') == 0 || p.indexOf('../') == 0) {
                    p = path.relative(rootPath, path.join(path.dirname(pfilePath), p)).replace(/\\+/g, '/');
                }
                outStr += 'require("' + p + '")\n';
            }
        }
        outStr += content;
        return outStr;
    };
    LuaMaker.prototype.codeFromAST = function (ast) {
        var str = '';
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.ArrayExpression:
                str += this.codeFromArrayExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
                str += this.codeFromArrayPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ArrowFunctionExpression:
                str += this.codeFromArrowFunctionExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
                str += this.codeFromAssignmentExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
                str += this.codeFromAssignmentPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.AwaitExpression:
                str += this.codeFromAwaitExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BigIntLiteral:
                str += this.codeFromBigIntLiteral(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
                str += this.codeFromBinaryExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
                str += this.codeFromBlockStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BreakStatement:
                str += this.codeFromBreakStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.CallExpression:
                str += this.codeFromCallExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.CatchClause:
                str += this.codeFromCatchClause(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassBody:
                str += this.codeFromClassBody(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassDeclaration:
                str += this.codeFromClassDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassExpression:
                str += this.codeFromClassExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassProperty:
                str += this.codeFromClassProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
                str += this.codeFromConditionalExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ContinueStatement:
                str += this.codeFromContinueStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.DebuggerStatement:
                str += this.codeFromDebuggerStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Decorator:
                str += this.codeFromDecorator(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.DoWhileStatement:
                str += this.codeFromDoWhileStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.EmptyStatement:
                str += this.codeFromEmptyStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportAllDeclaration:
                str += this.codeFromExportAllDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportDefaultDeclaration:
                str += this.codeFromExportDefaultDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportNamedDeclaration:
                str += this.codeFromExportNamedDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportSpecifier:
                str += this.codeFromExportSpecifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
                str += this.codeFromExpressionStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForInStatement:
                str += this.codeFromForInStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForOfStatement:
                str += this.codeFromForOfStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForStatement:
                str += this.codeFromForStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration:
                str += this.codeFromFunctionDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
                str += this.codeFromFunctionExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                str += this.codeFromIdentifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.IfStatement:
                str += this.codeFromIfStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Import:
                str += this.codeFromImport(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportDeclaration:
                str += this.codeFromImportDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportDefaultSpecifier:
                str += this.codeFromImportDefaultSpecifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportNamespaceSpecifier:
                str += this.codeFromImportNamespaceSpecifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportSpecifier:
                str += this.codeFromImportSpecifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.LabeledStatement:
                str += this.codeFromLabeledStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Literal:
                str += this.codeFromLiteral(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
                str += this.codeFromLogicalExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                str += this.codeFromMemberExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MetaProperty:
                str += this.codeFromMetaProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MethodDefinition:
                str += this.codeFromMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.NewExpression:
                str += this.codeFromNewExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ObjectExpression:
                str += this.codeFromObjectExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ObjectPattern:
                str += this.codeFromObjectPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Program:
                str += this.codeFromProgram(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Property:
                str += this.codeFromProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.RestElement:
                str += this.codeFromRestElement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ReturnStatement:
                str += this.codeFromReturnStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
                str += this.codeFromSequenceExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SpreadElement:
                str += this.codeFromSpreadElement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Super:
                str += this.codeFromSuper(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SwitchCase:
                str += this.codeFromSwitchCase(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SwitchStatement:
                str += this.codeFromSwitchStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TaggedTemplateExpression:
                str += this.codeFromTaggedTemplateExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TemplateElement:
                str += this.codeFromTemplateElement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TemplateLiteral:
                str += this.codeFromTemplateLiteral(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ThisExpression:
                str += this.codeFromThisExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ThrowStatement:
                str += this.codeFromThrowStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TryStatement:
                str += this.codeFromTryStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
                str += this.codeFromUnaryExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
                str += this.codeFromUpdateExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.VariableDeclaration:
                str += this.codeFromVariableDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.VariableDeclarator:
                str += this.codeFromVariableDeclarator(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.WhileStatement:
                str += this.codeFromWhileStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.WithStatement:
                str += this.codeFromWithStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.YieldExpression:
                str += this.codeFromYieldExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition:
                str += this.codeFromTSAbstractMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSAsExpression:
                str += this.codeFromTSAsExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSDeclareFunction:
                str += this.codeFromTSDeclareFunction(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSEnumDeclaration:
                str += this.codeFromTSEnumDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleBlock:
                str += this.codeFromTSModuleBlock(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleDeclaration:
                str += this.codeFromTSModuleDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSInterfaceDeclaration:
                str += this.codeFromTSInterfaceDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSTypeAssertion:
                str += this.codeFromTSTypeAssertion(ast);
                break;
            default:
                console.log(util.inspect(ast, true, 3));
                throw new Error('unrecornized type: ' + ast.type);
                break;
        }
        return str;
    };
    LuaMaker.prototype.codeFromArrayExpression = function (ast) {
        var str = '';
        for (var i = 0, len = ast.elements.length; i < len; i++) {
            if (str) {
                str += ', ';
            }
            str += this.codeFromAST(ast.elements[i]);
        }
        return '{' + str + '}';
    };
    LuaMaker.prototype.codeFromArrayPattern = function (ast) {
        this.assert(false, ast, 'Not support ArrayPattern yet!');
        return '';
    };
    LuaMaker.prototype.codeFromArrowFunctionExpression = function (ast) {
        var str = 'function(';
        var defaultParamsStr = '';
        if (ast.params) {
            for (var i = 0, len = ast.params.length; i < len; i++) {
                if (i > 0) {
                    str += ', ';
                }
                var oneParam = ast.params[i];
                oneParam.__parent = ast;
                str += this.codeFromAST(oneParam);
                if (oneParam.type == typescript_estree_1.AST_NODE_TYPES.AssignmentPattern) {
                    var paramIdStr = this.codeFromAST(oneParam.left);
                    defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
                    defaultParamsStr += this.indent(paramIdStr + '=' + this.codeFromAST(oneParam.right)) + '\n';
                    defaultParamsStr += 'end\n';
                }
            }
        }
        str += ')\n';
        if (ast.body) {
            var bodyStr = this.codeFromAST(ast.body);
            if (defaultParamsStr) {
                bodyStr = defaultParamsStr + bodyStr;
            }
            str += this.indent(bodyStr) + '\n';
        }
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
        str += 'end\n';
        return str;
    };
    LuaMaker.prototype.codeFromAssignmentExpression = function (ast) {
        return this.codeFromBinaryExpression(ast);
    };
    LuaMaker.prototype.codeFromAssignmentPattern = function (ast) {
        var str = this.codeFromAST(ast.left);
        var parent = ast.__parent;
        if (!parent || (parent.type != typescript_estree_1.AST_NODE_TYPES.FunctionExpression && parent.type != typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration)) {
            str += ' = ' + this.codeFromAST(ast.right);
        }
        return str;
    };
    LuaMaker.prototype.codeFromAwaitExpression = function (ast) {
        this.assert(false, ast, 'Not support AwaitExpression yet!');
        return '';
    };
    LuaMaker.prototype.codeFromBigIntLiteral = function (ast) {
        return this.codeFromLiteral(ast);
    };
    LuaMaker.prototype.codeFromBinaryExpression = function (ast) {
        var optStr = ast.operator;
        this.assert('>>>=' != optStr, ast, 'Not support >>>= yet!');
        ast.left.__parent = ast;
        var left = this.codeFromAST(ast.left);
        var right = this.codeFromAST(ast.right);
        if (optStr == 'in') {
            return right + '[' + left + ']';
        }
        var selffOpts = ['+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='];
        var isSelfOperator = false;
        if (selffOpts.indexOf(optStr) >= 0) {
            // self operator
            isSelfOperator = true;
            optStr = optStr.substr(0, optStr.length - 1);
        }
        if (optStr == '+') {
            if ((ast.left.__isString || ast.right.__isString)) {
                // TODO: Take care of string combination
                optStr = '..';
                ast.left.__isString = true;
            }
        }
        else if (optStr == '!=') {
            optStr = '~=';
        }
        else if (optStr == '===') {
            optStr = '==';
        }
        else if (optStr == '!==') {
            optStr = '~=';
        }
        if (optStr == 'instanceof') {
            return left + ':instanceof(' + right + ')';
        }
        var str = '';
        var astType = ast.type;
        if (astType == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression && ast.right.type == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression) {
            // 处理 a = b = c
            str = right + '\n';
            right = this.codeFromAST(ast.right.left);
        }
        if (isSelfOperator) {
            return str + left + ' = ' + left + ' ' + optStr + ' ' + right;
        }
        return str + left + ' ' + optStr + ' ' + right;
    };
    LuaMaker.prototype.codeFromBlockStatement = function (ast) {
        var str = '';
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var bstr = this.codeFromAST(ast.body[i]);
            if (bstr) {
                if (i > 0) {
                    str += '\n';
                }
                str += bstr;
            }
        }
        return str;
    };
    LuaMaker.prototype.codeFromBreakStatement = function (ast) {
        this.assert(!ast.label, ast, 'Not support break label yet!');
        if (this.inSwitchCase) {
            return 'return';
        }
        return 'break';
    };
    LuaMaker.prototype.codeFromCallExpression = function (ast) {
        ast.callee.__parent = ast;
        var calleeStr = this.codeFromAST(ast.callee);
        var str = '';
        var allAgmStr = '';
        for (var i = 0, len = ast.arguments.length; i < len; i++) {
            var arg = ast.arguments[i];
            var argStr = this.codeFromAST(arg);
            if (arg.type == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression) {
                str += argStr + '\n';
                argStr = this.codeFromAST(arg.left);
            }
            else if (arg.type == typescript_estree_1.AST_NODE_TYPES.UpdateExpression) {
                str += argStr + '\n';
                argStr = this.codeFromAST(arg.argument);
            }
            if (allAgmStr) {
                allAgmStr += ', ';
            }
            allAgmStr += argStr;
        }
        var funcName = '';
        var funcNameRegexResult = calleeStr.match(/:(\w+)$/);
        if (funcNameRegexResult) {
            funcName = funcNameRegexResult[1];
        }
        var funcRepl = this.funcReplConf[funcName];
        if (funcRepl == 'table.concat') {
            // Array push change into table.concat
            str += 'table.concat(' + calleeStr.substr(0, calleeStr.length - 5) + ', ' + allAgmStr + ')';
        }
        else if ('xlua' == this.luaStyle && !allAgmStr && funcRepl == 'typeof') {
            str = 'typeof(' + calleeStr.substr(0, calleeStr.length - 8) + ')';
        }
        else {
            if (typeof (funcRepl) === 'string') {
                calleeStr = calleeStr.replace(/(?<=:)\w+$/, funcRepl);
            }
            str = calleeStr + '(';
            str += allAgmStr;
            str += ')';
        }
        return str;
    };
    LuaMaker.prototype.codeFromCatchClause = function (ast) {
        var str = 'function($param$)\n'.replace('$param$', this.codeFromAST(ast.param));
        str += this.codeFromBlockStatement(ast.body);
        return str;
    };
    LuaMaker.prototype.codeFromClassBody = function (ast) {
        var str = '';
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var cbodyStr = this.codeFromAST(ast.body[i]);
            if (cbodyStr) {
                if (i > 0) {
                    str += '\n';
                }
                str += cbodyStr;
            }
        }
        return str;
    };
    LuaMaker.prototype.codeFromClassDeclaration = function (ast) {
        var str = '$BaseClass$:subclass("$ClassName$")\n';
        if (ast.typeParameters) {
            // typeParameters?: TSTypeParameterDeclaration;
        }
        if (ast.superTypeParameters) {
            // TSTypeParameterInstantiation;
        }
        if (ast.id) {
            // Identifier
            var className = this.codeFromAST(ast.id);
            this.allClasses.push(className);
            this.classQueue.push(className);
            str = str.replace('$ClassName$', className);
        }
        else {
            this.assert(false, ast, 'Class name is necessary!');
        }
        str += this.codeFromClassBody(ast.body);
        if (ast.superClass) {
            str = str.replace('$BaseClass$', this.codeFromAST(ast.superClass));
        }
        else {
            str = str.replace('$BaseClass$', 'Class');
        }
        // if(ast.implements) {
        //   ExpressionWithTypeArguments[];
        // }
        // if(ast.abstract) {
        //   // boolean;
        // }
        if (ast.declare) {
            // boolean
            this.assert(false, ast);
        }
        if (ast.decorators) {
            // Decorator[];
            this.assert(false, ast);
        }
        this.classQueue.pop();
        return str;
    };
    LuaMaker.prototype.codeFromClassExpression = function (ast) {
        // this.pintHit(ast);
        return this.codeFromClassDeclaration(ast);
    };
    LuaMaker.prototype.codeFromClassProperty = function (ast) {
        var str = '';
        if (ast.value) {
            var className = this.classQueue[this.classQueue.length - 1];
            if (ast.static) {
                str = className + '.' + this.codeFromAST(ast.key) + ' = ' + this.codeFromAST(ast.value) + ';';
            }
            else {
                str = className + '.prototype.' + this.codeFromAST(ast.key) + ' = ' + this.codeFromAST(ast.value) + ';';
            }
            // readonly?: boolean;
            // decorators?: Decorator[];
            // accessibility?: Accessibility;
            // optional?: boolean;
            // definite?: boolean;
            // typeAnnotation?: TSTypeAnnotation;
        }
        return str;
    };
    LuaMaker.prototype.codeFromConditionalExpression = function (ast) {
        // TODO: 0 or '' are considered true in lua while false in TypeScript
        var testStr = this.codeFromAST(ast.test);
        var str = '(' + testStr + ' and {' + this.codeFromAST(ast.consequent) + '} or {' + this.codeFromAST(ast.alternate) + '})[1]';
        str += this.wrapTip('lua中0和空字符串也是true，此处' + testStr + '需要确认');
        return str;
    };
    LuaMaker.prototype.codeFromContinueStatement = function (ast) {
        this.hasContinue = true;
        return 'break';
    };
    LuaMaker.prototype.codeFromDebuggerStatement = function (ast) {
        this.assert(false, ast, 'Not support DebuggerStatement yet!');
        return '';
    };
    LuaMaker.prototype.codeFromDecorator = function (ast) {
        this.assert(false, ast, 'Not support Decorator yet!');
        return '';
    };
    LuaMaker.prototype.codeFromDoWhileStatement = function (ast) {
        this.assert(false, ast, 'Not support DoWhileStatement yet!');
        return '';
    };
    LuaMaker.prototype.codeFromEmptyStatement = function (ast) {
        return '';
    };
    LuaMaker.prototype.codeFromExportAllDeclaration = function (ast) {
        this.assert(false, ast, 'Not support ExportAllDeclaration yet!');
        return '';
    };
    LuaMaker.prototype.codeFromExportDefaultDeclaration = function (ast) {
        return '';
    };
    LuaMaker.prototype.codeFromExportNamedDeclaration = function (ast) {
        ast.declaration.__exported = true;
        return this.codeFromAST(ast.declaration);
    };
    LuaMaker.prototype.codeFromExportSpecifier = function (ast) {
        this.assert(false, ast, 'Not support ExportSpecifier yet!');
        return '';
    };
    LuaMaker.prototype.codeFromExpressionStatement = function (ast) {
        return this.codeFromAST(ast.expression);
    };
    LuaMaker.prototype.codeFromForInStatement = function (ast) {
        ast.left.__parent = ast;
        var str = 'for ' + this.codeFromAST(ast.left) + ' in pairs(' + this.codeFromAST(ast.right) + ') do\n';
        str += this.indent(this.codeFromAST(ast.body)) + '\n';
        str += 'end';
        return str;
    };
    LuaMaker.prototype.codeFromForOfStatement = function (ast) {
        ast.left.__parent = ast;
        var str = 'for _tmpi, ' + this.codeFromAST(ast.left) + ' in pairs(' + this.codeFromAST(ast.right) + ') do\n';
        str += this.indent(this.codeFromAST(ast.body)) + '\n';
        str += 'end';
        return str;
    };
    LuaMaker.prototype.codeFromForStatement = function (ast) {
        this.hasContinue = false;
        var str = '';
        if (ast.init && ast.init.type != typescript_estree_1.AST_NODE_TYPES.Identifier) {
            str += this.codeFromAST(ast.init) + '\n';
        }
        str += 'repeat\n';
        var repeatBodyStr = this.codeFromAST(ast.body);
        if (this.hasContinue) {
            repeatBodyStr = 'repeat\n' + this.indent(repeatBodyStr + '\nbreak') + '\nuntil true';
        }
        if (ast.update) {
            repeatBodyStr += '\n';
            repeatBodyStr += this.codeFromAST(ast.update);
        }
        str += this.indent(repeatBodyStr) + '\n';
        str += 'until ';
        if (ast.test) {
            str += 'not(' + this.codeFromAST(ast.test) + ')';
        }
        else {
            str += 'false';
        }
        return str;
    };
    LuaMaker.prototype.codeFromFunctionDeclaration = function (ast) {
        return this.codeFromFunctionExpression(ast);
    };
    LuaMaker.prototype.codeFromFunctionExpression = function (ast) {
        return this.codeFromFunctionExpressionInternal(null, false, ast);
    };
    LuaMaker.prototype.codeFromFunctionExpressionInternal = function (funcName, isStatic, ast) {
        this.inStatic = isStatic;
        var str = '';
        if (!funcName && ast.id) {
            funcName = this.codeFromAST(ast.id);
        }
        if (funcName) {
            if ('constructor' == funcName) {
                funcName = 'ctor';
            }
            var className = this.classQueue[this.classQueue.length - 1];
            if (className) {
                // 成员函数
                if (isStatic) {
                    str = 'function ' + className + '.' + funcName + '(';
                }
                else {
                    str = 'function ' + className + '.prototype:' + funcName + '(';
                }
            }
            else {
                var moduleName = this.moduleQueue[this.moduleQueue.length - 1];
                if (moduleName) {
                    // 模块函数
                    str = 'function ' + moduleName + ':' + funcName + '(';
                }
                else {
                    // 普通函数
                    str = 'function ' + funcName + '(';
                }
            }
        }
        else {
            str = 'function(';
        }
        var defaultParamsStr = '';
        if (ast.params) {
            for (var i = 0, len = ast.params.length; i < len; i++) {
                if (i > 0) {
                    str += ', ';
                }
                var oneParam = ast.params[i];
                oneParam.__parent = ast;
                str += this.codeFromAST(oneParam);
                if (oneParam.type == typescript_estree_1.AST_NODE_TYPES.AssignmentPattern) {
                    var paramIdStr = this.codeFromAST(oneParam.left);
                    defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
                    defaultParamsStr += this.indent(paramIdStr + '=' + this.codeFromAST(oneParam.right)) + '\n';
                    defaultParamsStr += 'end\n';
                }
            }
        }
        str += ')';
        var bodyStr = '';
        if (ast.body) {
            bodyStr = this.codeFromAST(ast.body);
            if (defaultParamsStr) {
                bodyStr = defaultParamsStr + bodyStr;
            }
        }
        if (bodyStr) {
            str += '\n' + this.indent(bodyStr) + '\nend\n';
        }
        else {
            str += ' end';
        }
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
        this.assert(!ast.declare, ast, 'Not support declare yet!');
        this.inStatic = false;
        return str;
    };
    LuaMaker.prototype.codeFromIdentifier = function (ast) {
        var str = ast.name;
        if (this.luaKeyWords.indexOf(str) >= 0) {
            str = 'tsvar_' + str;
        }
        else if (str.substr(0, 1) == '$') {
            str = 'tsvar_' + str.substr(1);
        }
        this.usedIdMap[str] = true;
        return str;
    };
    LuaMaker.prototype.codeFromIfStatement = function (ast) {
        var testStr = this.codeFromAST(ast.test);
        var str = 'if ' + testStr + ' then\n';
        str += this.indent(this.codeFromAST(ast.consequent));
        if (ast.alternate) {
            str += '\nelse';
            var altStr = this.codeFromAST(ast.alternate);
            if (ast.alternate.type != typescript_estree_1.AST_NODE_TYPES.IfStatement) {
                str += '\n';
                str += this.indent(altStr);
            }
            else {
                str += ' ' + altStr;
            }
        }
        str += '\nend';
        return str;
    };
    LuaMaker.prototype.codeFromImport = function (ast) {
        this.assert(false, ast, 'Not support Import yet!');
        return '';
    };
    LuaMaker.prototype.codeFromImportDeclaration = function (ast) {
        this.importAsts.push(ast);
        return '';
    };
    LuaMaker.prototype.codeFromImportDefaultSpecifier = function (ast) {
        this.assert(false, ast, 'Not support ImportDefaultSpecifier yet!');
        return '';
    };
    LuaMaker.prototype.codeFromImportNamespaceSpecifier = function (ast) {
        this.assert(false, ast, 'Not support ImportNamespaceSpecifier yet!');
        return '';
    };
    LuaMaker.prototype.codeFromImportSpecifier = function (ast) {
        this.assert(false, ast, 'Not support ImportSpecifier yet!');
        return '';
    };
    LuaMaker.prototype.codeFromLabeledStatement = function (ast) {
        this.assert(false, ast, 'Not support LabeledStatement yet!');
        return '';
    };
    LuaMaker.prototype.codeFromLiteral = function (ast) {
        if (ast.regex) {
            var regexRepl = this.getRegexReplacor(ast.regex.pattern);
            if (regexRepl) {
                return '\'' + regexRepl + '\'';
            }
            if (this.unknowRegexs.indexOf(ast.regex.pattern) < 0) {
                this.unknowRegexs.push(ast.regex.pattern);
            }
            if (this.translateRegex) {
                return '\'' + ast.regex.pattern.replace(/\\(?!\\)/g, '%') + '\'';
            }
            return ast.raw + this.wrapTip('tslua无法自动转换正则表达式，请手动处理。');
        }
        if (typeof (ast.value) == 'string') {
            ast.__isString = true;
        }
        if (ast.__parent && ast.__parent.type == typescript_estree_1.AST_NODE_TYPES.Property) {
            return ast.value;
        }
        var l = ast.raw;
        if (null === ast.value) {
            l = 'nil';
        }
        return l;
    };
    LuaMaker.prototype.codeFromLogicalExpression = function (ast) {
        var left = this.codeFromAST(ast.left);
        if (this.calPriority(ast.left) >= this.calPriority(ast)) {
            left = '(' + left + ')';
        }
        var right = this.codeFromAST(ast.right);
        if (this.calPriority(ast.right) >= this.calPriority(ast)) {
            right = '(' + right + ')';
        }
        var optStr = ast.operator;
        if (optStr == '&&') {
            optStr = 'and';
        }
        else if (optStr == '||') {
            optStr = 'or';
        }
        var str = left + ' ' + optStr + ' ' + right;
        return str;
    };
    LuaMaker.prototype.codeFromMemberExpression = function (ast) {
        var str = this.codeFromAST(ast.object);
        if ('xlua' == this.luaStyle && str == 'UnityEngine') {
            str = 'CS.UnityEngine';
        }
        if (this.noBraceTypes.indexOf(ast.object.type) < 0) {
            str = '(' + str + ')';
        }
        if (ast.computed) {
            var propertyStr = this.codeFromAST(ast.property);
            if (propertyStr.length == 1) {
                // Auto modify xx[i] to xx[i + 1]
                propertyStr += '+1';
            }
            else {
                // Add some tips
                propertyStr += this.wrapTip(str + '下标访问可能不正确');
            }
            str += '[' + propertyStr + ']';
        }
        else {
            if (ast.property.type == typescript_estree_1.AST_NODE_TYPES.Identifier && ast.property.name == 'length') {
                if ((!ast.__parent || ast.__parent.type != typescript_estree_1.AST_NODE_TYPES.AssignmentExpression)) {
                    str = '#' + str;
                }
                else {
                    str += '.length' + this.wrapTip('修改数组长度需要手动处理。');
                }
            }
            else {
                // TODO: do something with static members
                var pstr = this.codeFromAST(ast.property);
                var parent_1 = ast.__parent;
                if (parent_1 && parent_1.type == typescript_estree_1.AST_NODE_TYPES.CallExpression && (!this.inStatic || ast.object.type != typescript_estree_1.AST_NODE_TYPES.ThisExpression)) {
                    str += ':';
                }
                else {
                    str += '.';
                }
                str += pstr;
            }
        }
        return str;
    };
    LuaMaker.prototype.codeFromMetaProperty = function (ast) {
        this.assert(false, ast, 'Not support MetaProperty yet!');
        return '';
    };
    LuaMaker.prototype.codeFromMethodDefinition = function (ast) {
        var funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        if (ast.value.type == "TSEmptyBodyFunctionExpression") {
            this.assert(false, ast, 'Not support TSEmptyBodyFunctionExpression yet!');
        }
        return this.codeFromFunctionExpressionInternal(funcName, ast.static, ast.value);
    };
    LuaMaker.prototype.codeFromNewExpression = function (ast) {
        var callee = this.codeFromAST(ast.callee);
        if (this.calPriority(ast.callee) > this.calPriority(ast)) {
            callee = '(' + callee + ')';
        }
        var str = callee + '(';
        for (var i = 0, len = ast.arguments.length; i < len; i++) {
            if (i > 0) {
                str += ', ';
            }
            str += this.codeFromAST(ast.arguments[i]);
        }
        str += ')';
        return str;
    };
    LuaMaker.prototype.codeFromObjectExpression = function (ast) {
        var str = '{';
        for (var i = 0, len = ast.properties.length; i < len; i++) {
            if (i > 0) {
                str += ', ';
            }
            str += this.codeFromAST(ast.properties[i]);
        }
        return str + '}';
    };
    LuaMaker.prototype.codeFromObjectPattern = function (ast) {
        this.assert(false, ast, 'Not support ObjectPattern yet!');
        return '';
    };
    LuaMaker.prototype.codeFromProgram = function (ast) {
        var str = '';
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var stm = ast.body[i];
            var bodyStr = this.codeFromAST(stm);
            if (bodyStr) {
                if (i > 0) {
                    str += '\n';
                }
                str += bodyStr;
            }
        }
        return str;
    };
    LuaMaker.prototype.codeFromProperty = function (ast) {
        ast.key.__parent = ast;
        return this.codeFromAST(ast.key) + '=' + this.codeFromAST(ast.value);
    };
    LuaMaker.prototype.codeFromRestElement = function (ast) {
        return '...';
    };
    LuaMaker.prototype.codeFromReturnStatement = function (ast) {
        if (!ast.argument) {
            return 'return';
        }
        return 'return ' + this.codeFromAST(ast.argument);
    };
    LuaMaker.prototype.codeFromSequenceExpression = function (ast) {
        var str = '';
        for (var i = 0, len = ast.expressions.length; i < len; i++) {
            if (i > 0) {
                str += '; ';
            }
            str += this.codeFromAST(ast.expressions[i]);
        }
        return str;
    };
    LuaMaker.prototype.codeFromSpreadElement = function (ast) {
        return '...';
    };
    LuaMaker.prototype.codeFromSuper = function (ast) {
        var className = this.classQueue[this.classQueue.length - 1];
        return className + '.super';
    };
    LuaMaker.prototype.codeFromSwitchCase = function (ast) {
        var str = '';
        if (ast.test) {
            str += '[' + this.codeFromAST(ast.test) + '] = function()\n';
        }
        else {
            str += '["default"] = function()\n';
        }
        var csqStr = '';
        for (var i = 0, len = ast.consequent.length; i < len; i++) {
            if (ast.consequent[i].type != typescript_estree_1.AST_NODE_TYPES.BreakStatement) {
                if (i > 0) {
                    csqStr += '\n';
                }
                this.inSwitchCase = true;
                csqStr += this.codeFromAST(ast.consequent[i]);
                this.inSwitchCase = false;
            }
        }
        if (csqStr) {
            str += this.indent(csqStr);
            str += '\nend';
        }
        else {
            str += ' end';
        }
        return str;
    };
    LuaMaker.prototype.codeFromSwitchStatement = function (ast) {
        var str = 'local switch = {\n';
        var caseStr = '';
        for (var i = 0, len = ast.cases.length; i < len; i++) {
            if (i > 0) {
                caseStr += ',\n';
            }
            caseStr += this.codeFromSwitchCase(ast.cases[i]);
        }
        str += this.indent(caseStr);
        str += '\n}\n';
        str += 'local casef = switch[' + this.codeFromAST(ast.discriminant) + ']\n';
        str += 'if not casef then casef = switch["default"] end\n';
        str += 'if casef then casef() end';
        return str;
    };
    LuaMaker.prototype.codeFromTaggedTemplateExpression = function (ast) {
        this.assert(false, ast, 'Not support TaggedTemplateExpression yet!');
        return '';
    };
    LuaMaker.prototype.codeFromTemplateElement = function (ast) {
        this.assert(false, ast, 'Not support TemplateElement yet!');
        return '';
    };
    LuaMaker.prototype.codeFromTemplateLiteral = function (ast) {
        this.assert(false, ast, 'Not support TemplateLiteral yet!');
        return '';
    };
    LuaMaker.prototype.codeFromThisExpression = function (ast) {
        if (this.inStatic) {
            return this.classQueue[this.classQueue.length - 1];
        }
        return 'self';
    };
    LuaMaker.prototype.codeFromThrowStatement = function (ast) {
        return 'error(' + this.codeFromAST(ast.argument) + ')';
    };
    LuaMaker.prototype.codeFromTryStatement = function (ast) {
        this.importContents.push('trycatch');
        var str = 'try_catch{\n';
        var tcStr = 'main = function()\n';
        tcStr += this.indent(this.codeFromAST(ast.block));
        tcStr += '\nend';
        if (ast.handler) {
            tcStr += ',\ncatch = ';
            tcStr += this.indent(this.codeFromAST(ast.handler), 1);
            tcStr += '\nend';
        }
        if (ast.finalizer) {
            tcStr += ',\nfinally = function()\n';
            tcStr += this.indent(this.codeFromAST(ast.finalizer));
            tcStr += '\nend';
        }
        str += this.indent(tcStr);
        str += '\n}';
        return str;
    };
    LuaMaker.prototype.codeFromUnaryExpression = function (ast) {
        var str;
        var agm = this.codeFromAST(ast.argument);
        if (this.calPriority(ast.argument) >= this.calPriority(ast)) {
            agm = '(' + agm + ')';
        }
        if (ast.prefix) {
            if ('typeof' == ast.operator) {
                str = 'type(' + agm + ')';
            }
            else if ('delete' == ast.operator) {
                str = agm + ' = nil';
            }
            else if ('!' == ast.operator) {
                str = 'not ' + agm;
            }
            else if ('void' == ast.operator) {
                this.assert(false, ast, 'Not support void yet!');
            }
            else {
                this.assert('-' == ast.operator, ast, 'Not support UnaryOperator: ' + ast.operator);
                str = ast.operator + agm;
            }
        }
        else {
            str = agm + ast.operator;
        }
        return str;
    };
    LuaMaker.prototype.codeFromUpdateExpression = function (ast) {
        var astr = this.codeFromAST(ast.argument);
        if (this.calPriority(ast.argument) >= this.calPriority(ast)) {
            astr = '(' + astr + ')';
        }
        // if (ast.prefix) {
        //   // TODO: Consider if the value is right when used as Assignment/Property
        //   str = ast.operator + str;
        // } else {
        //   str = str + ast.operator;
        // }
        var str = astr + '=' + astr + ast.operator.substring(0, 1) + '1';
        return str;
    };
    LuaMaker.prototype.codeFromVariableDeclaration = function (ast) {
        // not support const
        var forInOfTypes = [typescript_estree_1.AST_NODE_TYPES.ForInStatement, typescript_estree_1.AST_NODE_TYPES.ForOfStatement];
        var isForInOf = ast.__parent && forInOfTypes.indexOf(ast.__parent.type) >= 0;
        var str = '';
        for (var i = 0, len = ast.declarations.length; i < len; i++) {
            var d = ast.declarations[i];
            if (isForInOf) {
                d.__isForInOf = true;
                if (i > 0) {
                    str += ', ';
                }
            }
            else {
                if (i > 0) {
                    str += '\n';
                }
            }
            str += this.codeFromVariableDeclarator(d);
        }
        return str;
    };
    LuaMaker.prototype.codeFromVariableDeclarator = function (ast) {
        var str = '';
        var idStr = this.codeFromAST(ast.id);
        var initStr = '';
        if (ast.init) {
            initStr = this.codeFromAST(ast.init);
            if (ast.init.type == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression) {
                str = initStr + '\n';
                initStr = this.codeFromAST(ast.init.left);
            }
        }
        if (!ast.__isForInOf) {
            str += 'local ';
        }
        str += idStr;
        if (initStr) {
            str += ' = ' + initStr;
        }
        else if (!ast.__isForInOf) {
            str += ' = nil';
        }
        return str;
    };
    LuaMaker.prototype.codeFromWhileStatement = function (ast) {
        var str = 'while(' + this.codeFromAST(ast.test) + ')\n';
        str += 'do\n';
        var bodyCode = this.codeFromAST(ast.body);
        str += bodyCode + '\n';
        str += 'end';
        return str;
    };
    LuaMaker.prototype.codeFromWithStatement = function (ast) {
        this.assert(false, ast, 'Not support WithStatement yet');
        return '';
    };
    LuaMaker.prototype.codeFromYieldExpression = function (ast) {
        var str = 'coroutine.yield(';
        str += this.codeFromAST(ast.argument);
        str += ')';
        return str;
    };
    LuaMaker.prototype.codeFromTSAbstractMethodDefinition = function (ast) {
        return this.codeFromMethodDefinition(ast);
    };
    LuaMaker.prototype.codeFromTSAsExpression = function (ast) {
        return this.codeFromAST(ast.expression);
    };
    LuaMaker.prototype.codeFromTSDeclareFunction = function (ast) {
        return this.wrapTip('请手动处理DeclareFunction');
    };
    LuaMaker.prototype.codeFromTSEnumDeclaration = function (ast) {
        var str = '';
        if (!ast.__exported) {
            str += 'local ';
        }
        str += this.codeFromAST(ast.id) + ' = {\n';
        var membersStr = '';
        var nextValue = 0;
        for (var i = 0, len = ast.members.length; i < len; i++) {
            if (i > 0) {
                membersStr += ',\n';
            }
            var m = ast.members[i];
            membersStr += this.codeFromAST(m.id) + ' = ';
            if (m.initializer) {
                membersStr += this.codeFromAST(m.initializer);
                nextValue = m.initializer.value + 1;
            }
            else {
                membersStr += nextValue;
                nextValue++;
            }
        }
        str += this.indent(membersStr) + '\n';
        str += '}';
        this.assert(!ast.const, ast);
        this.assert(!ast.declare, ast);
        this.assert(!ast.modifiers, ast);
        this.assert(!ast.decorators, ast);
        return str;
    };
    LuaMaker.prototype.codeFromTSModuleBlock = function (ast) {
        var str = '';
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var bstr = this.codeFromAST(ast.body[i]);
            if (bstr) {
                if (i > 0) {
                    str += '\n';
                }
                str += bstr;
            }
        }
        return str;
    };
    LuaMaker.prototype.codeFromTSModuleDeclaration = function (ast) {
        var moduleName = this.codeFromAST(ast.id);
        this.moduleQueue.push(moduleName);
        var str = moduleName + ' = {}\n';
        if (ast.body) {
            str += this.indent(this.codeFromAST(ast.body));
        }
        this.moduleQueue.pop();
        return str;
    };
    LuaMaker.prototype.codeFromTSInterfaceDeclaration = function (ast) {
        return '';
    };
    LuaMaker.prototype.codeFromTSTypeAssertion = function (ast) {
        return this.codeFromAST(ast.expression);
    };
    LuaMaker.prototype.indent = function (str, fromLine) {
        if (fromLine === void 0) { fromLine = 0; }
        var indentStr = '  ';
        // for(let i = 0; i < blockDeep; i++) {
        //   indentStr += '  ';
        // }
        var endWithNewLine = str.substr(str.length - 1) == '\n';
        var lines = str.split(/\n/);
        var newStr = '';
        for (var i = 0, len = lines.length; i < len; i++) {
            if (i > 0) {
                newStr += '\n';
            }
            if (i >= fromLine) {
                newStr += indentStr;
            }
            newStr += lines[i];
        }
        if (endWithNewLine) {
            newStr += '\n';
        }
        return newStr;
    };
    LuaMaker.prototype.getRegexReplacor = function (pattern) {
        var regexRepl = this.regexReplConf[pattern];
        if (regexRepl) {
            return regexRepl;
        }
        var marginBegin = false, marginEnd = false;
        if (pattern.charAt(0) == '^') {
            marginBegin = true;
            pattern = pattern.substr(1);
        }
        if (pattern.charAt(pattern.length - 1) == '$') {
            marginEnd = true;
            pattern = pattern.substr(0, pattern.length - 1);
        }
        regexRepl = this.regexReplConf[pattern];
        if (!regexRepl) {
            regexRepl = this.regexReplConf['^' + pattern];
            if (regexRepl) {
                regexRepl = regexRepl.substr(1);
            }
            else {
                regexRepl = this.regexReplConf[pattern + '$'];
                if (regexRepl) {
                    regexRepl = regexRepl.substr(0, regexRepl.length - 1);
                }
                else {
                    regexRepl = this.regexReplConf['^' + pattern + '$'];
                    if (regexRepl) {
                        regexRepl = regexRepl.substr(1, regexRepl.length - 2);
                    }
                }
            }
        }
        if (regexRepl) {
            if (marginBegin) {
                regexRepl = '^' + regexRepl;
            }
            if (marginEnd) {
                regexRepl = regexRepl + '$';
            }
        }
        return regexRepl;
    };
    LuaMaker.prototype.pintHit = function (ast) {
        console.warn('hit %s!', ast.type);
        console.log(util.inspect(ast, true, 4));
    };
    LuaMaker.prototype.wrapTip = function (rawTip) {
        return this.addTip ? '<TT>[ts2lua]' + rawTip.replace(/<TT>.*?<\/TT>/g, '') + '</TT>' : '';
    };
    LuaMaker.prototype.wrapPop = function (popStr) {
        return '<ts2lua' + popStr.length + '>' + popStr;
    };
    LuaMaker.prototype.formatTip = function (content) {
        var re = /<TT>.*?<\/TT>/;
        var rema = content.match(re);
        while (rema) {
            var rawComment = rema[0];
            var rawCommentLen = rawComment.length;
            var preContent = content.substr(0, rema.index);
            var postContent = content.substr(rema.index + rawCommentLen);
            var luaComment = '-- ' + rawComment.substr(4, rawCommentLen - 9);
            var lastNewLineIdx = preContent.lastIndexOf('\n');
            if (lastNewLineIdx) {
                var tmpStr = preContent.substr(lastNewLineIdx + 1);
                var blanksRema = tmpStr.match(/^ */);
                if (blanksRema) {
                    luaComment = blanksRema[0] + luaComment;
                }
                content = preContent.substr(0, lastNewLineIdx) + '\n' + luaComment + '\n' + tmpStr + postContent;
            }
            else {
                content = luaComment + '\n' + preContent + postContent;
            }
            rema = content.match(re);
        }
        return content;
    };
    LuaMaker.prototype.assert = function (cond, ast, message) {
        if (message === void 0) { message = null; }
        if (!cond) {
            if (this.isDevMode) {
                console.log(util.inspect(ast, true, 6));
            }
            console.log('\x1B[36m%s\x1B[0m:\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', this.filePath, ast.loc.start.line, ast.loc.start.column, message ? message : 'Error');
        }
    };
    return LuaMaker;
}());
exports.LuaMaker = LuaMaker;
