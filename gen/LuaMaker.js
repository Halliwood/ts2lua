"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_estree_1 = require("@typescript-eslint/typescript-estree");
var sf = require("string-format");
function processAST(ast, str) {
    if (str === void 0) { str = ''; }
    switch (ast.type) {
        case typescript_estree_1.AST_NODE_TYPES.ArrayExpression:
            str += processArrayExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
            str += processArrayPattern(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ArrowFunctionExpression:
            str += processArrowFunctionExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
            str += processAssignmentExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
            str += processAssignmentPattern(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.AwaitExpression:
            str += processAwaitExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BigIntLiteral:
            str += processBigIntLiteral(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
            str += processBinaryExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
            str += processBlockStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.BreakStatement:
            str += processBreakStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.CallExpression:
            str += processCallExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.CatchClause:
            str += processCatchClause(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassBody:
            str += processClassBody(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassDeclaration:
            str += processClassDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassExpression:
            str += processClassExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ClassProperty:
            str += processClassProperty(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
            str += processConditionalExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ContinueStatement:
            str += processContinueStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.DebuggerStatement:
            str += processDebuggerStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Decorator:
            str += processDecorator(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.DoWhileStatement:
            str += processDoWhileStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.EmptyStatement:
            str += processEmptyStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportAllDeclaration:
            str += processExportAllDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportDefaultDeclaration:
            str += processExportDefaultDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportNamedDeclaration:
            str += processExportNamedDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExportSpecifier:
            str += processExportSpecifier(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
            str += processExpressionStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForInStatement:
            str += processForInStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForOfStatement:
            str += processForOfStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ForStatement:
            str += processForStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration:
            str += processFunctionDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
            str += processFunctionExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Identifier:
            str += processIdentifier(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.IfStatement:
            str += processIfStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Import:
            str += processImport(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportDeclaration:
            str += processImportDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportDefaultSpecifier:
            str += processImportDefaultSpecifier(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportNamespaceSpecifier:
            str += processImportNamespaceSpecifier(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ImportSpecifier:
            str += processImportSpecifier(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.LabeledStatement:
            str += processLabeledStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Literal:
            str += processLiteral(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
            str += processLogicalExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
            str += processMemberExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MetaProperty:
            str += processMetaProperty(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.MethodDefinition:
            str += processMethodDefinition(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.NewExpression:
            str += processNewExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ObjectExpression:
            str += processObjectExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ObjectPattern:
            str += processObjectPattern(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Program:
            str += processProgram(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Property:
            str += processProperty(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.RestElement:
            str += processRestElement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ReturnStatement:
            str += processReturnStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
            str += processSequenceExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SpreadElement:
            str += processSpreadElement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.Super:
            str += processSuper(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SwitchCase:
            str += processSwitchCase(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.SwitchStatement:
            str += processSwitchStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TaggedTemplateExpression:
            str += processTaggedTemplateExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TemplateElement:
            str += processTemplateElement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TemplateLiteral:
            str += processTemplateLiteral(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ThisExpression:
            str += processThisExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.ThrowStatement:
            str += processThrowStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TryStatement:
            str += processTryStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
            str += processUnaryExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
            str += processUpdateExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.VariableDeclaration:
            str += processVariableDeclaration(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.VariableDeclarator:
            str += processVariableDeclarator(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.WhileStatement:
            str += processWhileStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.WithStatement:
            str += processWithStatement(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.YieldExpression:
            str += processYieldExpression(ast, str);
            break;
        case typescript_estree_1.AST_NODE_TYPES.TSEnumDeclaration:
            str += processTSEnumDeclaration(ast, str);
            break;
        default:
            console.error('unrecornized type: %s', ast.type);
            break;
    }
    return str;
}
exports.processAST = processAST;
function processArrayExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processArrayExpression = processArrayExpression;
function processArrayPattern(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processArrayPattern = processArrayPattern;
function processArrowFunctionExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processArrowFunctionExpression = processArrowFunctionExpression;
function processAssignmentExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processAssignmentExpression = processAssignmentExpression;
function processAssignmentPattern(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processAssignmentPattern = processAssignmentPattern;
function processAwaitExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processAwaitExpression = processAwaitExpression;
function processBigIntLiteral(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processBigIntLiteral = processBigIntLiteral;
function processBinaryExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processBinaryExpression = processBinaryExpression;
function processBlockStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processBlockStatement = processBlockStatement;
function processBreakStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processBreakStatement = processBreakStatement;
function processCallExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processCallExpression = processCallExpression;
function processCatchClause(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processCatchClause = processCatchClause;
function processClassBody(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processClassBody = processClassBody;
function processClassDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processClassDeclaration = processClassDeclaration;
function processClassExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processClassExpression = processClassExpression;
function processClassProperty(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processClassProperty = processClassProperty;
function processConditionalExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processConditionalExpression = processConditionalExpression;
function processContinueStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processContinueStatement = processContinueStatement;
function processDebuggerStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processDebuggerStatement = processDebuggerStatement;
function processDecorator(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processDecorator = processDecorator;
function processDoWhileStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processDoWhileStatement = processDoWhileStatement;
function processEmptyStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processEmptyStatement = processEmptyStatement;
function processExportAllDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processExportAllDeclaration = processExportAllDeclaration;
function processExportDefaultDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processExportDefaultDeclaration = processExportDefaultDeclaration;
function processExportNamedDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processExportNamedDeclaration = processExportNamedDeclaration;
function processExportSpecifier(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processExportSpecifier = processExportSpecifier;
function processExpressionStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processExpressionStatement = processExpressionStatement;
function processForInStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processForInStatement = processForInStatement;
function processForOfStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processForOfStatement = processForOfStatement;
function processForStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processForStatement = processForStatement;
function processFunctionDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processFunctionDeclaration = processFunctionDeclaration;
function processFunctionExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processFunctionExpression = processFunctionExpression;
function processIdentifier(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processIdentifier = processIdentifier;
function processIfStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processIfStatement = processIfStatement;
function processImport(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processImport = processImport;
function processImportDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    var tmpl = "require({})\n";
    return sf(tmpl, ast.source.raw);
}
exports.processImportDeclaration = processImportDeclaration;
function processImportDefaultSpecifier(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processImportDefaultSpecifier = processImportDefaultSpecifier;
function processImportNamespaceSpecifier(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processImportNamespaceSpecifier = processImportNamespaceSpecifier;
function processImportSpecifier(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processImportSpecifier = processImportSpecifier;
function processLabeledStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processLabeledStatement = processLabeledStatement;
function processLiteral(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processLiteral = processLiteral;
function processLogicalExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processLogicalExpression = processLogicalExpression;
function processMemberExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processMemberExpression = processMemberExpression;
function processMetaProperty(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processMetaProperty = processMetaProperty;
function processMethodDefinition(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processMethodDefinition = processMethodDefinition;
function processNewExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processNewExpression = processNewExpression;
function processObjectExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processObjectExpression = processObjectExpression;
function processObjectPattern(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processObjectPattern = processObjectPattern;
function processProgram(ast, str) {
    if (str === void 0) { str = ''; }
    for (var i = 0, len = ast.body.length; i < len; i++) {
        var stm = ast.body[i];
        str = processAST(stm, str);
    }
    return str;
}
exports.processProgram = processProgram;
function processProperty(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processProperty = processProperty;
function processRestElement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processRestElement = processRestElement;
function processReturnStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processReturnStatement = processReturnStatement;
function processSequenceExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processSequenceExpression = processSequenceExpression;
function processSpreadElement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processSpreadElement = processSpreadElement;
function processSuper(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processSuper = processSuper;
function processSwitchCase(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processSwitchCase = processSwitchCase;
function processSwitchStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processSwitchStatement = processSwitchStatement;
function processTaggedTemplateExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processTaggedTemplateExpression = processTaggedTemplateExpression;
function processTemplateElement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processTemplateElement = processTemplateElement;
function processTemplateLiteral(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processTemplateLiteral = processTemplateLiteral;
function processThisExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processThisExpression = processThisExpression;
function processThrowStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processThrowStatement = processThrowStatement;
function processTryStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processTryStatement = processTryStatement;
function processUnaryExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processUnaryExpression = processUnaryExpression;
function processUpdateExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processUpdateExpression = processUpdateExpression;
function processVariableDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processVariableDeclaration = processVariableDeclaration;
function processVariableDeclarator(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processVariableDeclarator = processVariableDeclarator;
function processWhileStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processWhileStatement = processWhileStatement;
function processWithStatement(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processWithStatement = processWithStatement;
function processYieldExpression(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processYieldExpression = processYieldExpression;
function processTSEnumDeclaration(ast, str) {
    if (str === void 0) { str = ''; }
    return str;
}
exports.processTSEnumDeclaration = processTSEnumDeclaration;
