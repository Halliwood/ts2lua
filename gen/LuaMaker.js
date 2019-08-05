"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_estree_1 = require("@typescript-eslint/typescript-estree");
var sf = require("string-format");
var util = require("util");
var blockDeep = 0;
var allClasses = [];
var classQueue = [];
var noBraceTypes = [typescript_estree_1.AST_NODE_TYPES.MemberExpression, typescript_estree_1.AST_NODE_TYPES.ThisExpression, typescript_estree_1.AST_NODE_TYPES.Identifier];
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
function toLua(ast) {
    blockDeep = 0;
    allClasses.length = 0;
    classQueue.length = 0;
    var content = codeFromAST(ast);
    if (allClasses.length > 0) {
        content = 'require("class")\n' + content;
    }
    content = content.replace(/console[\.|:]log/g, 'print');
    content = formatTip(content);
    return content;
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
        case typescript_estree_1.AST_NODE_TYPES.TSEnumDeclaration:
            str += codeFromTSEnumDeclaration(ast);
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
    console.assert(false, 'Not support ArrayPattern yet!');
    return '';
}
exports.codeFromArrayPattern = codeFromArrayPattern;
function codeFromArrowFunctionExpression(ast) {
    console.assert(false, 'Not support ArrowFunctionExpression yet!');
    return '';
}
exports.codeFromArrowFunctionExpression = codeFromArrowFunctionExpression;
function codeFromAssignmentExpression(ast) {
    return codeFromBinaryExpression(ast);
}
exports.codeFromAssignmentExpression = codeFromAssignmentExpression;
function codeFromAssignmentPattern(ast) {
    var str = codeFromAST(ast.left);
    var parent = ast.__parent;
    if (!parent || parent.type != typescript_estree_1.AST_NODE_TYPES.FunctionExpression) {
        str += ' = ' + codeFromAST(ast.right);
    }
    return str;
}
exports.codeFromAssignmentPattern = codeFromAssignmentPattern;
function codeFromAwaitExpression(ast) {
    console.assert(false, 'Not support AwaitExpression yet!');
    return '';
}
exports.codeFromAwaitExpression = codeFromAwaitExpression;
function codeFromBigIntLiteral(ast) {
    return codeFromLiteral(ast);
}
exports.codeFromBigIntLiteral = codeFromBigIntLiteral;
function codeFromBinaryExpression(ast) {
    var optStr = ast.operator;
    // TODO: Take care of string combination
    var left = codeFromAST(ast.left);
    var right = codeFromAST(ast.right);
    if (ast.operator == '+' && (ast.left.__isString || ast.right.__isString)) {
        optStr = '..';
        ast.left.__isString = true;
    }
    return left + optStr + right;
}
exports.codeFromBinaryExpression = codeFromBinaryExpression;
function codeFromBlockStatement(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        if (i > 0) {
            str += '\n';
        }
        str += codeFromAST(ast.body[i]);
    }
    return str;
}
exports.codeFromBlockStatement = codeFromBlockStatement;
function codeFromBreakStatement(ast) {
    console.assert(!ast.label, 'Not support break label yet!');
    return 'break';
}
exports.codeFromBreakStatement = codeFromBreakStatement;
function codeFromCallExpression(ast) {
    ast.callee.__parent = ast;
    var str = codeFromAST(ast.callee);
    str += '(';
    for (var i = 0, len = ast.arguments.length; i < len; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += codeFromAST(ast.arguments[i]);
    }
    str += ')';
    return str;
}
exports.codeFromCallExpression = codeFromCallExpression;
function codeFromCatchClause(ast) {
    var str = 'function($param$)'.replace('$param$', codeFromAST(ast.param));
    str += codeFromBlockStatement(ast.body);
    str += 'end';
    return str;
}
exports.codeFromCatchClause = codeFromCatchClause;
function codeFromClassBody(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        if (i > 0) {
            str += '\n';
        }
        str += codeFromAST(ast.body[i]);
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
        console.assert(false, 'Class name is necessary!');
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
        console.assert(false);
    }
    if (ast.decorators) {
        // Decorator[];
        console.assert(false);
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
    var str = 'if ' + codeFromAST(ast.test) + ' then \n';
    str += codeFromAST(ast.consequent) + '\n';
    if (ast.alternate) {
        str += 'else \n';
        str += codeFromAST(ast.alternate) + '\n';
    }
    str += 'end';
    return str;
}
exports.codeFromConditionalExpression = codeFromConditionalExpression;
function codeFromContinueStatement(ast) {
    console.assert(false, 'Not support ContinueStatement yet!');
    return '';
}
exports.codeFromContinueStatement = codeFromContinueStatement;
function codeFromDebuggerStatement(ast) {
    console.assert(false, 'Not support DebuggerStatement yet!');
    return '';
}
exports.codeFromDebuggerStatement = codeFromDebuggerStatement;
function codeFromDecorator(ast) {
    console.assert(false, 'Not support Decorator yet!');
    return '';
}
exports.codeFromDecorator = codeFromDecorator;
function codeFromDoWhileStatement(ast) {
    console.assert(false, 'Not support DoWhileStatement yet!');
    return '';
}
exports.codeFromDoWhileStatement = codeFromDoWhileStatement;
function codeFromEmptyStatement(ast) {
    console.assert(false, 'Not support EmptyStatement yet!');
    return '';
}
exports.codeFromEmptyStatement = codeFromEmptyStatement;
function codeFromExportAllDeclaration(ast) {
    console.assert(false, 'Not support ExportAllDeclaration yet!');
    return '';
}
exports.codeFromExportAllDeclaration = codeFromExportAllDeclaration;
function codeFromExportDefaultDeclaration(ast) {
    console.assert(false, 'Not support ExportDefaultDeclaration yet!');
    return '';
}
exports.codeFromExportDefaultDeclaration = codeFromExportDefaultDeclaration;
function codeFromExportNamedDeclaration(ast) {
    return codeFromAST(ast.declaration);
}
exports.codeFromExportNamedDeclaration = codeFromExportNamedDeclaration;
function codeFromExportSpecifier(ast) {
    console.assert(false, 'Not support ExportSpecifier yet!');
    return '';
}
exports.codeFromExportSpecifier = codeFromExportSpecifier;
function codeFromExpressionStatement(ast) {
    return codeFromAST(ast.expression);
}
exports.codeFromExpressionStatement = codeFromExpressionStatement;
function codeFromForInStatement(ast) {
    var str = 'for ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
    str += codeFromAST(ast.body) + '\n';
    str += 'end\n';
    return str;
}
exports.codeFromForInStatement = codeFromForInStatement;
function codeFromForOfStatement(ast) {
    var str = 'for _tmpi, ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
    str += codeFromAST(ast.body) + '\n';
    str += 'end\n';
    return str;
}
exports.codeFromForOfStatement = codeFromForOfStatement;
function codeFromForStatement(ast) {
    var str = '';
    if (ast.init) {
        str += codeFromAST(ast.init) + '\n';
    }
    str += 'repeat\n';
    var repeatBodyStr = codeFromAST(ast.body);
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
    return codeFromFunctionExpressionInternal(null, ast);
}
exports.codeFromFunctionExpression = codeFromFunctionExpression;
function codeFromFunctionExpressionInternal(funcName, ast) {
    var str = '';
    if (!funcName) {
        funcName = codeFromAST(ast.id);
    }
    if (funcName) {
        if ('constructor' == funcName) {
            funcName = 'ctor';
        }
        var className = classQueue[classQueue.length - 1];
        if (className) {
            // 成员函数
            str = 'function ' + className + '.prototype:' + funcName + '(';
        }
        else {
            // 普通函数
            str = 'function ' + funcName + '(';
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
    str += ')\n';
    if (ast.body) {
        blockDeep++;
        var bodyStr = codeFromAST(ast.body);
        if (defaultParamsStr) {
            bodyStr = defaultParamsStr + bodyStr;
        }
        str += indent(bodyStr) + '\n';
        blockDeep--;
    }
    console.assert(!ast.generator, 'Not support generator yet!');
    console.assert(!ast.async, 'Not support async yet!');
    console.assert(!ast.expression, 'Not support expression yet!');
    console.assert(!ast.typeParameters, 'Not support typeParameters yet!');
    console.assert(!ast.declare, 'Not support declare yet!');
    str += 'end\n';
    return str;
}
function codeFromIdentifier(ast) {
    return ast.name;
}
exports.codeFromIdentifier = codeFromIdentifier;
function codeFromIfStatement(ast) {
    var str = 'if ' + codeFromAST(ast.test) + ' then\n';
    str += indent(codeFromAST(ast.consequent) + '\n');
    if (ast.alternate) {
        str += 'else\n';
        str += indent(codeFromAST(ast.alternate) + '\n');
    }
    str += 'end\n';
    return str;
}
exports.codeFromIfStatement = codeFromIfStatement;
function codeFromImport(ast) {
    console.assert(false, 'Not support Import yet!');
    return '';
}
exports.codeFromImport = codeFromImport;
function codeFromImportDeclaration(ast) {
    var tmpl = "require({})\n";
    return sf(tmpl, ast.source.raw);
}
exports.codeFromImportDeclaration = codeFromImportDeclaration;
function codeFromImportDefaultSpecifier(ast) {
    console.assert(false, 'Not support ImportDefaultSpecifier yet!');
    return '';
}
exports.codeFromImportDefaultSpecifier = codeFromImportDefaultSpecifier;
function codeFromImportNamespaceSpecifier(ast) {
    console.assert(false, 'Not support ImportNamespaceSpecifier yet!');
    return '';
}
exports.codeFromImportNamespaceSpecifier = codeFromImportNamespaceSpecifier;
function codeFromImportSpecifier(ast) {
    console.assert(false, 'Not support ImportSpecifier yet!');
    return '';
}
exports.codeFromImportSpecifier = codeFromImportSpecifier;
function codeFromLabeledStatement(ast) {
    console.assert(false, 'Not support LabeledStatement yet!');
    return '';
}
exports.codeFromLabeledStatement = codeFromLabeledStatement;
function codeFromLiteral(ast) {
    if (ast.regex) {
        console.assert(false, 'Not support regex yet!');
    }
    if (typeof (ast.value) == 'string') {
        ast.__isString = true;
    }
    return ast.raw;
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
    var str = left + ast.operator + right;
    return str;
}
exports.codeFromLogicalExpression = codeFromLogicalExpression;
function codeFromMemberExpression(ast) {
    var str = codeFromAST(ast.object);
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
            str = '#' + str;
        }
        else {
            // TODO: do something with static members
            var parent_1 = ast.__parent;
            if (parent_1 && parent_1.type == typescript_estree_1.AST_NODE_TYPES.CallExpression) {
                str += ':';
            }
            else {
                str += '.';
            }
            str += codeFromAST(ast.property);
        }
    }
    return str;
}
exports.codeFromMemberExpression = codeFromMemberExpression;
function codeFromMetaProperty(ast) {
    console.assert(false, 'Not support MetaProperty yet!');
    return '';
}
exports.codeFromMetaProperty = codeFromMetaProperty;
function codeFromMethodDefinition(ast) {
    var funcName = null;
    if (ast.key) {
        funcName = codeFromAST(ast.key);
    }
    if (ast.value.type == "TSEmptyBodyFunctionExpression") {
        console.assert(false, 'Not support TSEmptyBodyFunctionExpression yet!');
    }
    return codeFromFunctionExpressionInternal(funcName, ast.value);
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
    console.assert(false, 'Not support ObjectPattern yet!');
    return '';
}
exports.codeFromObjectPattern = codeFromObjectPattern;
function codeFromProgram(ast) {
    var str = '';
    for (var i = 0, len = ast.body.length; i < len; i++) {
        if (i > 0) {
            str += '\n';
            str += '--分割线\n';
            str += '\n';
        }
        var stm = ast.body[i];
        str += codeFromAST(stm);
    }
    return str;
}
exports.codeFromProgram = codeFromProgram;
function codeFromProperty(ast) {
    return codeFromAST(ast.key) + ':' + codeFromAST(ast.value);
}
exports.codeFromProperty = codeFromProperty;
function codeFromRestElement(ast) {
    console.assert(false, 'Not support RestElement yet!');
    return '';
}
exports.codeFromRestElement = codeFromRestElement;
function codeFromReturnStatement(ast) {
    return 'return ' + codeFromAST(ast.argument);
}
exports.codeFromReturnStatement = codeFromReturnStatement;
function codeFromSequenceExpression(ast) {
    var str = '(';
    for (var i = 0, len = ast.expressions.length; i < len; i++) {
        if (i > 0) {
            str += ', ';
        }
        str += codeFromAST(ast.expressions[i]);
    }
    return str + ')';
}
exports.codeFromSequenceExpression = codeFromSequenceExpression;
function codeFromSpreadElement(ast) {
    console.assert(false, 'Not support SpreadElement yet!');
    return '';
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
    for (var i = 0, len = ast.consequent.length; i < len; i++) {
        str += codeFromAST(ast.consequent[i]) + '\n';
    }
    str += 'end\n';
    return str;
}
exports.codeFromSwitchCase = codeFromSwitchCase;
function codeFromSwitchStatement(ast) {
    var str = 'local switch = {\n';
    for (var i = 0, len = ast.cases.length; i < len; i++) {
        if (i > 0) {
            str += ',\n';
        }
        str += codeFromSwitchCase(ast.cases[i]);
    }
    str += '}\n';
    str += 'local casef = switch[' + codeFromAST(ast.discriminant) + ']\n';
    str += 'if not casef then\n';
    str += 'casef = switch["default"]\n';
    str += 'end\n';
    str += 'casef()\n';
    str += 'end';
    return str;
}
exports.codeFromSwitchStatement = codeFromSwitchStatement;
function codeFromTaggedTemplateExpression(ast) {
    console.assert(false, 'Not support TaggedTemplateExpression yet!');
    return '';
}
exports.codeFromTaggedTemplateExpression = codeFromTaggedTemplateExpression;
function codeFromTemplateElement(ast) {
    console.assert(false, 'Not support TemplateElement yet!');
    return '';
}
exports.codeFromTemplateElement = codeFromTemplateElement;
function codeFromTemplateLiteral(ast) {
    console.assert(false, 'Not support TemplateLiteral yet!');
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
    console.assert(false, 'Not support codeFromTryStatement yet!');
    return '';
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
        else if ('void' == ast.operator) {
            console.assert(false, 'Not support void yet!');
        }
        else {
            console.assert(false, 'Not support UnaryOperator: ' + ast.operator);
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
    var str = '';
    for (var i = 0, len = ast.declarations.length; i < len; i++) {
        // TODO: no local in for statement
        if (i > 0) {
            str += '\n';
        }
        str += 'local ' + codeFromVariableDeclarator(ast.declarations[i]);
    }
    return str;
}
exports.codeFromVariableDeclaration = codeFromVariableDeclaration;
function codeFromVariableDeclarator(ast) {
    var str = codeFromAST(ast.id);
    if (ast.init) {
        str += '=' + codeFromAST(ast.init);
    }
    else {
        console.assert(false, 'Not support VariableDeclarator without init yet');
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
    console.assert(false, 'Not support WithStatement yet');
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
function codeFromTSEnumDeclaration(ast) {
    console.assert(false, 'Not support TSEnumDeclaration yet');
    return '';
}
exports.codeFromTSEnumDeclaration = codeFromTSEnumDeclaration;
function indent(str) {
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
        newStr += indentStr + lines[i];
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
    return '<TT>[ts2lua]' + rawTip + '</TT>';
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
