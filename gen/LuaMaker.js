"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_estree_1 = require("@typescript-eslint/typescript-estree");
var util = require("util");
var path = require("path");
var noBraceTypes = [typescript_estree_1.AST_NODE_TYPES.MemberExpression, typescript_estree_1.AST_NODE_TYPES.ThisExpression, typescript_estree_1.AST_NODE_TYPES.Identifier, typescript_estree_1.AST_NODE_TYPES.CallExpression, typescript_estree_1.AST_NODE_TYPES.TSAsExpression];
// TODO: Typeof's return value may be different between ts and lua
var tsType2luaType = {
    'undefined': 'nil',
    'object': 'table'
};
var luaKeyWords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while'];
var pv = 0;
var operatorPriorityMap = {};
setPriority(['( … )'], pv++);
setPriority(['… . …', '… [ … ]', 'new … ( … )', '… ( … )'], pv++);
setPriority(['new …'], pv++);
setPriority(['… ++', '… --'], pv++);
setPriority(['! …', '~ …', '+ …', '- …', '++ …', '-- …', 'typeof …', 'void …', 'delete …', 'await …'], pv++);
setPriority(['… ** …'], pv++);
setPriority(['… * …', '… / …', '… % …'], pv++);
setPriority(['… + …', '… - …'], pv++);
setPriority(['… << …', '… >> …', '… >>> …'], pv++);
setPriority(['… < …', '… <= …', '… > …', '… >= …', '… in …', '… instanceof …'], pv++);
setPriority(['… == …', '… != …', '… === …', '… !== …'], pv++);
setPriority(['… & …'], pv++);
setPriority(['… ^ …'], pv++);
setPriority(['… | …'], pv++);
setPriority(['… && …'], pv++);
setPriority(['… || …'], pv++);
setPriority(['… ? … : …'], pv++);
setPriority(['… = …', '… += …', '… -= …', '… *= …', '… /= …', '… %= …', '… <<= …', '… >>= …', '… >>>= …', '… &= …', '… ^= …', '… |= …'], pv++);
setPriority(['yield …', 'yield* …'], pv++);
setPriority(['...'], pv++);
setPriority(['… , …'], pv++);
function setPriority(keys, value) {
    for (var i = 0, len = keys.length; i < len; i++) {
        operatorPriorityMap[keys[i]] = value;
    }
}
function getPriority(raw) {
    var idx = operatorPriorityMap[raw];
    if (idx < 0) {
        idx = 999;
        console.error('no prioritys: ' + raw);
    }
    return idx;
}
function calPriority(ast) {
    if ('__calPriority' in ast) {
        return ast.__calPriority;
    }
    switch (ast.type) {
        case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
            {
                var ue = ast;
                ast.__calPriority = getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
            {
                var ue = ast;
                ast.__calPriority = getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
            {
                var be = ast;
                ast.__calPriority = getPriority('… ' + be.operator + ' …');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
            {
                var ae = ast;
                ast.__calPriority = getPriority('… ' + ae.operator + ' …');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
            {
                var le = ast;
                ast.__calPriority = getPriority('… ' + le.operator + ' …');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
            {
                var me = ast;
                ast.__calPriority = getPriority(me.computed ? '… [ … ]' : '… . …');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
            {
                ast.__calPriority = getPriority('… ? … : …');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.CallExpression:
            {
                ast.__calPriority = getPriority('… ( … )');
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.NewExpression:
            {
                var ne = ast;
                if (ne.arguments.length > 0) {
                    ast.__calPriority = getPriority('new … ( … )');
                }
                else {
                    ast.__calPriority = getPriority('new …');
                }
            }
            break;
        case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
            {
                ast.__calPriority = getPriority('… , …');
            }
            break;
    }
    return ast.__calPriority;
}
var usedIdMap = {};
var importAsts = [];
var importContents = [];
var allClasses = [];
var classQueue = [];
var moduleQueue = [];
var hasContinue = false;
var filePath;
var isDevMode = false;
var luaStyle = 'xlua';
function toLua(ast, pfilePath, rootPath, devMode, style, pRequireAllInOne) {
    filePath = pfilePath;
    isDevMode = devMode;
    luaStyle = style;
    usedIdMap = {};
    importContents.length = 0;
    importAsts.length = 0;
    allClasses.length = 0;
    classQueue.length = 0;
    var outStr = '';
    var content = codeFromAST(ast);
    content = content.replace(/console[\.|:]log/g, 'print');
    content = formatTip(content);
    if (!pRequireAllInOne) {
        console.log('add import: ', filePath);
        if (allClasses.length > 0) {
            importContents.push('class');
        }
        for (var _i = 0, importAsts_1 = importAsts; _i < importAsts_1.length; _i++) {
            var ia = importAsts_1[_i];
            var importIsUsed = false;
            for (var _a = 0, _b = ia.specifiers; _a < _b.length; _a++) {
                var s = _b[_a];
                if (usedIdMap[s.local.name]) {
                    importIsUsed = true;
                    break;
                }
            }
            if (importIsUsed) {
                var p = ia.source.value;
                if (importContents.indexOf(p) < 0) {
                    importContents.push(p);
                }
            }
        }
        importContents.sort();
        for (var _c = 0, importContents_1 = importContents; _c < importContents_1.length; _c++) {
            var p = importContents_1[_c];
            if (p.indexOf('./') == 0 || p.indexOf('../') == 0) {
                p = path.relative(rootPath, path.join(path.dirname(pfilePath), p)).replace(/\\+/g, '/');
            }
            outStr += 'require("' + p + '")\n';
        }
    }
    outStr += content;
    return outStr;
}
exports.toLua = toLua;
function codeFromAST(ast) {
    var str = '';
    switch (ast.type) {
        case typescript_estree_1.AST_NODE_TYPES.ArrayExpression:
            str += codeFromArrayExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
            str += codeFromArrayPattern(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ArrowFunctionExpression:
            str += codeFromArrowFunctionExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
            str += codeFromAssignmentExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
            str += codeFromAssignmentPattern(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AwaitExpression:
            str += codeFromAwaitExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BigIntLiteral:
            str += codeFromBigIntLiteral(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
            str += codeFromBinaryExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
            str += codeFromBlockStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BreakStatement:
            str += codeFromBreakStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.CallExpression:
            str += codeFromCallExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.CatchClause:
            str += codeFromCatchClause(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassBody:
            str += codeFromClassBody(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassDeclaration:
            str += codeFromClassDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassExpression:
            str += codeFromClassExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassProperty:
            str += codeFromClassProperty(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
            str += codeFromConditionalExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ContinueStatement:
            str += codeFromContinueStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.DebuggerStatement:
            str += codeFromDebuggerStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Decorator:
            str += codeFromDecorator(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.DoWhileStatement:
            str += codeFromDoWhileStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.EmptyStatement:
            str += codeFromEmptyStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportAllDeclaration:
            str += codeFromExportAllDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportDefaultDeclaration:
            str += codeFromExportDefaultDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportNamedDeclaration:
            str += codeFromExportNamedDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportSpecifier:
            str += codeFromExportSpecifier(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
            str += codeFromExpressionStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForInStatement:
            str += codeFromForInStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForOfStatement:
            str += codeFromForOfStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForStatement:
            str += codeFromForStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration:
            str += codeFromFunctionDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
            str += codeFromFunctionExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Identifier:
            str += codeFromIdentifier(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.IfStatement:
            str += codeFromIfStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Import:
            str += codeFromImport(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportDeclaration:
            str += codeFromImportDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportDefaultSpecifier:
            str += codeFromImportDefaultSpecifier(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportNamespaceSpecifier:
            str += codeFromImportNamespaceSpecifier(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportSpecifier:
            str += codeFromImportSpecifier(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.LabeledStatement:
            str += codeFromLabeledStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Literal:
            str += codeFromLiteral(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
            str += codeFromLogicalExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
            str += codeFromMemberExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MetaProperty:
            str += codeFromMetaProperty(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MethodDefinition:
            str += codeFromMethodDefinition(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.NewExpression:
            str += codeFromNewExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ObjectExpression:
            str += codeFromObjectExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ObjectPattern:
            str += codeFromObjectPattern(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Program:
            str += codeFromProgram(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Property:
            str += codeFromProperty(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.RestElement:
            str += codeFromRestElement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ReturnStatement:
            str += codeFromReturnStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
            str += codeFromSequenceExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SpreadElement:
            str += codeFromSpreadElement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Super:
            str += codeFromSuper(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SwitchCase:
            str += codeFromSwitchCase(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SwitchStatement:
            str += codeFromSwitchStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TaggedTemplateExpression:
            str += codeFromTaggedTemplateExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TemplateElement:
            str += codeFromTemplateElement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TemplateLiteral:
            str += codeFromTemplateLiteral(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ThisExpression:
            str += codeFromThisExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ThrowStatement:
            str += codeFromThrowStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TryStatement:
            str += codeFromTryStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
            str += codeFromUnaryExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
            str += codeFromUpdateExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.VariableDeclaration:
            str += codeFromVariableDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.VariableDeclarator:
            str += codeFromVariableDeclarator(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.WhileStatement:
            str += codeFromWhileStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.WithStatement:
            str += codeFromWithStatement(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.YieldExpression:
            str += codeFromYieldExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition:
            str += codeFromTSAbstractMethodDefinition(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSAsExpression:
            str += codeFromTSAsExpression(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSDeclareFunction:
            str += codeFromTSDeclareFunction(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSEnumDeclaration:
            str += codeFromTSEnumDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSModuleBlock:
            str += codeFromTSModuleBlock(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSModuleDeclaration:
            str += codeFromTSModuleDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSInterfaceDeclaration:
            str += codeFromTSInterfaceDeclaration(ast);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSTypeAssertion:
            str += codeFromTSTypeAssertion(ast);
            break;
        default:
            console.log(util.inspect(ast, true, 3));
            throw new Error('unrecornized type: ' + ast.type);
            break;
    }
    return str;
}
exports.codeFromAST = codeFromAST;
function codeFromArrayExpression(ast) {
    var str = '';
    for (var i = 0, len = ast.elements.length; i < len; i++) {
        if (str) {
            str += ', ';
        }
        str += codeFromAST(ast.elements[i]);
    }
    return '{' + str + '}';
}
exports.codeFromArrayExpression = codeFromArrayExpression;
function codeFromArrayPattern(ast) {
    assert(false, ast, 'Not support ArrayPattern yet!');
    return '';
}
exports.codeFromArrayPattern = codeFromArrayPattern;
function codeFromArrowFunctionExpression(ast) {
    var str = 'function(';
    var defaultParamsStr = '';
    if (ast.params) {
        for (var i = 0, len = ast.params.length; i < len; i++) {
            if (i > 0) {
                str += ', ';
            }
            var oneParam = ast.params[i];
            oneParam.__parent = ast;
            str += codeFromAST(oneParam);
            if (oneParam.type == typescript_estree_1.AST_NODE_TYPES.AssignmentPattern) {
                var paramIdStr = codeFromAST(oneParam.left);
                defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
                defaultParamsStr += indent(paramIdStr + '=' + codeFromAST(oneParam.right)) + '\n';
                defaultParamsStr += 'end\n';
            }
        }
    }
    str += ')\n';
    if (ast.body) {
        var bodyStr = codeFromAST(ast.body);
        if (defaultParamsStr) {
            bodyStr = defaultParamsStr + bodyStr;
        }
        str += indent(bodyStr) + '\n';
    }
    assert(!ast.generator, ast, 'Not support generator yet!');
    assert(!ast.async, ast, 'Not support async yet!');
    assert(!ast.expression, ast, 'Not support expression yet!');
    str += 'end\n';
    return str;
}
exports.codeFromArrowFunctionExpression = codeFromArrowFunctionExpression;
function codeFromAssignmentExpression(ast) {
    return codeFromBinaryExpression(ast);
}
exports.codeFromAssignmentExpression = codeFromAssignmentExpression;
function codeFromAssignmentPattern(ast) {
    var str = codeFromAST(ast.left);
    var parent = ast.__parent;
    if (!parent || (parent.type != typescript_estree_1.AST_NODE_TYPES.FunctionExpression && parent.type != typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration)) {
        str += ' = ' + codeFromAST(ast.right);
    }
    return str;
}
exports.codeFromAssignmentPattern = codeFromAssignmentPattern;
function codeFromAwaitExpression(ast) {
    assert(false, ast, 'Not support AwaitExpression yet!');
    return '';
}
exports.codeFromAwaitExpression = codeFromAwaitExpression;
function codeFromBigIntLiteral(ast) {
    return codeFromLiteral(ast);
}
exports.codeFromBigIntLiteral = codeFromBigIntLiteral;
function codeFromBinaryExpression(ast) {
    var optStr = ast.operator;
    assert('>>>=' != optStr, ast, 'Not support >>>= yet!');
    ast.left.__parent = ast;
    var left = codeFromAST(ast.left);
    var right = codeFromAST(ast.right);
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
        right = codeFromAST(ast.right.left);
    }
    if (isSelfOperator) {
        return str + left + ' = ' + left + ' ' + optStr + ' ' + right;
    }
    return str + left + ' ' + optStr + ' ' + right;
}
exports.codeFromBinaryExpression = codeFromBinaryExpression;
function codeFromBlockStatement(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        var bstr = codeFromAST(ast.body[i]);
        if (bstr) {
            if (i > 0) {
                str += '\n';
            }
            str += bstr;
        }
    }
    return str;
}
exports.codeFromBlockStatement = codeFromBlockStatement;
function codeFromBreakStatement(ast) {
    assert(!ast.label, ast, 'Not support break label yet!');
    return 'break';
}
exports.codeFromBreakStatement = codeFromBreakStatement;
function codeFromCallExpression(ast) {
    ast.callee.__parent = ast;
    var calleeStr = codeFromAST(ast.callee);
    var str = '';
    var allAgmStr = '';
    for (var i = 0, len = ast.arguments.length; i < len; i++) {
        var arg = ast.arguments[i];
        var argStr = codeFromAST(arg);
        if (arg.type == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression) {
            str += argStr + '\n';
            argStr = codeFromAST(arg.left);
        }
        else if (arg.type == typescript_estree_1.AST_NODE_TYPES.UpdateExpression) {
            str += argStr + '\n';
            argStr = codeFromAST(arg.argument);
        }
        if (allAgmStr) {
            allAgmStr += ', ';
        }
        allAgmStr += argStr;
    }
    if (calleeStr.match(/:push$/)) {
        // Array push change into table.concat
        str += 'table.concat(' + calleeStr.substr(0, calleeStr.length - 5) + ', ' + allAgmStr + ')';
    }
    else if ('xlua' == luaStyle && !allAgmStr && calleeStr.match(/:GetType$/)) {
        str = 'typeof(' + calleeStr.substr(0, calleeStr.length - 8) + ')';
    }
    else {
        str = calleeStr + '(';
        str += allAgmStr;
        str += ')';
    }
    return str;
}
exports.codeFromCallExpression = codeFromCallExpression;
function codeFromCatchClause(ast) {
    var str = 'function($param$)\n'.replace('$param$', codeFromAST(ast.param));
    str += codeFromBlockStatement(ast.body);
    return str;
}
exports.codeFromCatchClause = codeFromCatchClause;
function codeFromClassBody(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        var cbodyStr = codeFromAST(ast.body[i]);
        if (cbodyStr) {
            if (i > 0) {
                str += '\n';
            }
            str += cbodyStr;
        }
    }
    return str;
}
exports.codeFromClassBody = codeFromClassBody;
function codeFromClassDeclaration(ast) {
    var str = '$BaseClass$:subclass("$ClassName$")\n';
    if (ast.typeParameters) {
        // typeParameters?: TSTypeParameterDeclaration;
    }
    if (ast.superTypeParameters) {
        // TSTypeParameterInstantiation;
    }
    if (ast.id) {
        // Identifier
        var className = codeFromAST(ast.id);
        allClasses.push(className);
        classQueue.push(className);
        str = str.replace('$ClassName$', className);
    }
    else {
        assert(false, ast, 'Class name is necessary!');
    }
    str += codeFromClassBody(ast.body);
    if (ast.superClass) {
        str = str.replace('$BaseClass$', codeFromAST(ast.superClass));
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
        assert(false, ast);
    }
    if (ast.decorators) {
        // Decorator[];
        assert(false, ast);
    }
    classQueue.pop();
    return str;
}
exports.codeFromClassDeclaration = codeFromClassDeclaration;
function codeFromClassExpression(ast) {
    pintHit(ast);
    return codeFromClassDeclaration(ast);
}
exports.codeFromClassExpression = codeFromClassExpression;
function codeFromClassProperty(ast) {
    var str = '';
    if (ast.value) {
        var className = classQueue[classQueue.length - 1];
        if (ast.static) {
            str = className + '.' + codeFromAST(ast.key) + ' = ' + codeFromAST(ast.value) + ';';
        }
        else {
            str = className + '.prototype.' + codeFromAST(ast.key) + ' = ' + codeFromAST(ast.value) + ';';
        }
        // readonly?: boolean;
        // decorators?: Decorator[];
        // accessibility?: Accessibility;
        // optional?: boolean;
        // definite?: boolean;
        // typeAnnotation?: TSTypeAnnotation;
    }
    return str;
}
exports.codeFromClassProperty = codeFromClassProperty;
function codeFromConditionalExpression(ast) {
    // TODO: 0 or '' are considered true in lua while false in TypeScript
    var testStr = codeFromAST(ast.test);
    var str = '(' + testStr + ' and {' + codeFromAST(ast.consequent) + '} or {' + codeFromAST(ast.alternate) + '})[1]';
    str += wrapTip('lua中0和空字符串也是true，此处' + testStr + '需要确认');
    return str;
}
exports.codeFromConditionalExpression = codeFromConditionalExpression;
function codeFromContinueStatement(ast) {
    hasContinue = true;
    return 'break';
}
exports.codeFromContinueStatement = codeFromContinueStatement;
function codeFromDebuggerStatement(ast) {
    assert(false, ast, 'Not support DebuggerStatement yet!');
    return '';
}
exports.codeFromDebuggerStatement = codeFromDebuggerStatement;
function codeFromDecorator(ast) {
    assert(false, ast, 'Not support Decorator yet!');
    return '';
}
exports.codeFromDecorator = codeFromDecorator;
function codeFromDoWhileStatement(ast) {
    assert(false, ast, 'Not support DoWhileStatement yet!');
    return '';
}
exports.codeFromDoWhileStatement = codeFromDoWhileStatement;
function codeFromEmptyStatement(ast) {
    return '';
}
exports.codeFromEmptyStatement = codeFromEmptyStatement;
function codeFromExportAllDeclaration(ast) {
    assert(false, ast, 'Not support ExportAllDeclaration yet!');
    return '';
}
exports.codeFromExportAllDeclaration = codeFromExportAllDeclaration;
function codeFromExportDefaultDeclaration(ast) {
    return '';
}
exports.codeFromExportDefaultDeclaration = codeFromExportDefaultDeclaration;
function codeFromExportNamedDeclaration(ast) {
    ast.declaration.__exported = true;
    return codeFromAST(ast.declaration);
}
exports.codeFromExportNamedDeclaration = codeFromExportNamedDeclaration;
function codeFromExportSpecifier(ast) {
    assert(false, ast, 'Not support ExportSpecifier yet!');
    return '';
}
exports.codeFromExportSpecifier = codeFromExportSpecifier;
function codeFromExpressionStatement(ast) {
    return codeFromAST(ast.expression);
}
exports.codeFromExpressionStatement = codeFromExpressionStatement;
function codeFromForInStatement(ast) {
    ast.left.__parent = ast;
    var str = 'for ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
    str += indent(codeFromAST(ast.body)) + '\n';
    str += 'end';
    return str;
}
exports.codeFromForInStatement = codeFromForInStatement;
function codeFromForOfStatement(ast) {
    ast.left.__parent = ast;
    var str = 'for _tmpi, ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
    str += indent(codeFromAST(ast.body)) + '\n';
    str += 'end';
    return str;
}
exports.codeFromForOfStatement = codeFromForOfStatement;
function codeFromForStatement(ast) {
    hasContinue = false;
    var str = '';
    if (ast.init && ast.init.type != typescript_estree_1.AST_NODE_TYPES.Identifier) {
        str += codeFromAST(ast.init) + '\n';
    }
    str += 'repeat\n';
    var repeatBodyStr = codeFromAST(ast.body);
    if (hasContinue) {
        repeatBodyStr = 'repeat\n' + indent(repeatBodyStr + '\nbreak') + '\nuntil true';
    }
    if (ast.update) {
        repeatBodyStr += '\n';
        repeatBodyStr += codeFromAST(ast.update);
    }
    str += indent(repeatBodyStr) + '\n';
    str += 'until ';
    if (ast.test) {
        str += 'not(' + codeFromAST(ast.test) + ')';
    }
    else {
        str += 'false';
    }
    return str;
}
exports.codeFromForStatement = codeFromForStatement;
function codeFromFunctionDeclaration(ast) {
    return codeFromFunctionExpression(ast);
}
exports.codeFromFunctionDeclaration = codeFromFunctionDeclaration;
function codeFromFunctionExpression(ast) {
    return codeFromFunctionExpressionInternal(null, false, ast);
}
exports.codeFromFunctionExpression = codeFromFunctionExpression;
function codeFromFunctionExpressionInternal(funcName, isStatic, ast) {
    var str = '';
    if (!funcName && ast.id) {
        funcName = codeFromAST(ast.id);
    }
    if (funcName) {
        if ('constructor' == funcName) {
            funcName = 'ctor';
        }
        var className = classQueue[classQueue.length - 1];
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
            var moduleName = moduleQueue[moduleQueue.length - 1];
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
            str += codeFromAST(oneParam);
            if (oneParam.type == typescript_estree_1.AST_NODE_TYPES.AssignmentPattern) {
                var paramIdStr = codeFromAST(oneParam.left);
                defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
                defaultParamsStr += indent(paramIdStr + '=' + codeFromAST(oneParam.right)) + '\n';
                defaultParamsStr += 'end\n';
            }
        }
    }
    str += ')';
    var bodyStr = '';
    if (ast.body) {
        bodyStr = codeFromAST(ast.body);
        if (defaultParamsStr) {
            bodyStr = defaultParamsStr + bodyStr;
        }
    }
    if (bodyStr) {
        str += '\n' + indent(bodyStr) + '\nend\n';
    }
    else {
        str += ' end';
    }
    assert(!ast.generator, ast, 'Not support generator yet!');
    assert(!ast.async, ast, 'Not support async yet!');
    assert(!ast.expression, ast, 'Not support expression yet!');
    assert(!ast.declare, ast, 'Not support declare yet!');
    return str;
}
function codeFromIdentifier(ast) {
    var str = ast.name;
    if (luaKeyWords.indexOf(str) >= 0) {
        str = 'tsvar_' + str;
    }
    else if (str.substr(0, 1) == '$') {
        str = 'tsvar_' + str.substr(1);
    }
    usedIdMap[str] = true;
    return str;
}
exports.codeFromIdentifier = codeFromIdentifier;
function codeFromIfStatement(ast) {
    var testStr = codeFromAST(ast.test);
    var str = 'if ' + testStr + ' then\n';
    str += indent(codeFromAST(ast.consequent));
    if (ast.alternate) {
        str += '\nelse';
        var altStr = codeFromAST(ast.alternate);
        if (ast.alternate.type != typescript_estree_1.AST_NODE_TYPES.IfStatement) {
            str += '\n';
            str += indent(altStr);
        }
        else {
            str += ' ' + altStr;
        }
    }
    str += '\nend';
    return str;
}
exports.codeFromIfStatement = codeFromIfStatement;
function codeFromImport(ast) {
    assert(false, ast, 'Not support Import yet!');
    return '';
}
exports.codeFromImport = codeFromImport;
function codeFromImportDeclaration(ast) {
    importAsts.push(ast);
    return '';
}
exports.codeFromImportDeclaration = codeFromImportDeclaration;
function codeFromImportDefaultSpecifier(ast) {
    assert(false, ast, 'Not support ImportDefaultSpecifier yet!');
    return '';
}
exports.codeFromImportDefaultSpecifier = codeFromImportDefaultSpecifier;
function codeFromImportNamespaceSpecifier(ast) {
    assert(false, ast, 'Not support ImportNamespaceSpecifier yet!');
    return '';
}
exports.codeFromImportNamespaceSpecifier = codeFromImportNamespaceSpecifier;
function codeFromImportSpecifier(ast) {
    assert(false, ast, 'Not support ImportSpecifier yet!');
    return '';
}
exports.codeFromImportSpecifier = codeFromImportSpecifier;
function codeFromLabeledStatement(ast) {
    assert(false, ast, 'Not support LabeledStatement yet!');
    return '';
}
exports.codeFromLabeledStatement = codeFromLabeledStatement;
function codeFromLiteral(ast) {
    if (ast.regex) {
        return ast.raw + wrapTip('tslua无法自动转换正则表达式，请手动处理。');
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
}
exports.codeFromLiteral = codeFromLiteral;
function codeFromLogicalExpression(ast) {
    var left = codeFromAST(ast.left);
    if (calPriority(ast.left) >= calPriority(ast)) {
        left = '(' + left + ')';
    }
    var right = codeFromAST(ast.right);
    if (calPriority(ast.right) >= calPriority(ast)) {
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
}
exports.codeFromLogicalExpression = codeFromLogicalExpression;
function codeFromMemberExpression(ast) {
    var str = codeFromAST(ast.object);
    if ('xlua' == luaStyle && str == 'UnityEngine') {
        str = 'CS.UnityEngine';
    }
    if (noBraceTypes.indexOf(ast.object.type) < 0) {
        str = '(' + str + ')';
    }
    if (ast.computed) {
        var propertyStr = codeFromAST(ast.property);
        if (propertyStr.length == 1) {
            // Auto modify xx[i] to xx[i + 1]
            propertyStr += '+1';
        }
        else {
            // Add some tips
            propertyStr += wrapTip(str + '下标访问可能不正确');
        }
        str += '[' + propertyStr + ']';
    }
    else {
        if (ast.property.type == typescript_estree_1.AST_NODE_TYPES.Identifier && ast.property.name == 'length') {
            if ((!ast.__parent || ast.__parent.type != typescript_estree_1.AST_NODE_TYPES.AssignmentExpression)) {
                str = '#' + str;
            }
            else {
                str += '.length' + wrapTip('修改数组长度需要手动处理。');
            }
        }
        else {
            // TODO: do something with static members
            var pstr = codeFromAST(ast.property);
            var parent_1 = ast.__parent;
            if (parent_1 && parent_1.type == typescript_estree_1.AST_NODE_TYPES.CallExpression) {
                str += ':';
            }
            else {
                str += '.';
            }
            str += pstr;
        }
    }
    return str;
}
exports.codeFromMemberExpression = codeFromMemberExpression;
function codeFromMetaProperty(ast) {
    assert(false, ast, 'Not support MetaProperty yet!');
    return '';
}
exports.codeFromMetaProperty = codeFromMetaProperty;
function codeFromMethodDefinition(ast) {
    var funcName = null;
    if (ast.key) {
        funcName = codeFromAST(ast.key);
    }
    if (ast.value.type == "TSEmptyBodyFunctionExpression") {
        assert(false, ast, 'Not support TSEmptyBodyFunctionExpression yet!');
    }
    return codeFromFunctionExpressionInternal(funcName, ast.static, ast.value);
}
exports.codeFromMethodDefinition = codeFromMethodDefinition;
function codeFromNewExpression(ast) {
    var callee = codeFromAST(ast.callee);
    if (calPriority(ast.callee) > calPriority(ast)) {
        callee = '(' + callee + ')';
    }
    var str = callee + '(';
    for (var i = 0, len = ast.arguments.length; i < len; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += codeFromAST(ast.arguments[i]);
    }
    str += ')';
    return str;
}
exports.codeFromNewExpression = codeFromNewExpression;
function codeFromObjectExpression(ast) {
    var str = '{';
    for (var i = 0, len = ast.properties.length; i < len; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += codeFromAST(ast.properties[i]);
    }
    return str + '}';
}
exports.codeFromObjectExpression = codeFromObjectExpression;
function codeFromObjectPattern(ast) {
    assert(false, ast, 'Not support ObjectPattern yet!');
    return '';
}
exports.codeFromObjectPattern = codeFromObjectPattern;
function codeFromProgram(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        var stm = ast.body[i];
        var bodyStr = codeFromAST(stm);
        if (bodyStr) {
            if (i > 0) {
                str += '\n';
            }
            str += bodyStr;
        }
    }
    return str;
}
exports.codeFromProgram = codeFromProgram;
function codeFromProperty(ast) {
    ast.key.__parent = ast;
    return codeFromAST(ast.key) + '=' + codeFromAST(ast.value);
}
exports.codeFromProperty = codeFromProperty;
function codeFromRestElement(ast) {
    return '...';
}
exports.codeFromRestElement = codeFromRestElement;
function codeFromReturnStatement(ast) {
    if (!ast.argument) {
        return 'return';
    }
    return 'return ' + codeFromAST(ast.argument);
}
exports.codeFromReturnStatement = codeFromReturnStatement;
function codeFromSequenceExpression(ast) {
    var str = '';
    for (var i = 0, len = ast.expressions.length; i < len; i++) {
        if (i > 0) {
            str += '; ';
        }
        str += codeFromAST(ast.expressions[i]);
    }
    return str;
}
exports.codeFromSequenceExpression = codeFromSequenceExpression;
function codeFromSpreadElement(ast) {
    return '...';
}
exports.codeFromSpreadElement = codeFromSpreadElement;
function codeFromSuper(ast) {
    var className = classQueue[classQueue.length - 1];
    return className + '.super';
}
exports.codeFromSuper = codeFromSuper;
function codeFromSwitchCase(ast) {
    var str = '';
    if (ast.test) {
        str += '[' + codeFromAST(ast.test) + '] = function()\n';
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
            csqStr += codeFromAST(ast.consequent[i]);
        }
    }
    if (csqStr) {
        str += indent(csqStr);
        str += '\nend';
    }
    else {
        str += ' end';
    }
    return str;
}
exports.codeFromSwitchCase = codeFromSwitchCase;
function codeFromSwitchStatement(ast) {
    var str = 'local switch = {\n';
    var caseStr = '';
    for (var i = 0, len = ast.cases.length; i < len; i++) {
        if (i > 0) {
            caseStr += ',\n';
        }
        caseStr += codeFromSwitchCase(ast.cases[i]);
    }
    str += indent(caseStr);
    str += '\n}\n';
    str += 'local casef = switch[' + codeFromAST(ast.discriminant) + ']\n';
    str += 'if not casef then casef = switch["default"] end\n';
    str += 'if casef then casef() end';
    return str;
}
exports.codeFromSwitchStatement = codeFromSwitchStatement;
function codeFromTaggedTemplateExpression(ast) {
    assert(false, ast, 'Not support TaggedTemplateExpression yet!');
    return '';
}
exports.codeFromTaggedTemplateExpression = codeFromTaggedTemplateExpression;
function codeFromTemplateElement(ast) {
    assert(false, ast, 'Not support TemplateElement yet!');
    return '';
}
exports.codeFromTemplateElement = codeFromTemplateElement;
function codeFromTemplateLiteral(ast) {
    assert(false, ast, 'Not support TemplateLiteral yet!');
    return '';
}
exports.codeFromTemplateLiteral = codeFromTemplateLiteral;
function codeFromThisExpression(ast) {
    return 'self';
}
exports.codeFromThisExpression = codeFromThisExpression;
function codeFromThrowStatement(ast) {
    return 'error(' + codeFromAST(ast.argument) + ')';
}
exports.codeFromThrowStatement = codeFromThrowStatement;
function codeFromTryStatement(ast) {
    importContents.push('trycatch');
    var str = 'try_catch{\n';
    var tcStr = 'main = function()\n';
    tcStr += indent(codeFromAST(ast.block));
    tcStr += '\nend';
    if (ast.handler) {
        tcStr += ',\ncatch = ';
        tcStr += indent(codeFromAST(ast.handler), 1);
        tcStr += '\nend';
    }
    if (ast.finalizer) {
        tcStr += ',\nfinally = function()\n';
        tcStr += indent(codeFromAST(ast.finalizer));
        tcStr += '\nend';
    }
    str += indent(tcStr);
    str += '\n}';
    return str;
}
exports.codeFromTryStatement = codeFromTryStatement;
function codeFromUnaryExpression(ast) {
    var str;
    var agm = codeFromAST(ast.argument);
    if (calPriority(ast.argument) >= calPriority(ast)) {
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
            assert(false, ast, 'Not support void yet!');
        }
        else {
            assert('-' == ast.operator, ast, 'Not support UnaryOperator: ' + ast.operator);
            str = ast.operator + agm;
        }
    }
    else {
        str = agm + ast.operator;
    }
    return str;
}
exports.codeFromUnaryExpression = codeFromUnaryExpression;
function codeFromUpdateExpression(ast) {
    var astr = codeFromAST(ast.argument);
    if (calPriority(ast.argument) >= calPriority(ast)) {
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
}
exports.codeFromUpdateExpression = codeFromUpdateExpression;
function codeFromVariableDeclaration(ast) {
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
        str += codeFromVariableDeclarator(d);
    }
    return str;
}
exports.codeFromVariableDeclaration = codeFromVariableDeclaration;
function codeFromVariableDeclarator(ast) {
    var str = '';
    var idStr = codeFromAST(ast.id);
    var initStr = '';
    if (ast.init) {
        initStr = codeFromAST(ast.init);
        if (ast.init.type == typescript_estree_1.AST_NODE_TYPES.AssignmentExpression) {
            str = initStr + '\n';
            initStr = codeFromAST(ast.init.left);
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
}
exports.codeFromVariableDeclarator = codeFromVariableDeclarator;
function codeFromWhileStatement(ast) {
    var str = 'while(' + codeFromAST(ast.test) + ')\n';
    str += 'do\n';
    var bodyCode = codeFromAST(ast.body);
    str += bodyCode + '\n';
    str += 'end';
    return str;
}
exports.codeFromWhileStatement = codeFromWhileStatement;
function codeFromWithStatement(ast) {
    assert(false, ast, 'Not support WithStatement yet');
    return '';
}
exports.codeFromWithStatement = codeFromWithStatement;
function codeFromYieldExpression(ast) {
    var str = 'coroutine.yield(';
    str += codeFromAST(ast.argument);
    str += ')';
    return str;
}
exports.codeFromYieldExpression = codeFromYieldExpression;
function codeFromTSAbstractMethodDefinition(ast) {
    return codeFromMethodDefinition(ast);
}
exports.codeFromTSAbstractMethodDefinition = codeFromTSAbstractMethodDefinition;
function codeFromTSAsExpression(ast) {
    return codeFromAST(ast.expression);
}
exports.codeFromTSAsExpression = codeFromTSAsExpression;
function codeFromTSDeclareFunction(ast) {
    return wrapTip('请手动处理DeclareFunction');
}
exports.codeFromTSDeclareFunction = codeFromTSDeclareFunction;
function codeFromTSEnumDeclaration(ast) {
    var str = '';
    if (!ast.__exported) {
        str += 'local ';
    }
    str += codeFromAST(ast.id) + ' = {\n';
    var membersStr = '';
    var nextValue = 0;
    for (var i = 0, len = ast.members.length; i < len; i++) {
        if (i > 0) {
            membersStr += ',\n';
        }
        var m = ast.members[i];
        membersStr += codeFromAST(m.id) + ' = ';
        if (m.initializer) {
            membersStr += codeFromAST(m.initializer);
            nextValue = m.initializer.value + 1;
        }
        else {
            membersStr += nextValue;
            nextValue++;
        }
    }
    str += indent(membersStr) + '\n';
    str += '}';
    assert(!ast.const, ast);
    assert(!ast.declare, ast);
    assert(!ast.modifiers, ast);
    assert(!ast.decorators, ast);
    return str;
}
exports.codeFromTSEnumDeclaration = codeFromTSEnumDeclaration;
function codeFromTSModuleBlock(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        var bstr = codeFromAST(ast.body[i]);
        if (bstr) {
            if (i > 0) {
                str += '\n';
            }
            str += bstr;
        }
    }
    return str;
}
exports.codeFromTSModuleBlock = codeFromTSModuleBlock;
function codeFromTSModuleDeclaration(ast) {
    var moduleName = codeFromAST(ast.id);
    moduleQueue.push(moduleName);
    var str = moduleName + ' = {}\n';
    if (ast.body) {
        str += indent(codeFromAST(ast.body));
    }
    moduleQueue.pop();
    return str;
}
exports.codeFromTSModuleDeclaration = codeFromTSModuleDeclaration;
function codeFromTSInterfaceDeclaration(ast) {
    return '';
}
exports.codeFromTSInterfaceDeclaration = codeFromTSInterfaceDeclaration;
function codeFromTSTypeAssertion(ast) {
    return codeFromAST(ast.expression);
}
exports.codeFromTSTypeAssertion = codeFromTSTypeAssertion;
function indent(str, fromLine) {
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
}
function pintHit(ast) {
    console.warn('hit %s!', ast.type);
    console.log(util.inspect(ast, true, 4));
}
function wrapTip(rawTip) {
    return '<TT>[ts2lua]' + rawTip.replace(/<TT>.*?<\/TT>/g, '') + '</TT>';
}
function wrapPop(popStr) {
    return '<ts2lua' + popStr.length + '>' + popStr;
}
function formatTip(content) {
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
}
function assert(cond, ast, message) {
    if (message === void 0) { message = null; }
    if (!cond) {
        if (isDevMode) {
            console.log(util.inspect(ast, true, 6));
        }
        console.log('\x1B[36m%s\x1B[0m:\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', filePath, ast.loc.start.line, ast.loc.start.column, message ? message : 'Error');
    }
}
