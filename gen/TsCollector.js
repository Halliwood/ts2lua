"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ast_node_types_1 = require("@typescript-eslint/typescript-estree/dist/ts-estree/ast-node-types");
var TsCollector = /** @class */ (function () {
    function TsCollector() {
        this.classMap = {};
        this.enumMap = {};
        this.moduleName = '';
    }
    TsCollector.prototype.collect = function (ast) {
        this.moduleName = '';
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var theBody = ast.body[i];
            this.processAST(theBody);
        }
    };
    TsCollector.prototype.processAST = function (ast) {
        switch (ast.type) {
            case ast_node_types_1.AST_NODE_TYPES.ClassDeclaration:
                this.processClassDeclaration(ast);
                break;
            case ast_node_types_1.AST_NODE_TYPES.TSEnumDeclaration:
                this.processTSEnumDeclaration(ast);
                break;
            case ast_node_types_1.AST_NODE_TYPES.ExportNamedDeclaration:
                this.processExportNamedDeclaration(ast);
                break;
            case ast_node_types_1.AST_NODE_TYPES.TSModuleBlock:
                this.processTSModuleBlock(ast);
                break;
            case ast_node_types_1.AST_NODE_TYPES.TSModuleDeclaration:
                this.processTSModuleDeclaration(ast);
                break;
            default:
                break;
        }
    };
    TsCollector.prototype.processTSModuleBlock = function (ast) {
        for (var _i = 0, _a = ast.body; _i < _a.length; _i++) {
            var stt = _a[_i];
            this.processAST(stt);
        }
    };
    TsCollector.prototype.processTSModuleDeclaration = function (ast) {
        this.moduleName = this.getId(ast.id);
        this.processAST(ast.body);
        this.moduleName = '';
    };
    TsCollector.prototype.processClassDeclaration = function (ast) {
        var info = { type: ast_node_types_1.AST_NODE_TYPES.ClassDeclaration, name: ast.id.name, properties: {}, funcs: {} };
        for (var _i = 0, _a = ast.body.body; _i < _a.length; _i++) {
            var cbb = _a[_i];
            if (cbb.type == ast_node_types_1.AST_NODE_TYPES.ClassProperty) {
                var cp = cbb;
                var cpInfo = { type: ast_node_types_1.AST_NODE_TYPES.ClassProperty, name: cp.key.name, isStatic: cp.static };
                info.properties[cpInfo.name] = cpInfo;
            }
            else if (cbb.type == ast_node_types_1.AST_NODE_TYPES.MethodDefinition) {
                var md = cbb;
                var mdInfo = { type: ast_node_types_1.AST_NODE_TYPES.MethodDefinition, name: md.key.name, isStatic: md.static };
                info.funcs[mdInfo.name] = mdInfo;
            }
        }
        this.classMap[ast.id.name] = info;
        if (this.moduleName) {
            this.classMap[this.moduleName + '.' + ast.id.name] = info;
        }
    };
    TsCollector.prototype.processTSEnumDeclaration = function (ast) {
        var info = { type: ast_node_types_1.AST_NODE_TYPES.TSEnumDeclaration, name: ast.id.name, members: {} };
        for (var _i = 0, _a = ast.members; _i < _a.length; _i++) {
            var em = _a[_i];
            var emInfo = { type: ast_node_types_1.AST_NODE_TYPES.TSEnumMember, name: this.getId(em.id) };
            info.members[emInfo.name] = emInfo;
        }
        this.enumMap[info.name] = info;
    };
    TsCollector.prototype.processExportNamedDeclaration = function (ast) {
        this.processAST(ast.declaration);
    };
    TsCollector.prototype.getId = function (ast) {
        if (ast.type == ast_node_types_1.AST_NODE_TYPES.Identifier) {
            return ast.name;
        }
        return ast.value;
    };
    return TsCollector;
}());
exports.TsCollector = TsCollector;
