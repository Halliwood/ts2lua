import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, BaseNode } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import util = require('util')

const noBraceTypes = [AST_NODE_TYPES.MemberExpression, AST_NODE_TYPES.ThisExpression, AST_NODE_TYPES.Identifier, AST_NODE_TYPES.CallExpression, AST_NODE_TYPES.TSAsExpression];

// TODO: Typeof's return value may be different between ts and lua
const tsType2luaType = {
  'undefined': 'nil',
  'object': 'table'
};

const luaKeyWords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while'];

let pv = 0;
const operatorPriorityMap: { [opt: string]: number } = {};
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

function setPriority(keys: string[], value: number) {
  for (let i = 0, len = keys.length; i < len; i++) {
    operatorPriorityMap[keys[i]] = value;
  }
}

function getPriority(raw: string) {
  var idx = operatorPriorityMap[raw];
  if (idx < 0) {
    idx = 999;
    console.error('no prioritys: ' + raw);
  }
  return idx;
}

function calPriority(ast: any) {
  if ('__calPriority' in ast) {
    return ast.__calPriority;
  }
  switch (ast.type) {
    case AST_NODE_TYPES.UnaryExpression:
      {
        let ue = ast as UnaryExpression;
        ast.__calPriority = getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
      }
      break;

    case AST_NODE_TYPES.UpdateExpression:
      {
        let ue = ast as UpdateExpression;
        ast.__calPriority = getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
      }
      break;

    case AST_NODE_TYPES.BinaryExpression:
      {
        let be = ast as BinaryExpression;
        ast.__calPriority = getPriority('… ' + be.operator + ' …');
      }
      break;

    case AST_NODE_TYPES.AssignmentExpression:
      {
        let ae = ast as AssignmentExpression;
        ast.__calPriority = getPriority('… ' + ae.operator + ' …');
      }
      break;

    case AST_NODE_TYPES.LogicalExpression:
      {
        let le = ast as LogicalExpression;
        ast.__calPriority = getPriority('… ' + le.operator + ' …');
      }
      break;

    case AST_NODE_TYPES.MemberExpression:
      {
        let me = ast as MemberExpression;
        ast.__calPriority = getPriority(me.computed ? '… [ … ]' : '… . …');
      }
      break;

    case AST_NODE_TYPES.ConditionalExpression:
      {
        ast.__calPriority = getPriority('… ? … : …');
      }
      break;

    case AST_NODE_TYPES.CallExpression:
      {
        ast.__calPriority = getPriority('… ( … )');
      }
      break;

    case AST_NODE_TYPES.NewExpression:
      {
        let ne = ast as NewExpression;
        if (ne.arguments.length > 0) {
          ast.__calPriority = getPriority('new … ( … )');
        } else {
          ast.__calPriority = getPriority('new …');
        }
      }
      break;

    case AST_NODE_TYPES.SequenceExpression:
      {
        ast.__calPriority = getPriority('… , …');
      }
      break;
  }
  return ast.__calPriority;
}

let importContents: string[] = [];
let allClasses: string[] = [];
let classQueue: string[] = [];
let moduleQueue: string[] = [];
let hasContinue = false;

let filePath: string;
let isDevMode = false;
let luaStyle = 'xlua';

export function toLua(ast: any, path: string, devMode: boolean, style: string): string {
  filePath = path;
  isDevMode = devMode;
  luaStyle = style;

  importContents.length = 0;
  allClasses.length = 0;
  classQueue.length = 0;
  let content = codeFromAST(ast);
  content = content.replace(/console[\.|:]log/g, 'print');
  content = formatTip(content);
  if(allClasses.length > 0) {
    importContents.push('class');
  }
  importContents.sort();
  let outStr = '';
  for(let p of importContents) {
    outStr += 'require("' + p + '")\n';
  }
  if(outStr) {
    outStr += '\n';
  }
  outStr += content;
  return outStr;
}

export function codeFromAST(ast: any): string {
  let str = '';
  switch (ast.type) {

    case AST_NODE_TYPES.ArrayExpression:
      str += codeFromArrayExpression(ast);
      break;

    case AST_NODE_TYPES.ArrayPattern:
      str += codeFromArrayPattern(ast);
      break;

    case AST_NODE_TYPES.ArrowFunctionExpression:
      str += codeFromArrowFunctionExpression(ast);
      break;

    case AST_NODE_TYPES.AssignmentExpression:
      str += codeFromAssignmentExpression(ast);
      break;

    case AST_NODE_TYPES.AssignmentPattern:
      str += codeFromAssignmentPattern(ast);
      break;

    case AST_NODE_TYPES.AwaitExpression:
      str += codeFromAwaitExpression(ast);
      break;

    case AST_NODE_TYPES.BigIntLiteral:
      str += codeFromBigIntLiteral(ast);
      break;

    case AST_NODE_TYPES.BinaryExpression:
      str += codeFromBinaryExpression(ast);
      break;

    case AST_NODE_TYPES.BlockStatement:
      str += codeFromBlockStatement(ast);
      break;

    case AST_NODE_TYPES.BreakStatement:
      str += codeFromBreakStatement(ast);
      break;

    case AST_NODE_TYPES.CallExpression:
      str += codeFromCallExpression(ast);
      break;

    case AST_NODE_TYPES.CatchClause:
      str += codeFromCatchClause(ast);
      break;

    case AST_NODE_TYPES.ClassBody:
      str += codeFromClassBody(ast);
      break;

    case AST_NODE_TYPES.ClassDeclaration:
      str += codeFromClassDeclaration(ast);
      break;

    case AST_NODE_TYPES.ClassExpression:
      str += codeFromClassExpression(ast);
      break;

    case AST_NODE_TYPES.ClassProperty:
      str += codeFromClassProperty(ast);
      break;

    case AST_NODE_TYPES.ConditionalExpression:
      str += codeFromConditionalExpression(ast);
      break;

    case AST_NODE_TYPES.ContinueStatement:
      str += codeFromContinueStatement(ast);
      break;

    case AST_NODE_TYPES.DebuggerStatement:
      str += codeFromDebuggerStatement(ast);
      break;

    case AST_NODE_TYPES.Decorator:
      str += codeFromDecorator(ast);
      break;

    case AST_NODE_TYPES.DoWhileStatement:
      str += codeFromDoWhileStatement(ast);
      break;

    case AST_NODE_TYPES.EmptyStatement:
      str += codeFromEmptyStatement(ast);
      break;

    case AST_NODE_TYPES.ExportAllDeclaration:
      str += codeFromExportAllDeclaration(ast);
      break;

    case AST_NODE_TYPES.ExportDefaultDeclaration:
      str += codeFromExportDefaultDeclaration(ast);
      break;

    case AST_NODE_TYPES.ExportNamedDeclaration:
      str += codeFromExportNamedDeclaration(ast);
      break;

    case AST_NODE_TYPES.ExportSpecifier:
      str += codeFromExportSpecifier(ast);
      break;

    case AST_NODE_TYPES.ExpressionStatement:
      str += codeFromExpressionStatement(ast);
      break;

    case AST_NODE_TYPES.ForInStatement:
      str += codeFromForInStatement(ast);
      break;

    case AST_NODE_TYPES.ForOfStatement:
      str += codeFromForOfStatement(ast);
      break;

    case AST_NODE_TYPES.ForStatement:
      str += codeFromForStatement(ast);
      break;

    case AST_NODE_TYPES.FunctionDeclaration:
      str += codeFromFunctionDeclaration(ast);
      break;

    case AST_NODE_TYPES.FunctionExpression:
      str += codeFromFunctionExpression(ast);
      break;

    case AST_NODE_TYPES.Identifier:
      str += codeFromIdentifier(ast);
      break;

    case AST_NODE_TYPES.IfStatement:
      str += codeFromIfStatement(ast);
      break;

    case AST_NODE_TYPES.Import:
      str += codeFromImport(ast);
      break;

    case AST_NODE_TYPES.ImportDeclaration:
      str += codeFromImportDeclaration(ast);
      break;

    case AST_NODE_TYPES.ImportDefaultSpecifier:
      str += codeFromImportDefaultSpecifier(ast);
      break;

    case AST_NODE_TYPES.ImportNamespaceSpecifier:
      str += codeFromImportNamespaceSpecifier(ast);
      break;

    case AST_NODE_TYPES.ImportSpecifier:
      str += codeFromImportSpecifier(ast);
      break;

    case AST_NODE_TYPES.LabeledStatement:
      str += codeFromLabeledStatement(ast);
      break;

    case AST_NODE_TYPES.Literal:
      str += codeFromLiteral(ast);
      break;

    case AST_NODE_TYPES.LogicalExpression:
      str += codeFromLogicalExpression(ast);
      break;

    case AST_NODE_TYPES.MemberExpression:
      str += codeFromMemberExpression(ast);
      break;

    case AST_NODE_TYPES.MetaProperty:
      str += codeFromMetaProperty(ast);
      break;

    case AST_NODE_TYPES.MethodDefinition:
      str += codeFromMethodDefinition(ast);
      break;

    case AST_NODE_TYPES.NewExpression:
      str += codeFromNewExpression(ast);
      break;

    case AST_NODE_TYPES.ObjectExpression:
      str += codeFromObjectExpression(ast);
      break;

    case AST_NODE_TYPES.ObjectPattern:
      str += codeFromObjectPattern(ast);
      break;

    case AST_NODE_TYPES.Program:
      str += codeFromProgram(ast);
      break;

    case AST_NODE_TYPES.Property:
      str += codeFromProperty(ast);
      break;

    case AST_NODE_TYPES.RestElement:
      str += codeFromRestElement(ast);
      break;

    case AST_NODE_TYPES.ReturnStatement:
      str += codeFromReturnStatement(ast);
      break;

    case AST_NODE_TYPES.SequenceExpression:
      str += codeFromSequenceExpression(ast);
      break;

    case AST_NODE_TYPES.SpreadElement:
      str += codeFromSpreadElement(ast);
      break;

    case AST_NODE_TYPES.Super:
      str += codeFromSuper(ast);
      break;

    case AST_NODE_TYPES.SwitchCase:
      str += codeFromSwitchCase(ast);
      break;

    case AST_NODE_TYPES.SwitchStatement:
      str += codeFromSwitchStatement(ast);
      break;

    case AST_NODE_TYPES.TaggedTemplateExpression:
      str += codeFromTaggedTemplateExpression(ast);
      break;

    case AST_NODE_TYPES.TemplateElement:
      str += codeFromTemplateElement(ast);
      break;

    case AST_NODE_TYPES.TemplateLiteral:
      str += codeFromTemplateLiteral(ast);
      break;

    case AST_NODE_TYPES.ThisExpression:
      str += codeFromThisExpression(ast);
      break;

    case AST_NODE_TYPES.ThrowStatement:
      str += codeFromThrowStatement(ast);
      break;

    case AST_NODE_TYPES.TryStatement:
      str += codeFromTryStatement(ast);
      break;

    case AST_NODE_TYPES.UnaryExpression:
      str += codeFromUnaryExpression(ast);
      break;

    case AST_NODE_TYPES.UpdateExpression:
      str += codeFromUpdateExpression(ast);
      break;

    case AST_NODE_TYPES.VariableDeclaration:
      str += codeFromVariableDeclaration(ast);
      break;

    case AST_NODE_TYPES.VariableDeclarator:
      str += codeFromVariableDeclarator(ast);
      break;

    case AST_NODE_TYPES.WhileStatement:
      str += codeFromWhileStatement(ast);
      break;

    case AST_NODE_TYPES.WithStatement:
      str += codeFromWithStatement(ast);
      break;

    case AST_NODE_TYPES.YieldExpression:
      str += codeFromYieldExpression(ast);
      break;

    case AST_NODE_TYPES.TSAbstractMethodDefinition:
      str += codeFromTSAbstractMethodDefinition(ast);
      break;

    case AST_NODE_TYPES.TSAsExpression:
      str += codeFromTSAsExpression(ast);
      break;

    case AST_NODE_TYPES.TSDeclareFunction:
      str += codeFromTSDeclareFunction(ast);
      break;

    case AST_NODE_TYPES.TSEnumDeclaration:
      str += codeFromTSEnumDeclaration(ast);
      break;

    case AST_NODE_TYPES.TSModuleBlock:
      str += codeFromTSModuleBlock(ast);
      break;

    case AST_NODE_TYPES.TSModuleDeclaration:
      str += codeFromTSModuleDeclaration(ast);
      break;

    case AST_NODE_TYPES.TSInterfaceDeclaration:
      str += codeFromTSInterfaceDeclaration(ast);
      break;

    case AST_NODE_TYPES.TSTypeAssertion:
      str += codeFromTSTypeAssertion(ast);
      break;

    default:
      console.log(util.inspect(ast, true, 3));
      throw new Error('unrecornized type: ' + ast.type);
      break;
  }
  return str;
}


export function codeFromArrayExpression(ast: ArrayExpression): string {
  let str = '';
  for (let i = 0, len = ast.elements.length; i < len; i++) {
    if (str) {
      str += ', ';
    }
    str += codeFromAST(ast.elements[i]);
  }
  return '{' + str + '}';
}

export function codeFromArrayPattern(ast: ArrayPattern): string {
  assert(false, ast, 'Not support ArrayPattern yet!');
  return '';
}

export function codeFromArrowFunctionExpression(ast: ArrowFunctionExpression): string {
  let str = 'function(';
  let defaultParamsStr = '';
  if (ast.params) {
    for (let i = 0, len = ast.params.length; i < len; i++) {
      if (i > 0) {
        str += ', ';
      }
      let oneParam = ast.params[i];
      (oneParam as any).__parent = ast;
      str += codeFromAST(oneParam);

      if(oneParam.type == AST_NODE_TYPES.AssignmentPattern) {
        let paramIdStr = codeFromAST(oneParam.left);
        defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
        defaultParamsStr += indent(paramIdStr + '=' + codeFromAST(oneParam.right)) + '\n';
        defaultParamsStr += 'end\n';
      }
    }
  }
  str += ')\n';
  if (ast.body) {
    let bodyStr = codeFromAST(ast.body);
    if(defaultParamsStr) {
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

export function codeFromAssignmentExpression(ast: AssignmentExpression): string {
  return codeFromBinaryExpression(ast as any);
}

export function codeFromAssignmentPattern(ast: AssignmentPattern): string {
  let str = codeFromAST(ast.left);
  let parent = (ast as any).__parent;
  if(!parent || (parent.type != AST_NODE_TYPES.FunctionExpression && parent.type != AST_NODE_TYPES.FunctionDeclaration)) {
     str += ' = ' + codeFromAST(ast.right);
  }
  return str;
}

export function codeFromAwaitExpression(ast: AwaitExpression): string {
  assert(false, ast, 'Not support AwaitExpression yet!');
  return '';
}

export function codeFromBigIntLiteral(ast: BigIntLiteral): string {
  return codeFromLiteral(ast as any);
}

export function codeFromBinaryExpression(ast: BinaryExpression): string {
  let optStr = ast.operator;
  assert('>>>=' != optStr, ast, 'Not support >>>= yet!');
  (ast.left as any).__parent = ast;
  let left = codeFromAST(ast.left);
  let right = codeFromAST(ast.right);

  let selffOpts: string[] = ['+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='];
  let isSelfOperator = false;
  if(selffOpts.indexOf(optStr) >= 0) {
    // self operator
    isSelfOperator = true;
    optStr = optStr.substr(0, optStr.length - 1);
  } 
  if(optStr == '+') {
    if(((ast.left as any).__isString || (ast.right as any).__isString)) {
      // TODO: Take care of string combination
      optStr = '..';
      (ast.left as any).__isString = true;
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
    right = codeFromAST((ast.right as AssignmentExpression).left);
  }

  if(isSelfOperator) {
    return str + left + ' = ' + left + ' ' + optStr + ' ' + right;
  }

  return str + left + ' ' + optStr + ' ' + right;
}

export function codeFromBlockStatement(ast: BlockStatement): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    let bstr = codeFromAST(ast.body[i]);
    if(bstr) {
      if (i > 0) {
        str += '\n';
      }
      str += bstr;
    }
  }
  return str;
}

export function codeFromBreakStatement(ast: BreakStatement): string {
  assert(!ast.label, ast, 'Not support break label yet!')
  return 'break';
}

export function codeFromCallExpression(ast: CallExpression): string {
  (ast.callee as any).__parent = ast;
  let calleeStr = codeFromAST(ast.callee);
  let str = '';
  let allAgmStr = '';
  for (let i = 0, len = ast.arguments.length; i < len; i++) {
    let arg = ast.arguments[i];
    let argStr = codeFromAST(arg);
    if(arg.type == AST_NODE_TYPES.AssignmentExpression) {
      str += argStr + '\n';
      argStr = codeFromAST((arg as AssignmentExpression).left);
    } else if(arg.type == AST_NODE_TYPES.UpdateExpression) {
      str += argStr + '\n';
      argStr = codeFromAST((arg as UpdateExpression).argument);
    }
    if(allAgmStr) {
      allAgmStr += ', ';
    }
    allAgmStr += argStr;
  }
  if(calleeStr.match(/:push$/)) {
    // Array push change into table.concat
    str += 'table.concat(' + calleeStr.substr(0, calleeStr.length - 5) + ', ' + allAgmStr + ')';
  } else {
    str = calleeStr + '(';
    str += allAgmStr;
    str += ')';
  }
  return str;
}

export function codeFromCatchClause(ast: CatchClause): string {
  let str = 'function($param$)\n'.replace('$param$', codeFromAST(ast.param));
  str += codeFromBlockStatement(ast.body);
  return str;
}

export function codeFromClassBody(ast: ClassBody): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    let cbodyStr = codeFromAST(ast.body[i]);
    if(cbodyStr) {
      if (i > 0) {
        str += '\n';
      }
      str += cbodyStr;
    }
  }
  return str;
}

export function codeFromClassDeclaration(ast: ClassDeclaration): string {
  let str = '$BaseClass$:subclass("$ClassName$")\n';
  if (ast.typeParameters) {
    // typeParameters?: TSTypeParameterDeclaration;
  }
  if (ast.superTypeParameters) {
    // TSTypeParameterInstantiation;
  }
  if (ast.id) {
    // Identifier
    let className = codeFromAST(ast.id);
    allClasses.push(className);
    classQueue.push(className);
    str = str.replace('$ClassName$', className);
  } else {
    assert(false, ast, 'Class name is necessary!');
  }
  str += codeFromClassBody(ast.body);
  if (ast.superClass) {
    str = str.replace('$BaseClass$', codeFromAST(ast.superClass));
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
    assert(false, ast);
  }
  if (ast.decorators) {
    // Decorator[];
    assert(false, ast);
  }
  classQueue.pop();
  return str;
}

export function codeFromClassExpression(ast: ClassExpression): string {
  pintHit(ast);
  return codeFromClassDeclaration(ast as any);
}

export function codeFromClassProperty(ast: ClassProperty): string {
  let str = '';
  if (ast.value) {
    let className = classQueue[classQueue.length - 1];
    if (ast.static) {
      str = className + '.' + codeFromAST(ast.key) + ' = ' + codeFromAST(ast.value) + ';';
    } else {
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

export function codeFromConditionalExpression(ast: ConditionalExpression): string {
  // TODO: 0 or '' are considered true in lua while false in TypeScript
  let testStr = codeFromAST(ast.test);
  let str = '(' + testStr + ' and {' + codeFromAST(ast.consequent) + '} or {' + codeFromAST(ast.alternate) + '})[1]';
  str += wrapTip('lua中0和空字符串也是true，此处' + testStr + '需要确认');
  return str;
}

export function codeFromContinueStatement(ast: ContinueStatement): string {
  hasContinue = true;
  return 'break';
}

export function codeFromDebuggerStatement(ast: DebuggerStatement): string {
  assert(false, ast, 'Not support DebuggerStatement yet!');
  return '';
}

export function codeFromDecorator(ast: Decorator): string {
  assert(false, ast, 'Not support Decorator yet!');
  return '';
}

export function codeFromDoWhileStatement(ast: DoWhileStatement): string {
  assert(false, ast, 'Not support DoWhileStatement yet!');
  return '';
}

export function codeFromEmptyStatement(ast: EmptyStatement): string {
  return '';
}

export function codeFromExportAllDeclaration(ast: ExportAllDeclaration): string {
  assert(false, ast, 'Not support ExportAllDeclaration yet!');
  return '';
}

export function codeFromExportDefaultDeclaration(ast: ExportDefaultDeclaration): string {
  return '';
}

export function codeFromExportNamedDeclaration(ast: ExportNamedDeclaration): string {
  (ast.declaration as any).__exported = true;
  return codeFromAST(ast.declaration);
}

export function codeFromExportSpecifier(ast: ExportSpecifier): string {
  assert(false, ast, 'Not support ExportSpecifier yet!');
  return '';
}

export function codeFromExpressionStatement(ast: ExpressionStatement): string {
  return codeFromAST(ast.expression);
}

export function codeFromForInStatement(ast: ForInStatement): string {
  (ast.left as any).__parent = ast;
  let str = 'for ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
  str += indent(codeFromAST(ast.body)) + '\n';
  str += 'end';
  return str;
}

export function codeFromForOfStatement(ast: ForOfStatement): string {
  (ast.left as any).__parent = ast;
  let str = 'for _tmpi, ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
  str += indent(codeFromAST(ast.body)) + '\n';
  str += 'end';
  return str;
}

export function codeFromForStatement(ast: ForStatement): string {
  hasContinue = false;

  let str = '';
  if (ast.init && ast.init.type != AST_NODE_TYPES.Identifier) {
    str += codeFromAST(ast.init) + '\n';
  }
  str += 'repeat\n';
  let repeatBodyStr = codeFromAST(ast.body);
  if(hasContinue) {
    repeatBodyStr = 'repeat\n' + indent(repeatBodyStr + '\nbreak') + '\nuntil true'
  }
  if (ast.update) {
    repeatBodyStr += '\n';
    repeatBodyStr += codeFromAST(ast.update);
  }
  str += indent(repeatBodyStr) + '\n';
  str += 'until ';
  if (ast.test) {
    str += 'not(' + codeFromAST(ast.test) + ')';
  } else {
    str += 'false';
  }
  return str;
}

export function codeFromFunctionDeclaration(ast: FunctionDeclaration): string {
  return codeFromFunctionExpression(ast as any);
}

export function codeFromFunctionExpression(ast: FunctionExpression): string {
  return codeFromFunctionExpressionInternal(null, false, ast);
}

function codeFromFunctionExpressionInternal(funcName: string, isStatic: boolean, ast: FunctionExpression): string {
  let str = '';
  if(!funcName && ast.id) {
    funcName = codeFromAST(ast.id);
  }
  if (funcName) {
    if('constructor' == funcName) {
      funcName = 'ctor';
    }
    let className = classQueue[classQueue.length - 1];
    if (className) {
      // 成员函数
      if(isStatic) {
        str = 'function ' + className + '.' + funcName + '(';
      } else {
        str = 'function ' + className + '.prototype:' + funcName + '(';
      }
    } else {
      let moduleName = moduleQueue[moduleQueue.length - 1];
      if(moduleName) {
        // 模块函数
        str = 'function ' + moduleName + ':' + funcName + '(';
      } else {
        // 普通函数
        str = 'function ' + funcName + '(';
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
      str += codeFromAST(oneParam);

      if(oneParam.type == AST_NODE_TYPES.AssignmentPattern) {
        let paramIdStr = codeFromAST(oneParam.left);
        defaultParamsStr += 'if ' + paramIdStr + ' == nil then\n';
        defaultParamsStr += indent(paramIdStr + '=' + codeFromAST(oneParam.right)) + '\n';
        defaultParamsStr += 'end\n';
      }
    }
  }
  str += ')';
  let bodyStr = '';
  if (ast.body) {
    bodyStr = codeFromAST(ast.body);
    if(defaultParamsStr) {
      bodyStr = defaultParamsStr + bodyStr;
    }    
  }

  if(bodyStr) {
    str += '\n' + indent(bodyStr) + '\nend\n';
  } else {
    str += ' end';
  }
  assert(!ast.generator, ast, 'Not support generator yet!');
  assert(!ast.async, ast, 'Not support async yet!');
  assert(!ast.expression, ast, 'Not support expression yet!');
  assert(!ast.declare, ast, 'Not support declare yet!');
  return str;
}

export function codeFromIdentifier(ast: Identifier): string {
  let str = ast.name;
  if(luaKeyWords.indexOf(str) >= 0) {
    str = 'tsvar_' + str;
  } else if(str.substr(0, 1) == '$') {
    str = 'tsvar_' + str.substr(1);
  }
  return str;
}

export function codeFromIfStatement(ast: IfStatement): string {
  let testStr = codeFromAST(ast.test);
  let str = 'if ' + testStr + ' then\n';
  str += indent(codeFromAST(ast.consequent));
  if (ast.alternate) {
    str += '\nelse\n';
    str += indent(codeFromAST(ast.alternate));
  }
  str += '\nend';
  return str;
}

export function codeFromImport(ast: Import): string {
  assert(false, ast, 'Not support Import yet!');
  return '';
}

export function codeFromImportDeclaration(ast: ImportDeclaration): string {
  let p = (ast.source as Literal).value as string;
  if(importContents.indexOf(p) < 0) {
    importContents.push(p);
  }
  return '';
}

export function codeFromImportDefaultSpecifier(ast: ImportDefaultSpecifier): string {
  assert(false, ast, 'Not support ImportDefaultSpecifier yet!');
  return '';
}

export function codeFromImportNamespaceSpecifier(ast: ImportNamespaceSpecifier): string {
  assert(false, ast, 'Not support ImportNamespaceSpecifier yet!');
  return '';
}

export function codeFromImportSpecifier(ast: ImportSpecifier): string {
  assert(false, ast, 'Not support ImportSpecifier yet!');
  return '';
}

export function codeFromLabeledStatement(ast: LabeledStatement): string {
  assert(false, ast, 'Not support LabeledStatement yet!');
  return '';
}

export function codeFromLiteral(ast: Literal): string {
  if (ast.regex) {
    return ast.raw + wrapTip('tslua无法自动转换正则表达式，请手动处理。');
  }
  if(typeof(ast.value) == 'string') {
    (ast as any).__isString = true;
  }
  if((ast as any).__parent && (ast as any).__parent.type == AST_NODE_TYPES.Property) {
    return ast.value as string;
  }
  let l = ast.raw;
  if(null === ast.value) {
    l = 'nil';
  }
  return l;
}

export function codeFromLogicalExpression(ast: LogicalExpression): string {
  let left = codeFromAST(ast.left);
  if (calPriority(ast.left) >= calPriority(ast)) {
    left = '(' + left + ')';
  }
  let right = codeFromAST(ast.right);
  if (calPriority(ast.right) >= calPriority(ast)) {
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

export function codeFromMemberExpression(ast: MemberExpression): string {
  let str = codeFromAST(ast.object);
  if('xlua' == luaStyle && str == 'UnityEngine') {
    str = 'CS.UnityEngine';
  }
  if (noBraceTypes.indexOf(ast.object.type) < 0) {
    str = '(' + str + ')';
  }
  if (ast.computed) {
    let propertyStr = codeFromAST(ast.property);
    if(propertyStr.length == 1) {
      // Auto modify xx[i] to xx[i + 1]
      propertyStr += '+1';
    } else {
      // Add some tips
      propertyStr += wrapTip(str + '下标访问可能不正确');
    }
    str += '[' + propertyStr + ']';
  } else {
    if(ast.property.type == AST_NODE_TYPES.Identifier && ast.property.name == 'length') {
      if((!(ast as any).__parent || (ast as any).__parent.type != AST_NODE_TYPES.AssignmentExpression)) {
        str = '#' + str;
      } else {
        str += '.length' + wrapTip('修改数组长度需要手动处理。');
      }
    } else {
      // TODO: do something with static members
      let parent = (ast as any).__parent;
      if(parent && parent.type == AST_NODE_TYPES.CallExpression) {
        str += ':';
      } else {
        str += '.';
      }
      str += codeFromAST(ast.property);
    }
  }
  return str;
}

export function codeFromMetaProperty(ast: MetaProperty): string {
  assert(false, ast, 'Not support MetaProperty yet!');
  return '';
}

export function codeFromMethodDefinition(ast: MethodDefinition): string {
  let funcName = null;
  if (ast.key) {
    funcName = codeFromAST(ast.key);
  }
  if(ast.value.type == "TSEmptyBodyFunctionExpression") {
    assert(false, ast, 'Not support TSEmptyBodyFunctionExpression yet!');
  }
  return codeFromFunctionExpressionInternal(funcName, ast.static, ast.value as FunctionExpression);
}

export function codeFromNewExpression(ast: NewExpression): string {
  let callee = codeFromAST(ast.callee);
  if (calPriority(ast.callee) > calPriority(ast)) {
    callee = '(' + callee + ')';
  }
  let str = callee + '(';
  for (let i = 0, len = ast.arguments.length; i < len; i++) {
    if (i > 0) {
      str += ', ';
    }
    str += codeFromAST(ast.arguments[i]);
  }
  str += ')';
  return str;
}

export function codeFromObjectExpression(ast: ObjectExpression): string {
  var str = '{';
  for (let i = 0, len = ast.properties.length; i < len; i++) {
    if (i > 0) {
      str += ', ';
    }
    str += codeFromAST(ast.properties[i]);
  }
  return str + '}';
}

export function codeFromObjectPattern(ast: ObjectPattern): string {
  assert(false, ast, 'Not support ObjectPattern yet!');
  return '';
}

export function codeFromProgram(ast: Program): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    let stm = ast.body[i];
    let bodyStr = codeFromAST(stm);
    if(bodyStr) {
      if(i > 0) {
        str += '\n';
      }
      str += bodyStr;
    }
  }
  return str;
}

export function codeFromProperty(ast: Property): string {
  (ast.key as any).__parent = ast;
  return codeFromAST(ast.key) + '=' + codeFromAST(ast.value);
}

export function codeFromRestElement(ast: RestElement): string {
  return '...';
}

export function codeFromReturnStatement(ast: ReturnStatement): string {
  if(!ast.argument) {
    return 'return';
  }
  return 'return ' + codeFromAST(ast.argument);
}

export function codeFromSequenceExpression(ast: SequenceExpression): string {
  let str = '';
  for (var i = 0, len = ast.expressions.length; i < len; i++) {
    if (i > 0) {
      str += '; ';
    }
    str += codeFromAST(ast.expressions[i]);
  }
  return str;
}

export function codeFromSpreadElement(ast: SpreadElement): string {
  return '...';
}

export function codeFromSuper(ast: Super): string {
  let className = classQueue[classQueue.length - 1];
  return className + '.super';
}

export function codeFromSwitchCase(ast: SwitchCase): string {
  let str = '';
  if (ast.test) {
    str += '[' + codeFromAST(ast.test) + '] = function()\n';
  } else {
    str += '["default"] = function()\n';
  }
  let csqStr = '';
  for (let i = 0, len = ast.consequent.length; i < len; i++) {
    if(ast.consequent[i].type != AST_NODE_TYPES.BreakStatement) {
      if(i > 0) {
        csqStr += '\n';
      }
      csqStr += codeFromAST(ast.consequent[i]);
    }
  }
  if(csqStr) {
    str += indent(csqStr);
    str += '\nend';
  } else {
    str += ' end';
  }
  return str;
}

export function codeFromSwitchStatement(ast: SwitchStatement): string {
  let str = 'local switch = {\n';
  let caseStr = '';
  for (let i = 0, len = ast.cases.length; i < len; i++) {
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

export function codeFromTaggedTemplateExpression(ast: TaggedTemplateExpression): string {
  assert(false, ast, 'Not support TaggedTemplateExpression yet!');
  return '';
}

export function codeFromTemplateElement(ast: TemplateElement): string {
  assert(false, ast, 'Not support TemplateElement yet!');
  return '';
}

export function codeFromTemplateLiteral(ast: TemplateLiteral): string {
  assert(false, ast, 'Not support TemplateLiteral yet!');
  return '';
}

export function codeFromThisExpression(ast: ThisExpression): string {
  return 'self';
}

export function codeFromThrowStatement(ast: ThrowStatement): string {
  return 'error(' + codeFromAST(ast.argument) + ')';
}

export function codeFromTryStatement(ast: TryStatement): string {
  importContents.push('trycatch');
  let str = 'try_catch{\n';
  let tcStr = 'main = function()\n';
  tcStr += indent(codeFromAST(ast.block));
  tcStr += '\nend';
  if(ast.handler) {
    tcStr += ',\ncatch = ';
    tcStr += indent(codeFromAST(ast.handler), 1);
    tcStr += '\nend'
  }
  if(ast.finalizer) {
    tcStr += ',\nfinally = function()\n';
    tcStr += indent(codeFromAST(ast.finalizer));
    tcStr += '\nend'
  }
  str += indent(tcStr);
  str += '\n}';
  return str;
}

export function codeFromUnaryExpression(ast: UnaryExpression): string {
  let str;
  let agm = codeFromAST(ast.argument);
  if (calPriority(ast.argument) >= calPriority(ast)) {
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
      assert(false, ast, 'Not support void yet!');
    } else {
      assert('-' == ast.operator, ast, 'Not support UnaryOperator: ' + ast.operator);
      str = ast.operator + agm;
    }
  } else {
    str = agm + ast.operator;
  }
  return str;
}

export function codeFromUpdateExpression(ast: UpdateExpression): string {
  let astr = codeFromAST(ast.argument);
  if (calPriority(ast.argument) >= calPriority(ast)) {
    astr = '(' + astr + ')';
  }
  // if (ast.prefix) {
  //   // TODO: Consider if the value is right when used as Assignment/Property
  //   str = ast.operator + str;
  // } else {
  //   str = str + ast.operator;
  // }
  let str = astr + '=' + astr + ast.operator.substring(0, 1) + '1';
  return str;
}

export function codeFromVariableDeclaration(ast: VariableDeclaration): string {
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
    str += codeFromVariableDeclarator(d);
  }
  return str;
}

export function codeFromVariableDeclarator(ast: VariableDeclarator): string {
  let str = '';
  let idStr = codeFromAST(ast.id);
  let initStr = '';
  if(ast.init) {
    initStr = codeFromAST(ast.init);
    if(ast.init.type == AST_NODE_TYPES.AssignmentExpression) {
      str = initStr + '\n';
      initStr = codeFromAST((ast.init as AssignmentExpression).left);
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

export function codeFromWhileStatement(ast: WhileStatement): string {
  let str = 'while(' + codeFromAST(ast.test) + ')\n';
  str += 'do\n';
  let bodyCode = codeFromAST(ast.body);
  str += bodyCode + '\n';
  str += 'end';
  return str;
}

export function codeFromWithStatement(ast: WithStatement): string {
  assert(false, ast, 'Not support WithStatement yet');
  return '';
}

export function codeFromYieldExpression(ast: YieldExpression): string {
  let str = 'coroutine.yield(';
  str += codeFromAST(ast.argument);
  str += ')';
  return str;
}

export function codeFromTSAbstractMethodDefinition(ast: TSAbstractMethodDefinition): string {
  return codeFromMethodDefinition(ast as any);
}

export function codeFromTSAsExpression(ast: TSAsExpression): string {
  return codeFromAST(ast.expression);
}

export function codeFromTSDeclareFunction(ast: TSDeclareFunction): string {
  return wrapTip('请手动处理DeclareFunction');
}

export function codeFromTSEnumDeclaration(ast: TSEnumDeclaration): string {
  let str = '';
  if(!(ast as any).__exported) {
    str += 'local ';
  }
  str += codeFromAST(ast.id) + ' = {\n';
  let membersStr = '';
  let nextValue = 0;
  for(let i = 0, len = ast.members.length; i < len; i++) {
    if(i > 0) {
      membersStr += ',\n';
    }
    let m = ast.members[i];
    membersStr += codeFromAST(m.id) + ' = ';
    if(m.initializer) {
      membersStr += codeFromAST(m.initializer)
      nextValue = ((m.initializer as Literal).value as number) + 1;
    } else {
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

export function codeFromTSModuleBlock(ast: TSModuleBlock): string {
  let str = '';
  for(let i = 0, len = ast.body.length; i < len; i++) {
    let bstr = codeFromAST(ast.body[i]);
    if(bstr) {
      if(i > 0) {
        str += '\n';
      }
      str += bstr;
    }
  }
  return str;
}

export function codeFromTSModuleDeclaration(ast: TSModuleDeclaration): string {
  let moduleName = codeFromAST(ast.id);
  moduleQueue.push(moduleName);
  let str = moduleName + ' = {}\n';
  if(ast.body) {
    str += indent(codeFromAST(ast.body));
  }
  moduleQueue.pop();
  return str;
}

export function codeFromTSInterfaceDeclaration(ast: TSInterfaceDeclaration): string {
  return '';
}

export function codeFromTSTypeAssertion(ast: TSTypeAssertion): string {
  return codeFromAST(ast.expression);
}

function indent(str: string, fromLine: number = 0): string {
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

function pintHit(ast: any): void {
  console.warn('hit %s!', ast.type);
  console.log(util.inspect(ast, true, 4));
}

function wrapTip(rawTip: string): string {
  return '<TT>[ts2lua]' + rawTip.replace(/<TT>.*?<\/TT>/g, '') + '</TT>';
}

function wrapPop(popStr: string): string {
  return '<ts2lua' + popStr.length + '>' + popStr;
}

function formatTip(content: string): string {
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

function assert(cond: boolean, ast: BaseNode, message: string = null) {
  if(!cond) {
    if(isDevMode) {
      console.log(util.inspect(ast, true, 6));
    }
    console.log('\x1B[36m%s\x1B[0m:\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', filePath, ast.loc.start.line, ast.loc.start.column, message ? message : 'Error');
  }
}