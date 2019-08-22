import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, BaseNode } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import util = require('util');
import path = require('path');
import { TsClassInfo } from './TsCollector';
import { TranslateOption } from './TranslateOption';

export class LuaMaker {
  private readonly noBraceTypes = [AST_NODE_TYPES.MemberExpression, AST_NODE_TYPES.ThisExpression, AST_NODE_TYPES.Identifier, AST_NODE_TYPES.CallExpression, AST_NODE_TYPES.TSAsExpression];

  // TODO: Typeof's return value may be different between ts and lua
  private readonly tsType2luaType = {
    'undefined': 'nil',
    'object': 'table'
  };
  
  private readonly luaKeyWords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while'];
  
  private pv = 0;
  private readonly operatorPriorityMap: { [opt: string]: number } = {};

  constructor() {
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
  
  private setPriority(keys: string[], value: number) {
    for (let i = 0, len = keys.length; i < len; i++) {
      this.operatorPriorityMap[keys[i]] = value;
    }
  }
  
  private getPriority(raw: string) {
    let idx = this.operatorPriorityMap[raw];
    if (idx < 0) {
      idx = 999;
      console.error('no prioritys: ' + raw);
    }
    return idx;
  }
  
  private calPriority(ast: any) {
    if ('__calPriority' in ast) {
      return ast.__calPriority;
    }
    switch (ast.type) {
      case AST_NODE_TYPES.UnaryExpression:
        {
          let ue = ast as UnaryExpression;
          ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
        }
        break;
  
      case AST_NODE_TYPES.UpdateExpression:
        {
          let ue = ast as UpdateExpression;
          ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
        }
        break;
  
      case AST_NODE_TYPES.BinaryExpression:
        {
          let be = ast as BinaryExpression;
          ast.__calPriority = this.getPriority('… ' + be.operator + ' …');
        }
        break;
  
      case AST_NODE_TYPES.AssignmentExpression:
        {
          let ae = ast as AssignmentExpression;
          ast.__calPriority = this.getPriority('… ' + ae.operator + ' …');
        }
        break;
  
      case AST_NODE_TYPES.LogicalExpression:
        {
          let le = ast as LogicalExpression;
          ast.__calPriority = this.getPriority('… ' + le.operator + ' …');
        }
        break;
  
      case AST_NODE_TYPES.MemberExpression:
        {
          let me = ast as MemberExpression;
          ast.__calPriority = this.getPriority(me.computed ? '… [ … ]' : '… . …');
        }
        break;
  
      case AST_NODE_TYPES.ConditionalExpression:
        {
          ast.__calPriority = this.getPriority('… ? … : …');
        }
        break;
  
      case AST_NODE_TYPES.CallExpression:
        {
          ast.__calPriority = this.getPriority('… ( … )');
        }
        break;
  
      case AST_NODE_TYPES.NewExpression:
        {
          let ne = ast as NewExpression;
          if (ne.arguments.length > 0) {
            ast.__calPriority = this.getPriority('new … ( … )');
          } else {
            ast.__calPriority = this.getPriority('new …');
          }
        }
        break;
  
      case AST_NODE_TYPES.SequenceExpression:
        {
          ast.__calPriority = this.getPriority('… , …');
        }
        break;
    }
    return ast.__calPriority;
  }
  
  private usedIdMap: { [id: string]: boolean } = {}
  private importAsts: ImportDeclaration[] = [];
  private importContents: string[] = [];
  private enumContents: string[] = [];
  private classMap: { [name: string]: TsClassInfo };
  private allClasses: string[] = [];
  private classQueue: string[] = [];
  private moduleQueue: string[] = [];
  private hasContinue = false;
  private inSwitchCase = false;
  private inStatic = false;
  
  private filePath: string;
  private isDevMode = false;
  private option: TranslateOption;
  private funcReplConf: {[func: string]: string} = {};
  private regexReplConf: {[regex: string]: string} = {};

  public unknowRegexs: string[] = [];

  public setEnv(devMode: boolean, option: TranslateOption, funcReplConf: {[func: string]: string}, regexReplConf: {[regex: string]: string}): void {
    this.isDevMode = devMode;
    this.option = option;
    this.funcReplConf = funcReplConf;
    this.regexReplConf = regexReplConf;
  }

  public setClassMap(classMap: { [name: string]: TsClassInfo }) {
    this.classMap = classMap;
  }
  
  public toLua(ast: any, pfilePath: string, rootPath: string): string {
    this.filePath = pfilePath;
  
    this.usedIdMap = {};
    this.importContents.length = 0;
    this.enumContents.length = 0;
    this.importAsts.length = 0;
    this.allClasses.length = 0;
    this.classQueue.length = 0;
    let outStr = '';
    let content = this.codeFromAST(ast);
    content = content.replace(/console[\.|:]log/g, 'print');
    content = this.formatTip(content);
    content = this.formatPop(content);
    if('xlua' == this.option.style) {
      content = content.replace(/UnityEngine\./g, 'CS.UnityEngine.');
    }
  
    if(!this.option.requireAllInOne) {
      if(this.allClasses.length > 0) {
        this.importContents.push('class');
      }
      for(let ia of this.importAsts) {
        let importIsUsed = false;
        for(let s of ia.specifiers) {
          if(this.usedIdMap[s.local.name]) {
            importIsUsed = true;
            break;
          }
        }
        if(importIsUsed) {
          let p = (ia.source as Literal).value as string;
          if(this.importContents.indexOf(p) < 0) {
            this.importContents.push(p);
          }
        }
      }
      this.importContents.sort();
      for(let p of this.importContents) {
        if(p.indexOf('./') == 0 || p.indexOf('../') == 0) {
          p = path.relative(rootPath, path.join(path.dirname(pfilePath), p)).replace(/\\+/g, '/');
        } 
        outStr += 'require("' + p + '")\n';
      }
    }

    outStr += this.enumContents.join('\n');
    
    outStr += content;
    return outStr;
  }
  
  private codeFromAST(ast: any): string {
    let str = '';
    switch (ast.type) {
  
      case AST_NODE_TYPES.ArrayExpression:
        str += this.codeFromArrayExpression(ast);
        break;
  
      case AST_NODE_TYPES.ArrayPattern:
        str += this.codeFromArrayPattern(ast);
        break;
  
      case AST_NODE_TYPES.ArrowFunctionExpression:
        str += this.codeFromArrowFunctionExpression(ast);
        break;
  
      case AST_NODE_TYPES.AssignmentExpression:
        str += this.codeFromAssignmentExpression(ast);
        break;
  
      case AST_NODE_TYPES.AssignmentPattern:
        str += this.codeFromAssignmentPattern(ast);
        break;
  
      case AST_NODE_TYPES.AwaitExpression:
        str += this.codeFromAwaitExpression(ast);
        break;
  
      case AST_NODE_TYPES.BigIntLiteral:
        str += this.codeFromBigIntLiteral(ast);
        break;
  
      case AST_NODE_TYPES.BinaryExpression:
        str += this.codeFromBinaryExpression(ast);
        break;
  
      case AST_NODE_TYPES.BlockStatement:
        str += this.codeFromBlockStatement(ast);
        break;
  
      case AST_NODE_TYPES.BreakStatement:
        str += this.codeFromBreakStatement(ast);
        break;
  
      case AST_NODE_TYPES.CallExpression:
        str += this.codeFromCallExpression(ast);
        break;
  
      case AST_NODE_TYPES.CatchClause:
        str += this.codeFromCatchClause(ast);
        break;
  
      case AST_NODE_TYPES.ClassBody:
        str += this.codeFromClassBody(ast);
        break;
  
      case AST_NODE_TYPES.ClassDeclaration:
        str += this.codeFromClassDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.ClassExpression:
        str += this.codeFromClassExpression(ast);
        break;
  
      case AST_NODE_TYPES.ClassProperty:
        str += this.codeFromClassProperty(ast);
        break;
  
      case AST_NODE_TYPES.ConditionalExpression:
        str += this.codeFromConditionalExpression(ast);
        break;
  
      case AST_NODE_TYPES.ContinueStatement:
        str += this.codeFromContinueStatement(ast);
        break;
  
      case AST_NODE_TYPES.DebuggerStatement:
        str += this.codeFromDebuggerStatement(ast);
        break;
  
      case AST_NODE_TYPES.Decorator:
        str += this.codeFromDecorator(ast);
        break;
  
      case AST_NODE_TYPES.DoWhileStatement:
        str += this.codeFromDoWhileStatement(ast);
        break;
  
      case AST_NODE_TYPES.EmptyStatement:
        str += this.codeFromEmptyStatement(ast);
        break;
  
      case AST_NODE_TYPES.ExportAllDeclaration:
        str += this.codeFromExportAllDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.ExportDefaultDeclaration:
        str += this.codeFromExportDefaultDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.ExportNamedDeclaration:
        str += this.codeFromExportNamedDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.ExportSpecifier:
        str += this.codeFromExportSpecifier(ast);
        break;
  
      case AST_NODE_TYPES.ExpressionStatement:
        str += this.codeFromExpressionStatement(ast);
        break;
  
      case AST_NODE_TYPES.ForInStatement:
        str += this.codeFromForInStatement(ast);
        break;
  
      case AST_NODE_TYPES.ForOfStatement:
        str += this.codeFromForOfStatement(ast);
        break;
  
      case AST_NODE_TYPES.ForStatement:
        str += this.codeFromForStatement(ast);
        break;
  
      case AST_NODE_TYPES.FunctionDeclaration:
        str += this.codeFromFunctionDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.FunctionExpression:
        str += this.codeFromFunctionExpression(ast);
        break;
  
      case AST_NODE_TYPES.Identifier:
        str += this.codeFromIdentifier(ast);
        break;
  
      case AST_NODE_TYPES.IfStatement:
        str += this.codeFromIfStatement(ast);
        break;
  
      case AST_NODE_TYPES.Import:
        str += this.codeFromImport(ast);
        break;
  
      case AST_NODE_TYPES.ImportDeclaration:
        str += this.codeFromImportDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.ImportDefaultSpecifier:
        str += this.codeFromImportDefaultSpecifier(ast);
        break;
  
      case AST_NODE_TYPES.ImportNamespaceSpecifier:
        str += this.codeFromImportNamespaceSpecifier(ast);
        break;
  
      case AST_NODE_TYPES.ImportSpecifier:
        str += this.codeFromImportSpecifier(ast);
        break;
  
      case AST_NODE_TYPES.LabeledStatement:
        str += this.codeFromLabeledStatement(ast);
        break;
  
      case AST_NODE_TYPES.Literal:
        str += this.codeFromLiteral(ast);
        break;
  
      case AST_NODE_TYPES.LogicalExpression:
        str += this.codeFromLogicalExpression(ast);
        break;
  
      case AST_NODE_TYPES.MemberExpression:
        str += this.codeFromMemberExpression(ast);
        break;
  
      case AST_NODE_TYPES.MetaProperty:
        str += this.codeFromMetaProperty(ast);
        break;
  
      case AST_NODE_TYPES.MethodDefinition:
        str += this.codeFromMethodDefinition(ast);
        break;
  
      case AST_NODE_TYPES.NewExpression:
        str += this.codeFromNewExpression(ast);
        break;
  
      case AST_NODE_TYPES.ObjectExpression:
        str += this.codeFromObjectExpression(ast);
        break;
  
      case AST_NODE_TYPES.ObjectPattern:
        str += this.codeFromObjectPattern(ast);
        break;
  
      case AST_NODE_TYPES.Program:
        str += this.codeFromProgram(ast);
        break;
  
      case AST_NODE_TYPES.Property:
        str += this.codeFromProperty(ast);
        break;
  
      case AST_NODE_TYPES.RestElement:
        str += this.codeFromRestElement(ast);
        break;
  
      case AST_NODE_TYPES.ReturnStatement:
        str += this.codeFromReturnStatement(ast);
        break;
  
      case AST_NODE_TYPES.SequenceExpression:
        str += this.codeFromSequenceExpression(ast);
        break;
  
      case AST_NODE_TYPES.SpreadElement:
        str += this.codeFromSpreadElement(ast);
        break;
  
      case AST_NODE_TYPES.Super:
        str += this.codeFromSuper(ast);
        break;
  
      case AST_NODE_TYPES.SwitchCase:
        str += this.codeFromSwitchCase(ast);
        break;
  
      case AST_NODE_TYPES.SwitchStatement:
        str += this.codeFromSwitchStatement(ast);
        break;
  
      case AST_NODE_TYPES.TaggedTemplateExpression:
        str += this.codeFromTaggedTemplateExpression(ast);
        break;
  
      case AST_NODE_TYPES.TemplateElement:
        str += this.codeFromTemplateElement(ast);
        break;
  
      case AST_NODE_TYPES.TemplateLiteral:
        str += this.codeFromTemplateLiteral(ast);
        break;
  
      case AST_NODE_TYPES.ThisExpression:
        str += this.codeFromThisExpression(ast);
        break;
  
      case AST_NODE_TYPES.ThrowStatement:
        str += this.codeFromThrowStatement(ast);
        break;
  
      case AST_NODE_TYPES.TryStatement:
        str += this.codeFromTryStatement(ast);
        break;
  
      case AST_NODE_TYPES.UnaryExpression:
        str += this.codeFromUnaryExpression(ast);
        break;
  
      case AST_NODE_TYPES.UpdateExpression:
        str += this.codeFromUpdateExpression(ast);
        break;
  
      case AST_NODE_TYPES.VariableDeclaration:
        str += this.codeFromVariableDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.VariableDeclarator:
        str += this.codeFromVariableDeclarator(ast);
        break;
  
      case AST_NODE_TYPES.WhileStatement:
        str += this.codeFromWhileStatement(ast);
        break;
  
      case AST_NODE_TYPES.WithStatement:
        str += this.codeFromWithStatement(ast);
        break;
  
      case AST_NODE_TYPES.YieldExpression:
        str += this.codeFromYieldExpression(ast);
        break;
  
      case AST_NODE_TYPES.TSAbstractMethodDefinition:
        str += this.codeFromTSAbstractMethodDefinition(ast);
        break;
  
      case AST_NODE_TYPES.TSAsExpression:
        str += this.codeFromTSAsExpression(ast);
        break;
  
      case AST_NODE_TYPES.TSDeclareFunction:
        str += this.codeFromTSDeclareFunction(ast);
        break;
  
      case AST_NODE_TYPES.TSEnumDeclaration:
        str += this.codeFromTSEnumDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.TSModuleBlock:
        str += this.codeFromTSModuleBlock(ast);
        break;
  
      case AST_NODE_TYPES.TSModuleDeclaration:
        str += this.codeFromTSModuleDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.TSInterfaceDeclaration:
        str += this.codeFromTSInterfaceDeclaration(ast);
        break;
  
      case AST_NODE_TYPES.TSTypeAssertion:
        str += this.codeFromTSTypeAssertion(ast);
        break;
  
      default:
        console.log(util.inspect(ast, true, 3));
        throw new Error('unrecornized type: ' + ast.type);
        break;
    }
    return str;
  }
  
  
  private codeFromArrayExpression(ast: ArrayExpression): string {
    let str = '';
    for (let i = 0, len = ast.elements.length; i < len; i++) {
      if (str) {
        str += ', ';
      }
      str += this.codeFromAST(ast.elements[i]);
    }
    return '{' + str + '}';
  }
  
  private codeFromArrayPattern(ast: ArrayPattern): string {
    this.assert(false, ast, 'Not support ArrayPattern yet!');
    return '';
  }
  
  private codeFromArrowFunctionExpression(ast: ArrowFunctionExpression): string {
    let str = 'function(';
    let defaultParamsStr = '';
    if (ast.params) {
      for (let i = 0, len = ast.params.length; i < len; i++) {
        if (i > 0) {
          str += ', ';
        }
        let oneParam = ast.params[i];
        (oneParam as any).__parent = ast;
        str += this.codeFromAST(oneParam);
  
        if(oneParam.type == AST_NODE_TYPES.AssignmentPattern) {
          let paramIdStr = this.codeFromAST(oneParam.left);
          defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
          defaultParamsStr += this.indent(paramIdStr + '=' + this.codeFromAST(oneParam.right)) + '\n';
          defaultParamsStr += 'end\n';
        }
      }
    }
    str += ')\n';
    if (ast.body) {
      let bodyStr = this.codeFromAST(ast.body);
      if(defaultParamsStr) {
        bodyStr = defaultParamsStr + bodyStr;
      }
      str += this.indent(bodyStr) + '\n';
    }
    this.assert(!ast.generator, ast, 'Not support generator yet!');
    this.assert(!ast.async, ast, 'Not support async yet!');
    this.assert(!ast.expression, ast, 'Not support expression yet!');
    str += 'end\n';
    return str;
  }
  
  private codeFromAssignmentExpression(ast: AssignmentExpression): string {
    return this.codeFromBinaryExpression(ast as any);
  }
  
  private codeFromAssignmentPattern(ast: AssignmentPattern): string {
    let str = this.codeFromAST(ast.left);
    let parent = (ast as any).__parent;
    if(!parent || (parent.type != AST_NODE_TYPES.FunctionExpression && parent.type != AST_NODE_TYPES.FunctionDeclaration)) {
       str += ' = ' + this.codeFromAST(ast.right);
    }
    return str;
  }
  
  private codeFromAwaitExpression(ast: AwaitExpression): string {
    this.assert(false, ast, 'Not support AwaitExpression yet!');
    return '';
  }
  
  private codeFromBigIntLiteral(ast: BigIntLiteral): string {
    return this.codeFromLiteral(ast as any);
  }
  
  private codeFromBinaryExpression(ast: BinaryExpression): string {
    let optStr = ast.operator;
    this.assert('>>>=' != optStr, ast, 'Not support >>>= yet!');
    (ast.left as any).__parent = ast;
    (ast.right as any).__parent = ast;
    let left = this.codeFromAST(ast.left);
    let right = this.codeFromAST(ast.right);
  
    if(optStr == 'in') {
      return right + '[' + left + ']';
    }
  
    let selffOpts: string[] = ['+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='];
    let isSelfOperator = false;
    if(selffOpts.indexOf(optStr) >= 0) {
      // self operator
      isSelfOperator = true;
      optStr = optStr.substr(0, optStr.length - 1);
    } 
    if(optStr == '+') {
      if(('string' == (ast.left as any).__type || 'string' == (ast.right as any).__type)) {
        // TODO: Take care of string combination
        optStr = '..';
        (ast as any).__type = 'string';
      } 
    } else if(optStr == '!=') {
      optStr = '~=';
    } else if(optStr == '===') {
      optStr = '==';
    } else if(optStr == '!==') {
      optStr = '~=';
    }
  
    if(optStr == 'instanceof') {
      return left + ':instanceof(' + right + ')';
    }
  
    let str = '';
    let astType = (ast as any).type;
    if(astType == AST_NODE_TYPES.AssignmentExpression && ast.right.type == AST_NODE_TYPES.AssignmentExpression) {
      // 处理 a = b = c
      str = right + '\n';
      right = this.codeFromAST((ast.right as AssignmentExpression).left);
    }
  
    if(isSelfOperator) {
      return str + left + ' = ' + left + ' ' + optStr + ' ' + right;
    }
  
    return str + left + ' ' + optStr + ' ' + right;
  }
  
  private codeFromBlockStatement(ast: BlockStatement): string {
    let str = '';
    for (let i = 0, len = ast.body.length; i < len; i++) {
      let bstr = this.codeFromAST(ast.body[i]);
      if(bstr) {
        if (i > 0) {
          str += '\n';
        }
        str += bstr;
      }
    }
    return str;
  }
  
  private codeFromBreakStatement(ast: BreakStatement): string {
    this.assert(!ast.label, ast, 'Not support break label yet!');
    if(this.inSwitchCase) {
      return 'return';
    }
    return 'break';
  }
  
  private codeFromCallExpression(ast: CallExpression): string {
    (ast.callee as any).__parent = ast;
    let calleeStr = this.codeFromAST(ast.callee);
    let str = '';
    let allAgmStr = '';
    for (let i = 0, len = ast.arguments.length; i < len; i++) {
      let arg = ast.arguments[i];
      let argStr = this.codeFromAST(arg);
      if(arg.type == AST_NODE_TYPES.AssignmentExpression) {
        str += argStr + '\n';
        argStr = this.codeFromAST((arg as AssignmentExpression).left);
      } else if(arg.type == AST_NODE_TYPES.UpdateExpression) {
        str += argStr + '\n';
        argStr = this.codeFromAST((arg as UpdateExpression).argument);
      }
      if(allAgmStr) {
        allAgmStr += ', ';
      }
      allAgmStr += argStr;
    }
    let funcName = '';
    let funcNameRegexResult = calleeStr.match(/[\.:](\w+)$/);
    if(funcNameRegexResult) {
      funcName = funcNameRegexResult[1];
    }
    let funcRepl = this.funcReplConf[funcName];
    if(funcRepl == 'table.insert') {
      // Array push change into table.insert
      str += 'table.insert(' + calleeStr.substr(0, calleeStr.length - 5) + ', ' + allAgmStr + ')';
    } else if('xlua' == this.option.style && !allAgmStr && funcRepl == 'typeof') {
      str = 'typeof(' + calleeStr.substr(0, calleeStr.length - 8) + ')';
    } else {
      if(typeof(funcRepl) === 'string') {
        calleeStr = calleeStr.replace(/(?<=:)\w+$/, funcRepl);
      }
      str = calleeStr + '(';
      str += allAgmStr;
      str += ')';
    }
    return str;
  }
  
  private codeFromCatchClause(ast: CatchClause): string {
    let str = 'function($param$)\n'.replace('$param$', this.codeFromAST(ast.param));
    str += this.codeFromBlockStatement(ast.body);
    return str;
  }
  
  private codeFromClassBody(ast: ClassBody): string {
    let str = '';
    for (let i = 0, len = ast.body.length; i < len; i++) {
      let cbodyStr = this.codeFromAST(ast.body[i]);
      if(cbodyStr) {
        if (i > 0) {
          str += '\n';
        }
        str += cbodyStr;
      }
    }
    return str;
  }
  
  private codeFromClassDeclaration(ast: ClassDeclaration): string {
    let str = '$BaseClass$:subclass("$ClassName$")\n';
    if (ast.typeParameters) {
      // typeParameters?: TSTypeParameterDeclaration;
    }
    if (ast.superTypeParameters) {
      // TSTypeParameterInstantiation;
    }
    if (ast.id) {
      // Identifier
      let className = this.codeFromAST(ast.id);
      this.allClasses.push(className);
      this.classQueue.push(className);
      str = str.replace('$ClassName$', className);
    } else {
      this.assert(false, ast, 'Class name is necessary!');
    }
    str += this.codeFromClassBody(ast.body);
    if (ast.superClass) {
      str = str.replace('$BaseClass$', this.codeFromAST(ast.superClass));
    } else {
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
  }
  
  private codeFromClassExpression(ast: ClassExpression): string {
    // this.pintHit(ast);
    return this.codeFromClassDeclaration(ast as any);
  }
  
  private codeFromClassProperty(ast: ClassProperty): string {
    let str = '';
    if (ast.value) {
      let className = this.classQueue[this.classQueue.length - 1];
      if (ast.static) {
        str = className + '.' + this.codeFromAST(ast.key) + ' = ' + this.codeFromAST(ast.value) + ';';
      } else {
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
  }
  
  private codeFromConditionalExpression(ast: ConditionalExpression): string {
    // TODO: 0 or '' are considered true in lua while false in TypeScript
    let testStr = this.codeFromAST(ast.test);
    let str = '(' + testStr + ' and {' + this.codeFromAST(ast.consequent) + '} or {' + this.codeFromAST(ast.alternate) + '})[1]';
    str += this.wrapTip('lua中0和空字符串也是true，此处' + testStr + '需要确认');
    return str;
  }
  
  private codeFromContinueStatement(ast: ContinueStatement): string {
    this.hasContinue = true;
    return 'break';
  }
  
  private codeFromDebuggerStatement(ast: DebuggerStatement): string {
    this.assert(false, ast, 'Not support DebuggerStatement yet!');
    return '';
  }
  
  private codeFromDecorator(ast: Decorator): string {
    this.assert(false, ast, 'Not support Decorator yet!');
    return '';
  }
  
  private codeFromDoWhileStatement(ast: DoWhileStatement): string {
    this.assert(false, ast, 'Not support DoWhileStatement yet!');
    return '';
  }
  
  private codeFromEmptyStatement(ast: EmptyStatement): string {
    return '';
  }
  
  private codeFromExportAllDeclaration(ast: ExportAllDeclaration): string {
    this.assert(false, ast, 'Not support ExportAllDeclaration yet!');
    return '';
  }
  
  private codeFromExportDefaultDeclaration(ast: ExportDefaultDeclaration): string {
    return '';
  }
  
  private codeFromExportNamedDeclaration(ast: ExportNamedDeclaration): string {
    (ast.declaration as any).__exported = true;
    return this.codeFromAST(ast.declaration);
  }
  
  private codeFromExportSpecifier(ast: ExportSpecifier): string {
    this.assert(false, ast, 'Not support ExportSpecifier yet!');
    return '';
  }
  
  private codeFromExpressionStatement(ast: ExpressionStatement): string {
    return this.codeFromAST(ast.expression);
  }
  
  private codeFromForInStatement(ast: ForInStatement): string {
    (ast.left as any).__parent = ast;
    let str = 'for ' + this.codeFromAST(ast.left) + ' in pairs(' + this.codeFromAST(ast.right) + ') do\n';
    str += this.indent(this.codeFromAST(ast.body)) + '\n';
    str += 'end';
    return str;
  }
  
  private codeFromForOfStatement(ast: ForOfStatement): string {
    (ast.left as any).__parent = ast;
    let str = 'for _tmpi, ' + this.codeFromAST(ast.left) + ' in pairs(' + this.codeFromAST(ast.right) + ') do\n';
    str += this.indent(this.codeFromAST(ast.body)) + '\n';
    str += 'end';
    return str;
  }
  
  private codeFromForStatement(ast: ForStatement): string {
    this.hasContinue = false;
  
    let str = '';
    if (ast.init && ast.init.type != AST_NODE_TYPES.Identifier) {
      str += this.codeFromAST(ast.init) + '\n';
    }
    str += 'repeat\n';
    let repeatBodyStr = this.codeFromAST(ast.body);
    if(this.hasContinue) {
      repeatBodyStr = 'repeat\n' + this.indent(repeatBodyStr + '\nbreak') + '\nuntil true'
    }
    if (ast.update) {
      repeatBodyStr += '\n';
      repeatBodyStr += this.codeFromAST(ast.update);
    }
    str += this.indent(repeatBodyStr) + '\n';
    str += 'until ';
    if (ast.test) {
      str += 'not(' + this.codeFromAST(ast.test) + ')';
    } else {
      str += 'false';
    }
    return str;
  }
  
  private codeFromFunctionDeclaration(ast: FunctionDeclaration): string {
    return this.codeFromFunctionExpression(ast as any);
  }
  
  private codeFromFunctionExpression(ast: FunctionExpression): string {
    return this.codeFromFunctionExpressionInternal(null, false, ast);
  }
  
  private codeFromFunctionExpressionInternal(funcName: string, isStatic: boolean, ast: FunctionExpression): string {
    this.inStatic = isStatic;
    let str = '';
    if(!funcName && ast.id) {
      funcName = this.codeFromAST(ast.id);
    }
    if (funcName) {
      if('constructor' == funcName) {
        funcName = 'ctor';
      }
      if((ast as any).type == AST_NODE_TYPES.FunctionDeclaration) {
        // 比如匿名函数
        str = 'function ' + funcName + '(';
      } else {
        let className = this.classQueue[this.classQueue.length - 1];
        if (className) {
          // 成员函数
          if(isStatic) {
            str = 'function ' + className + '.' + funcName + '(';
          } else {
            str = 'function ' + className + '.prototype:' + funcName + '(';
          }
        } else {
          let moduleName = this.moduleQueue[this.moduleQueue.length - 1];
          if(moduleName) {
            // 模块函数
            str = 'function ' + moduleName + ':' + funcName + '(';
          } else {
            // 普通函数
            str = 'function ' + funcName + '(';
          }
        }
      }
    } else {
      str = 'function(';
    }
    let defaultParamsStr = '';
    if (ast.params) {
      for (let i = 0, len = ast.params.length; i < len; i++) {
        if (i > 0) {
          str += ', ';
        }
        let oneParam = ast.params[i];
        (oneParam as any).__parent = ast;
        str += this.codeFromAST(oneParam);
  
        if(oneParam.type == AST_NODE_TYPES.AssignmentPattern) {
          let paramIdStr = this.codeFromAST(oneParam.left);
          defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
          defaultParamsStr += this.indent(paramIdStr + '=' + this.codeFromAST(oneParam.right)) + '\n';
          defaultParamsStr += 'end\n';
        }
      }
    }
    str += ')';
    let bodyStr = '';
    if (ast.body) {
      bodyStr = this.codeFromAST(ast.body);
      if(defaultParamsStr) {
        bodyStr = defaultParamsStr + bodyStr;
      }    
    }
  
    if(bodyStr) {
      str += '\n' + this.indent(bodyStr) + '\nend\n';
    } else {
      str += ' end';
    }
    this.assert(!ast.generator, ast, 'Not support generator yet!');
    this.assert(!ast.async, ast, 'Not support async yet!');
    this.assert(!ast.expression, ast, 'Not support expression yet!');
    this.assert(!ast.declare, ast, 'Not support declare yet!');
    this.inStatic = false;
    return str;
  }
  
  private codeFromIdentifier(ast: Identifier): string {
    let str = ast.name;
    if(this.luaKeyWords.indexOf(str) >= 0) {
      str = 'tsvar_' + str;
    } else if(str.substr(0, 1) == '$') {
      str = 'tsvar_' + str.substr(1);
    }
    this.usedIdMap[str] = true;
    return str;
  }
  
  private codeFromIfStatement(ast: IfStatement): string {
    let testStr = this.codeFromAST(ast.test);
    let str = 'if ' + testStr + ' then\n';
    str += this.indent(this.codeFromAST(ast.consequent));
    if (ast.alternate && (ast.alternate.type != AST_NODE_TYPES.BlockStatement || (ast.alternate as BlockStatement).body.length > 0)) {
      str += '\nelse';
      let altStr = this.codeFromAST(ast.alternate);
      if(ast.alternate.type != AST_NODE_TYPES.IfStatement) {
        str += '\n';
        str += this.indent(altStr);
        str += '\nend';
      } else {
        str += altStr;
      }
    } else {
      str += '\nend';
    }
    return str;
  }
  
  private codeFromImport(ast: Import): string {
    this.assert(false, ast, 'Not support Import yet!');
    return '';
  }
  
  private codeFromImportDeclaration(ast: ImportDeclaration): string {
    this.importAsts.push(ast);
    return '';
  }
  
  private codeFromImportDefaultSpecifier(ast: ImportDefaultSpecifier): string {
    this.assert(false, ast, 'Not support ImportDefaultSpecifier yet!');
    return '';
  }
  
  private codeFromImportNamespaceSpecifier(ast: ImportNamespaceSpecifier): string {
    this.assert(false, ast, 'Not support ImportNamespaceSpecifier yet!');
    return '';
  }
  
  private codeFromImportSpecifier(ast: ImportSpecifier): string {
    this.assert(false, ast, 'Not support ImportSpecifier yet!');
    return '';
  }
  
  private codeFromLabeledStatement(ast: LabeledStatement): string {
    this.assert(false, ast, 'Not support LabeledStatement yet!');
    return '';
  }
  
  private codeFromLiteral(ast: Literal): string {
    if (ast.regex) {
      let regexRepl = this.getRegexReplacor(ast.regex.pattern);
      if(regexRepl) {
        return '\'' + regexRepl + '\'';
      }
      if(this.unknowRegexs.indexOf(ast.regex.pattern) < 0) {
        this.unknowRegexs.push(ast.regex.pattern);
      }
      if(this.option.translateRegex) {
        return '\'' + ast.regex.pattern.replace(/\\(?!\\)/g, '%') + '\'';
      }
      return ast.raw + this.wrapTip('tslua无法自动转换正则表达式，请手动处理。');
    }
    (ast as any).__type = typeof(ast.value);
    if((ast as any).__parent && (ast as any).__parent.type == AST_NODE_TYPES.Property) {
      return ast.value as string;
    }
    let l = ast.raw;
    if(null === ast.value) {
      l = 'nil';
    }
    return l;
  }
  
  private codeFromLogicalExpression(ast: LogicalExpression): string {
    let left = this.codeFromAST(ast.left);
    if (this.calPriority(ast.left) >= this.calPriority(ast)) {
      left = '(' + left + ')';
    }
    let right = this.codeFromAST(ast.right);
    if (this.calPriority(ast.right) >= this.calPriority(ast)) {
      right = '(' + right + ')';
    }
    let optStr = ast.operator;
    if(optStr == '&&') {
      optStr = 'and';
    } else if(optStr == '||') {
      optStr = 'or';
    }
    let str = left + ' ' + optStr + ' ' + right;
    return str;
  }
  
  private codeFromMemberExpression(ast: MemberExpression): string {
    (ast.property as any).__parent = ast;
    let objStr = this.codeFromAST(ast.object);
    let str = objStr;
    if (this.noBraceTypes.indexOf(ast.object.type) < 0) {
      str = '(' + str + ')';
    }
    if (ast.computed) {
      let propertyStr = this.codeFromAST(ast.property);
      if(propertyStr.length == 1) {
        // Auto modify xx[i] to xx[i + 1]
        propertyStr += '+1';
      } else {
        // Add some tips
        propertyStr += this.wrapTip(str + '下标访问可能不正确');
      }
      str += '[' + propertyStr + ']';
    } else {
      if(ast.property.type == AST_NODE_TYPES.Identifier && ast.property.name == 'length') {
        if((!(ast as any).__parent || (ast as any).__parent.type != AST_NODE_TYPES.AssignmentExpression)) {
          str = '#' + str;
        } else {
          str += '.length' + this.wrapTip('修改数组长度需要手动处理。');
        }
      } else {
        // TODO: do something with static members
        let pstr = this.codeFromAST(ast.property);
        let parent = (ast as any).__parent;
        if(parent && parent.type == AST_NODE_TYPES.CallExpression && 
          (!this.inStatic || ast.object.type != AST_NODE_TYPES.ThisExpression) && 
          (!this.classMap[objStr] || !this.classMap[objStr].funcs[pstr] || !this.classMap[objStr].funcs[pstr].isStatic)) {
          str += ':';
        } else {
          str += '.';
        }
        str += pstr;
      }
    }
    return str;
  }
  
  private codeFromMetaProperty(ast: MetaProperty): string {
    this.assert(false, ast, 'Not support MetaProperty yet!');
    return '';
  }
  
  private codeFromMethodDefinition(ast: MethodDefinition): string {
    let funcName = null;
    if (ast.key) {
      funcName = this.codeFromAST(ast.key);
    }
    if(ast.value.type == "TSEmptyBodyFunctionExpression") {
      this.assert(false, ast, 'Not support TSEmptyBodyFunctionExpression yet!');
    }
    return this.codeFromFunctionExpressionInternal(funcName, ast.static, ast.value as FunctionExpression);
  }
  
  private codeFromNewExpression(ast: NewExpression): string {
    let callee = this.codeFromAST(ast.callee);
    if('Date' == callee) {
      this.importContents.push('date');
    }
    if (this.calPriority(ast.callee) > this.calPriority(ast)) {
      callee = '(' + callee + ')';
    }
    if('Array' == callee && ast.arguments.length == 0) {
      return '{}';
    }
    let argStr = '';
    for (let i = 0, len = ast.arguments.length; i < len; i++) {
      if (i > 0) {
        argStr += ', ';
      }
      argStr += this.codeFromAST(ast.arguments[i]);
    }
    if('RegExp' == callee) {
      return argStr;
    }
    let str = callee + '(' + argStr + ')';
    return str;
  }
  
  private codeFromObjectExpression(ast: ObjectExpression): string {
    var str = '{';
    for (let i = 0, len = ast.properties.length; i < len; i++) {
      if (i > 0) {
        str += ', ';
      }
      str += this.codeFromAST(ast.properties[i]);
    }
    return str + '}';
  }
  
  private codeFromObjectPattern(ast: ObjectPattern): string {
    this.assert(false, ast, 'Not support ObjectPattern yet!');
    return '';
  }
  
  private codeFromProgram(ast: Program): string {
    let str = '';
    for (let i = 0, len = ast.body.length; i < len; i++) {
      let stm = ast.body[i];
      let bodyStr = this.codeFromAST(stm);
      if(bodyStr) {
        if(i > 0) {
          str += '\n';
        }
        str += bodyStr;
      }
    }
    return str;
  }
  
  private codeFromProperty(ast: Property): string {
    (ast.key as any).__parent = ast;
    return this.codeFromAST(ast.key) + '=' + this.codeFromAST(ast.value);
  }
  
  private codeFromRestElement(ast: RestElement): string {
    return '...';
  }
  
  private codeFromReturnStatement(ast: ReturnStatement): string {
    if(!ast.argument) {
      return 'return';
    }
    return 'return ' + this.codeFromAST(ast.argument);
  }
  
  private codeFromSequenceExpression(ast: SequenceExpression): string {
    let str = '';
    for (var i = 0, len = ast.expressions.length; i < len; i++) {
      if (i > 0) {
        str += '; ';
      }
      str += this.codeFromAST(ast.expressions[i]);
    }
    return str;
  }
  
  private codeFromSpreadElement(ast: SpreadElement): string {
    return '...';
  }
  
  private codeFromSuper(ast: Super): string {
    let className = this.classQueue[this.classQueue.length - 1];
    return className + '.super';
  }
  
  private codeFromSwitchCase(ast: SwitchCase): string {
    let str = '';
    if (ast.test) {
      str += '[' + this.codeFromAST(ast.test) + '] = function()\n';
    } else {
      str += '["default"] = function()\n';
    }
    let csqStr = '';
    for (let i = 0, len = ast.consequent.length; i < len; i++) {
      if(ast.consequent[i].type != AST_NODE_TYPES.BreakStatement) {
        if(i > 0) {
          csqStr += '\n';
        }
        this.inSwitchCase = true;
        csqStr += this.codeFromAST(ast.consequent[i]);
        this.inSwitchCase = false;
      }
    }
    if(csqStr) {
      str += this.indent(csqStr);
      str += '\nend';
    } else {
      str += ' end';
    }
    return str;
  }
  
  private codeFromSwitchStatement(ast: SwitchStatement): string {
    let str = 'local switch = {\n';
    let caseStr = '';
    for (let i = 0, len = ast.cases.length; i < len; i++) {
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
  }
  
  private codeFromTaggedTemplateExpression(ast: TaggedTemplateExpression): string {
    this.assert(false, ast, 'Not support TaggedTemplateExpression yet!');
    return '';
  }
  
  private codeFromTemplateElement(ast: TemplateElement): string {
    this.assert(false, ast, 'Not support TemplateElement yet!');
    return '';
  }
  
  private codeFromTemplateLiteral(ast: TemplateLiteral): string {
    this.assert(false, ast, 'Not support TemplateLiteral yet!');
    return '';
  }
  
  private codeFromThisExpression(ast: ThisExpression): string {
    if(this.inStatic) {
      return this.classQueue[this.classQueue.length - 1];
    }
    return 'self';
  }
  
  private codeFromThrowStatement(ast: ThrowStatement): string {
    return 'error(' + this.codeFromAST(ast.argument) + ')';
  }
  
  private codeFromTryStatement(ast: TryStatement): string {
    this.importContents.push('trycatch');
    let str = 'try_catch{\n';
    let tcStr = 'main = function()\n';
    tcStr += this.indent(this.codeFromAST(ast.block));
    tcStr += '\nend';
    if(ast.handler) {
      tcStr += ',\ncatch = ';
      tcStr += this.indent(this.codeFromAST(ast.handler), 1);
      tcStr += '\nend'
    }
    if(ast.finalizer) {
      tcStr += ',\nfinally = function()\n';
      tcStr += this.indent(this.codeFromAST(ast.finalizer));
      tcStr += '\nend'
    }
    str += this.indent(tcStr);
    str += '\n}';
    return str;
  }
  
  private codeFromUnaryExpression(ast: UnaryExpression): string {
    let str;
    let agm = this.codeFromAST(ast.argument);
    if (this.calPriority(ast.argument) >= this.calPriority(ast)) {
      agm = '(' + agm + ')';
    }
    if (ast.prefix) {
      if ('typeof' == ast.operator) {
        str = 'type(' + agm + ')';
      } else if ('delete' == ast.operator) {
        str = agm + ' = nil';
      } else if ('!' == ast.operator) {
        str = 'not ' + agm;
      } else if ('void' == ast.operator) {
        this.assert(false, ast, 'Not support void yet!');
      } else {
        this.assert('-' == ast.operator, ast, 'Not support UnaryOperator: ' + ast.operator);
        str = ast.operator + agm;
      }
    } else {
      str = agm + ast.operator;
    }
    return str;
  }
  
  private codeFromUpdateExpression(ast: UpdateExpression): string {
    let astr = this.codeFromAST(ast.argument);
    if (this.calPriority(ast.argument) >= this.calPriority(ast)) {
      astr = '(' + astr + ')';
    }
    // if (ast.prefix) {
    //   // TODO: Consider if the value is right when used as Assignment/Property
    //   str = ast.operator + str;
    // } else {
    //   str = str + ast.operator;
    // }
    let str = astr + '=' + astr + ast.operator.substring(0, 1) + '1';
    let parent = (ast as any).__parent;
    if(parent) {
      if(parent.type == AST_NODE_TYPES.BinaryExpression || parent.type == AST_NODE_TYPES.MemberExpression) {
        if(ast.prefix) {
          str = this.wrapPop(str, true);
          str += astr;
        } else {
          let theVarName = astr.match(/[^\.]+$/);
          if(theVarName) {
            let newVarName = theVarName[0].replace(/\[/g, '_').replace(/\]/g, '_') + 'Before';
            str = this.wrapPop('local ' + newVarName + ' = ' + astr, true) + this.wrapPop(str, true);
            str += newVarName;
          }
        }
      }
    }
    return str;
  }
  
  private codeFromVariableDeclaration(ast: VariableDeclaration): string {
    // not support const
    let forInOfTypes: string[] = [AST_NODE_TYPES.ForInStatement, AST_NODE_TYPES.ForOfStatement];
    let isForInOf = (ast as any).__parent && forInOfTypes.indexOf((ast as any).__parent.type) >= 0;
    let str = '';
    for (let i = 0, len = ast.declarations.length; i < len; i++) {
      let d = ast.declarations[i];
      if(isForInOf) {
        (d as any).__isForInOf = true;
        if(i > 0) {
          str += ', ';
        }
      } else {
        if(i > 0) {
          str += '\n';
        }
      }
      str += this.codeFromVariableDeclarator(d);
    }
    return str;
  }
  
  private codeFromVariableDeclarator(ast: VariableDeclarator): string {
    let str = '';
    let idStr = this.codeFromAST(ast.id);
    let initStr = '';
    if(ast.init) {
      initStr = this.codeFromAST(ast.init);
      if(ast.init.type == AST_NODE_TYPES.AssignmentExpression) {
        str = initStr + '\n';
        initStr = this.codeFromAST((ast.init as AssignmentExpression).left);
      }
    }
    if(!(ast as any).__isForInOf) {
      str += 'local ';
    }
    str += idStr;
    if(initStr) {
      str += ' = ' + initStr;
    } else if(!(ast as any).__isForInOf) {
      str += ' = nil';
    }
    return str;
  }
  
  private codeFromWhileStatement(ast: WhileStatement): string {
    let str = 'while(' + this.codeFromAST(ast.test) + ')\n';
    str += 'do\n';
    let bodyCode = this.codeFromAST(ast.body);
    str += bodyCode + '\n';
    str += 'end';
    return str;
  }
  
  private codeFromWithStatement(ast: WithStatement): string {
    this.assert(false, ast, 'Not support WithStatement yet');
    return '';
  }
  
  private codeFromYieldExpression(ast: YieldExpression): string {
    let str = 'coroutine.yield(';
    str += this.codeFromAST(ast.argument);
    str += ')';
    return str;
  }
  
  private codeFromTSAbstractMethodDefinition(ast: TSAbstractMethodDefinition): string {
    return this.codeFromMethodDefinition(ast as any);
  }
  
  private codeFromTSAsExpression(ast: TSAsExpression): string {
    return this.codeFromAST(ast.expression);
  }
  
  private codeFromTSDeclareFunction(ast: TSDeclareFunction): string {
    return this.wrapTip('请手动处理DeclareFunction');
  }
  
  private codeFromTSEnumDeclaration(ast: TSEnumDeclaration): string {
    let str = '';
    if(!(ast as any).__exported) {
      str += 'local ';
    }
    str += this.codeFromAST(ast.id) + ' = {\n';
    let membersStr = '';
    let nextValue = 0;
    for(let i = 0, len = ast.members.length; i < len; i++) {
      if(i > 0) {
        membersStr += ',\n';
      }
      let m = ast.members[i];
      membersStr += this.codeFromAST(m.id) + ' = ';
      if(m.initializer) {
        membersStr += this.codeFromAST(m.initializer)
        nextValue = ((m.initializer as Literal).value as number) + 1;
      } else {
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
    this.enumContents.push(str);
    return '';
  }
  
  private codeFromTSModuleBlock(ast: TSModuleBlock): string {
    let str = '';
    for(let i = 0, len = ast.body.length; i < len; i++) {
      let bstr = this.codeFromAST(ast.body[i]);
      if(bstr) {
        if(i > 0) {
          str += '\n';
        }
        str += bstr;
      }
    }
    return str;
  }
  
  private codeFromTSModuleDeclaration(ast: TSModuleDeclaration): string {
    let moduleName = this.codeFromAST(ast.id);
    this.moduleQueue.push(moduleName);
    let str = moduleName + ' = {}\n';
    if(ast.body) {
      str += this.indent(this.codeFromAST(ast.body));
    }
    this.moduleQueue.pop();
    return str;
  }
  
  private codeFromTSInterfaceDeclaration(ast: TSInterfaceDeclaration): string {
    return '';
  }
  
  private codeFromTSTypeAssertion(ast: TSTypeAssertion): string {
    return this.codeFromAST(ast.expression);
  }
  
  private indent(str: string, fromLine: number = 0): string {
    let indentStr = '  ';
    // for(let i = 0; i < blockDeep; i++) {
    //   indentStr += '  ';
    // }
    let endWithNewLine = str.substr(str.length - 1) == '\n';
    let lines = str.split(/\n/);
    let newStr = '';
    for(let i = 0, len = lines.length; i < len; i++) {
      if(i > 0) {
        newStr += '\n';
      }
      if(i >= fromLine) {
        newStr += indentStr;
      }
      newStr += lines[i];
    }
    if(endWithNewLine) {
      newStr += '\n';
    }
    return newStr;
  }

  private getRegexReplacor(pattern: string): string {
    let regexRepl = this.regexReplConf[pattern];
    if(regexRepl) {
      return regexRepl;
    }
    let marginBegin = false, marginEnd = false;
    if(pattern.charAt(0) == '^') {
      marginBegin = true;
      pattern = pattern.substr(1);
    }
    if(pattern.charAt(pattern.length - 1) == '$') {
      marginEnd = true;
      pattern = pattern.substr(0, pattern.length - 1);
    }
    regexRepl = this.regexReplConf[pattern];
    if(!regexRepl) {
      regexRepl = this.regexReplConf['^' + pattern];
      if(regexRepl) {
        regexRepl = regexRepl.substr(1);
      } else {
        regexRepl = this.regexReplConf[pattern + '$'];
        if(regexRepl) {
          regexRepl = regexRepl.substr(0, regexRepl.length - 1);
        } else {
          regexRepl = this.regexReplConf['^' + pattern + '$'];
          if(regexRepl) {
            regexRepl = regexRepl.substr(1, regexRepl.length - 2);
          }
        }
      }
    }
    if(regexRepl) {
      if(marginBegin) {
        regexRepl = '^' + regexRepl;
      }
      if(marginEnd) {
        regexRepl = regexRepl + '$';
      }
    }
    return regexRepl;
  }
  
  private pintHit(ast: any): void {
    console.warn('hit %s!', ast.type);
    console.log(util.inspect(ast, true, 4));
  }
  
  private wrapTip(rawTip: string): string {
    return this.option.addTip ? '<TT>[ts2lua]' + rawTip.replace(/<TT>.*?<\/TT>/g, '') + '</TT>' : '';
  }
  
  private wrapPop(popStr: string, upOrDown: boolean): string {
    if(popStr) {
      return '<~ts2lua' + popStr.length + 'u>' + popStr;
    } else {
      return '<~ts2lua' + popStr.length + 'd>' + popStr;
    }    
  }
  
  private formatTip(content: string): string {
    let re = /<TT>.*?<\/TT>/;
    let rema = content.match(re);
    while(rema) {
      let rawComment = rema[0];
      let rawCommentLen = rawComment.length;
      let preContent = content.substr(0, rema.index);
      let postContent = content.substr(rema.index + rawCommentLen);
      let luaComment = '-- ' + rawComment.substr(4, rawCommentLen - 9);
      let lastNewLineIdx = preContent.lastIndexOf('\n');
      if(lastNewLineIdx) {
        let tmpStr = preContent.substr(lastNewLineIdx + 1);
        let blanksRema = tmpStr.match(/^ */);
        if(blanksRema) {
          luaComment = blanksRema[0] + luaComment;
        }
        content = preContent.substr(0, lastNewLineIdx) + '\n' + luaComment + '\n' + tmpStr + postContent;
      } else {
        content = luaComment + '\n' + preContent + postContent;
      }
      rema = content.match(re);
    }
    return content;
  }

  private formatPop(content: string): string {
    let re = /<~ts2lua(\d+)u>/;
    let rema = content.match(re);
    while(rema) {
      let rawComment = rema[0];
      let codeLen = Number(rema[1]);
      let rawCommentLen = rawComment.length;
      let preContent = content.substr(0, rema.index);
      let postContent = content.substr(rema.index + rawCommentLen + codeLen);
      let code2Pop = content.substr(rema.index + rawCommentLen, codeLen);
      let lastNewLineIdx = preContent.lastIndexOf('\n');
      if(lastNewLineIdx) {
        let tmpStr = preContent.substr(lastNewLineIdx + 1);
        let blanksRema = tmpStr.match(/^ */);
        if(blanksRema) {
          code2Pop = blanksRema[0] + code2Pop;
        }
        content = preContent.substr(0, lastNewLineIdx) + '\n' + code2Pop + '\n' + tmpStr + postContent;
      } else {
        content = code2Pop + '\n' + preContent + postContent;
      }
      rema = content.match(re);
    }
    return content;
  }
  
  private assert(cond: boolean, ast: BaseNode, message: string = null) {
    if(!cond) {
      if(this.isDevMode) {
        console.log(util.inspect(ast, true, 6));
      }
      console.log('\x1B[36m%s\x1B[0m:\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', this.filePath, ast.loc.start.line, ast.loc.start.column, message ? message : 'Error');
    }
  }
}