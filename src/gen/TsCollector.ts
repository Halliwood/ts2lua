import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, BaseNode } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree/dist/ts-estree/ast-node-types';

export interface TsPropInfo {
  name: string;
  isStatic: boolean;
}

export interface TsFuncInfo {
  name: string;
  isStatic: boolean;
} 

export interface TsClassInfo {
  name: string;
  properties: { [name: string]: TsPropInfo };
  funcs: { [name: string]: TsFuncInfo };
}
export class TsCollector {
  public classMap: { [name: string]: TsClassInfo } = {};
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
    let info: TsClassInfo = { name: ast.id.name, properties: {}, funcs: {} };
    for(let cbb of ast.body.body) {
      if(cbb.type == AST_NODE_TYPES.ClassProperty) {
        let cp = cbb as ClassProperty;
        let cpInfo: TsPropInfo = { name: (cp.key as Identifier).name, isStatic: cp.static };
        info.properties[cpInfo.name] = cpInfo;
      } else if(cbb.type == AST_NODE_TYPES.MethodDefinition) {
        let md = cbb as MethodDefinition;
        let mdInfo: TsFuncInfo = { name: (md.key as Identifier).name, isStatic: md.static };
        info.funcs[mdInfo.name] = mdInfo;
      }
    }
    this.classMap[ast.id.name] = info;
    if(this.moduleName) {
      this.classMap[this.moduleName + '.' + ast.id.name] = info;
    }
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