import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, BaseNode, TSEnumMember, TSTypeAnnotation } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree/dist/ts-estree/ast-node-types';

export interface TsInfoBase {
  type: AST_NODE_TYPES;
}

export interface TsPropInfo extends TsInfoBase {
  type: AST_NODE_TYPES.ClassProperty;
  name: string;
  isStatic: boolean;
  varType: TSTypeAnnotation;
}

export interface TsFuncInfo extends TsInfoBase {
  type: AST_NODE_TYPES.MethodDefinition;
  name: string;
  isStatic: boolean;
  returnType: TSTypeAnnotation;
} 

export interface TsClassInfo extends TsInfoBase {
  type: AST_NODE_TYPES.ClassDeclaration;
  name: string;
  properties: { [name: string]: TsPropInfo };
  funcs: { [name: string]: TsFuncInfo };
}

export interface TsEnumMemberInfo extends TsInfoBase {
  type: AST_NODE_TYPES.TSEnumMember;
  name: string;
}

export interface TsEnumInfo extends TsInfoBase {
  type: AST_NODE_TYPES.TSEnumDeclaration;
  name: string;
  members: { [name: string]: TsEnumMemberInfo };
}

export class TsCollector {
  public classMap: { [name: string]: TsClassInfo } = {};
  public enumMap: { [name: string]: TsEnumInfo } = {};
  private moduleName: string = '';

  public collect(ast: Program): void {
    this.moduleName = '';
    for(let i = 0, len = ast.body.length; i < len; i++) {
      let theBody = ast.body[i];
      this.processAST(theBody);
    }
  }

  private processAST(ast: any) {
    switch(ast.type) {
      case AST_NODE_TYPES.ClassDeclaration:
        this.processClassDeclaration(ast as ClassDeclaration);
        break;
      case AST_NODE_TYPES.TSEnumDeclaration:
        this.processTSEnumDeclaration(ast as TSEnumDeclaration);
        break;
      case AST_NODE_TYPES.ExportNamedDeclaration:
        this.processExportNamedDeclaration(ast as ExportNamedDeclaration);
        break;
      case AST_NODE_TYPES.TSModuleBlock:
        this.processTSModuleBlock(ast as TSModuleBlock);
        break;
      case AST_NODE_TYPES.TSModuleDeclaration:
        this.processTSModuleDeclaration(ast as TSModuleDeclaration);
        break;
      default:
        break;
    }
  }

  private processTSModuleBlock(ast: TSModuleBlock) {
    for(let stt of ast.body) {
      this.processAST(stt);
    }
  }


  private processTSModuleDeclaration(ast: TSModuleDeclaration) {
    this.moduleName = this.getId(ast.id);
    this.processAST(ast.body);
    this.moduleName = '';
  }

  private processClassDeclaration(ast: ClassDeclaration) {
    let info: TsClassInfo = { type: AST_NODE_TYPES.ClassDeclaration, name: ast.id.name, properties: {}, funcs: {} };
    for(let cbb of ast.body.body) {
      if(cbb.type == AST_NODE_TYPES.ClassProperty) {
        let cp = cbb as ClassProperty;
        let cpInfo: TsPropInfo = { type: AST_NODE_TYPES.ClassProperty, name: (cp.key as Identifier).name, isStatic: cp.static, varType: cp.typeAnnotation };
        info.properties[cpInfo.name] = cpInfo;
      } else if(cbb.type == AST_NODE_TYPES.MethodDefinition) {
        let md = cbb as MethodDefinition;
        let mdInfo: TsFuncInfo = { type: AST_NODE_TYPES.MethodDefinition, name: (md.key as Identifier).name, isStatic: md.static, returnType: md.value.returnType };
        info.funcs[mdInfo.name] = mdInfo;
      }
    }
    this.classMap[ast.id.name] = info;
    if(this.moduleName) {
      this.classMap[this.moduleName + '.' + ast.id.name] = info;
    }
  }

  private processTSEnumDeclaration(ast: TSEnumDeclaration) {
    let info: TsEnumInfo = { type: AST_NODE_TYPES.TSEnumDeclaration, name: ast.id.name, members: {} };
    for(let em of ast.members) {
      let emInfo: TsEnumMemberInfo = { type: AST_NODE_TYPES.TSEnumMember, name: this.getId(em.id) };
      info.members[emInfo.name] = emInfo;
    }
    this.enumMap[info.name] = info;
  }

  private processExportNamedDeclaration(ast: ExportNamedDeclaration) {
    this.processAST(ast.declaration);
  }

  private getId(ast: Identifier | Literal): string {
    if(ast.type == AST_NODE_TYPES.Identifier) {
      return (ast as Identifier).name;
    }
    return (ast as Literal).value as string;
  }
}