import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import sf = require('string-format');
import util = require('util')

let blockDeep = 0;
let allClasses: string[] = [];
let classQueue: string[] = [];

const noBraceTypes = [AST_NODE_TYPES.MemberExpression, AST_NODE_TYPES.ThisExpression, AST_NODE_TYPES.Identifier];

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

export function toLua(ast: any): string {
  blockDeep = 0;
  allClasses.length = 0;
  classQueue.length = 0;
  let content = codeFromAST(ast);
  if(allClasses.length > 0) {
    content = 'require("class")\n' + content;
  }
  content = content.replace(/console[\.|:]log/g, 'print');
  return content;
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

    case AST_NODE_TYPES.TSEnumDeclaration:
      str += codeFromTSEnumDeclaration(ast);
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
  console.assert(false, 'Not support ArrayPattern yet!');
  return '';
}

export function codeFromArrowFunctionExpression(ast: ArrowFunctionExpression): string {
  console.assert(false, 'Not support ArrowFunctionExpression yet!');
  return '';
}

export function codeFromAssignmentExpression(ast: AssignmentExpression): string {
  return codeFromBinaryExpression(ast as any);
}

export function codeFromAssignmentPattern(ast: AssignmentPattern): string {
  let str = codeFromAST(ast.left);
  let parent = (ast as any).__parent;
  if(!parent || parent.type != AST_NODE_TYPES.FunctionExpression) {
     str += ' = ' + codeFromAST(ast.right);
  }
  return str;
}

export function codeFromAwaitExpression(ast: AwaitExpression): string {
  console.assert(false, 'Not support AwaitExpression yet!');
  return '';
}

export function codeFromBigIntLiteral(ast: BigIntLiteral): string {
  return codeFromLiteral(ast as any);
}

export function codeFromBinaryExpression(ast: BinaryExpression): string {
  let optStr = ast.operator;
  // TODO: Take care of string combination
  let left = codeFromAST(ast.left);
  let right = codeFromAST(ast.right);
  if(ast.operator == '+' && ((ast.left as any).__isString || (ast.right as any).__isString)) {
    optStr = '..';
    (ast.left as any).__isString = true;
  }
  return left + optStr + right;
}

export function codeFromBlockStatement(ast: BlockStatement): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    if (i > 0) {
      str += '\n';
    }
    str += codeFromAST(ast.body[i]);
  }
  return str;
}

export function codeFromBreakStatement(ast: BreakStatement): string {
  console.assert(!ast.label, 'Not support break label yet!')
  return 'break';
}

export function codeFromCallExpression(ast: CallExpression): string {
  (ast.callee as any).__parent = ast;
  let str = codeFromAST(ast.callee);
  str += '(';
  for (let i = 0, len = ast.arguments.length; i < len; i++) {
    if (i > 0) {
      str += ', ';
    }
    str += codeFromAST(ast.arguments[i]);
  }
  str += ')';
  return str;
}

export function codeFromCatchClause(ast: CatchClause): string {
  let str = 'function($param$)'.replace('$param$', codeFromAST(ast.param));
  str += codeFromBlockStatement(ast.body);
  str += 'end';
  return str;
}

export function codeFromClassBody(ast: ClassBody): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    if (i > 0) {
      str += '\n';
    }
    str += codeFromAST(ast.body[i]);
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
    console.assert(false, 'Class name is necessary!');
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
    console.assert(false);
  }
  if (ast.decorators) {
    // Decorator[];
    console.assert(false);
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
  let str = 'if ' + codeFromAST(ast.test) + ' then \n';
  str += codeFromAST(ast.consequent) + '\n';
  if (ast.alternate) {
    str += 'else \n';
    str += codeFromAST(ast.alternate) + '\n';
  }
  str += 'end';
  return str;
}

export function codeFromContinueStatement(ast: ContinueStatement): string {
  console.assert(false, 'Not support ContinueStatement yet!');
  return '';
}

export function codeFromDebuggerStatement(ast: DebuggerStatement): string {
  console.assert(false, 'Not support DebuggerStatement yet!');
  return '';
}

export function codeFromDecorator(ast: Decorator): string {
  console.assert(false, 'Not support Decorator yet!');
  return '';
}

export function codeFromDoWhileStatement(ast: DoWhileStatement): string {
  console.assert(false, 'Not support DoWhileStatement yet!');
  return '';
}

export function codeFromEmptyStatement(ast: EmptyStatement): string {
  console.assert(false, 'Not support EmptyStatement yet!');
  return '';
}

export function codeFromExportAllDeclaration(ast: ExportAllDeclaration): string {
  console.assert(false, 'Not support ExportAllDeclaration yet!');
  return '';
}

export function codeFromExportDefaultDeclaration(ast: ExportDefaultDeclaration): string {
  console.assert(false, 'Not support ExportDefaultDeclaration yet!');
  return '';
}

export function codeFromExportNamedDeclaration(ast: ExportNamedDeclaration): string {
  return codeFromAST(ast.declaration);
}

export function codeFromExportSpecifier(ast: ExportSpecifier): string {
  console.assert(false, 'Not support ExportSpecifier yet!');
  return '';
}

export function codeFromExpressionStatement(ast: ExpressionStatement): string {
  return codeFromAST(ast.expression);
}

export function codeFromForInStatement(ast: ForInStatement): string {
  let str = 'for ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
  str += codeFromAST(ast.body) + '\n';
  str += 'end\n';
  return str;
}

export function codeFromForOfStatement(ast: ForOfStatement): string {
  let str = 'for _tmpi, ' + codeFromAST(ast.left) + ' in pairs(' + codeFromAST(ast.right) + ') do\n';
  str += codeFromAST(ast.body) + '\n';
  str += 'end\n';
  return str;
}

export function codeFromForStatement(ast: ForStatement): string {
  let str = '';
  if (ast.init) {
    str += codeFromAST(ast.init) + '\n';
  }
  str += 'repeat\n';
  let repeatBodyStr = codeFromAST(ast.body);
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
  return codeFromFunctionExpressionInternal(null, ast);
}

function codeFromFunctionExpressionInternal(funcName: string, ast: FunctionExpression): string {
  let str = '';
  if(!funcName) {
    funcName = codeFromAST(ast.id);
  }
  if (funcName) {
    if('constructor' == funcName) {
      funcName = 'ctor';
    }
    let className = classQueue[classQueue.length - 1];
    if (className) {
      // 成员函数
      str = 'function ' + className + '.prototype:' + funcName + '(';
    } else {
      // 普通函数
      str = 'function ' + funcName + '(';
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
  str += ')\n';
  if (ast.body) {
    blockDeep++;
    let bodyStr = codeFromAST(ast.body);
    if(defaultParamsStr) {
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

export function codeFromIdentifier(ast: Identifier): string {
  return ast.name;
}

export function codeFromIfStatement(ast: IfStatement): string {
  let str = 'if ' + codeFromAST(ast.test) + ' then\n'
  str += indent(codeFromAST(ast.consequent) + '\n');
  if (ast.alternate) {
    str += 'else\n'
    str += indent(codeFromAST(ast.alternate) + '\n');
  }
  str += 'end\n';
  return str;
}

export function codeFromImport(ast: Import): string {
  console.assert(false, 'Not support Import yet!');
  return '';
}

export function codeFromImportDeclaration(ast: ImportDeclaration): string {
  let tmpl = `require({})
`;
  return sf(tmpl, (ast.source as Literal).raw);
}

export function codeFromImportDefaultSpecifier(ast: ImportDefaultSpecifier): string {
  console.assert(false, 'Not support ImportDefaultSpecifier yet!');
  return '';
}

export function codeFromImportNamespaceSpecifier(ast: ImportNamespaceSpecifier): string {
  console.assert(false, 'Not support ImportNamespaceSpecifier yet!');
  return '';
}

export function codeFromImportSpecifier(ast: ImportSpecifier): string {
  console.assert(false, 'Not support ImportSpecifier yet!');
  return '';
}

export function codeFromLabeledStatement(ast: LabeledStatement): string {
  console.assert(false, 'Not support LabeledStatement yet!');
  return '';
}

export function codeFromLiteral(ast: Literal): string {
  if (ast.regex) {
    console.assert(false, 'Not support regex yet!');
  }
  if(typeof(ast.value) == 'string') {
    (ast as any).__isString = true;
  }
  return ast.raw;
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
  let str = left + ast.operator + right;
  return str;
}

export function codeFromMemberExpression(ast: MemberExpression): string {
  let str = codeFromAST(ast.object);
  if (noBraceTypes.indexOf(ast.object.type) < 0) {
    str = '(' + str + ')';
  }
  if (ast.computed) {
    str += '[' + codeFromAST(ast.property) + ']';
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
  return str;
}

export function codeFromMetaProperty(ast: MetaProperty): string {
  console.assert(false, 'Not support MetaProperty yet!');
  return '';
}

export function codeFromMethodDefinition(ast: MethodDefinition): string {
  let funcName = null;
  if (ast.key) {
    funcName = codeFromAST(ast.key);
  }
  if(ast.value.type == "TSEmptyBodyFunctionExpression") {
    console.assert(false, 'Not support TSEmptyBodyFunctionExpression yet!');
  }
  return codeFromFunctionExpressionInternal(funcName, ast.value as FunctionExpression);
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
  console.assert(false, 'Not support ObjectPattern yet!');
  return '';
}

export function codeFromProgram(ast: Program): string {
  let str = '';
  for (let i = 0, len = ast.body.length; i < len; i++) {
    if(i > 0) {
      str += '\n';
      str += '--分割线\n';
      str += '\n';
    }
    let stm = ast.body[i];
    str += codeFromAST(stm);
  }
  return str;
}

export function codeFromProperty(ast: Property): string {
  return codeFromAST(ast.key) + ':' + codeFromAST(ast.value);
}

export function codeFromRestElement(ast: RestElement): string {
  console.assert(false, 'Not support RestElement yet!');
  return '';
}

export function codeFromReturnStatement(ast: ReturnStatement): string {
  return 'return ' + codeFromAST(ast.argument);
}

export function codeFromSequenceExpression(ast: SequenceExpression): string {
  let str = '(';
  for (var i = 0, len = ast.expressions.length; i < len; i++) {
    if (i > 0) {
      str += ', ';
    }
    str += codeFromAST(ast.expressions[i]);
  }
  return str + ')';
}

export function codeFromSpreadElement(ast: SpreadElement): string {
  console.assert(false, 'Not support SpreadElement yet!');
  return '';
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
  for (let i = 0, len = ast.consequent.length; i < len; i++) {
    str += codeFromAST(ast.consequent[i]) + '\n';
  }
  str += 'end\n';
  return str;
}

export function codeFromSwitchStatement(ast: SwitchStatement): string {
  let str = 'local switch = {\n'
  for (let i = 0, len = ast.cases.length; i < len; i++) {
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
  str += 'end'
  return str;
}

export function codeFromTaggedTemplateExpression(ast: TaggedTemplateExpression): string {
  console.assert(false, 'Not support TaggedTemplateExpression yet!');
  return '';
}

export function codeFromTemplateElement(ast: TemplateElement): string {
  console.assert(false, 'Not support TemplateElement yet!');
  return '';
}

export function codeFromTemplateLiteral(ast: TemplateLiteral): string {
  console.assert(false, 'Not support TemplateLiteral yet!');
  return '';
}

export function codeFromThisExpression(ast: ThisExpression): string {
  return 'self';
}

export function codeFromThrowStatement(ast: ThrowStatement): string {
  return 'error(' + codeFromAST(ast.argument) + ')';
}

export function codeFromTryStatement(ast: TryStatement): string {
  console.assert(false, 'Not support codeFromTryStatement yet!');
  return '';
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
    } else if ('void' == ast.operator) {
      console.assert(false, 'Not support void yet!');
    } else {
      console.assert(false, 'Not support UnaryOperator: ' + ast.operator);
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
  let str = '';
  for (let i = 0, len = ast.declarations.length; i < len; i++) {
    // TODO: no local in for statement
    if(i > 0) {
      str += '\n';
    }
    str += 'local ' + codeFromVariableDeclarator(ast.declarations[i]);
  }
  return str;
}

export function codeFromVariableDeclarator(ast: VariableDeclarator): string {
  let str = codeFromAST(ast.id);
  if (ast.init) {
    str += '=' + codeFromAST(ast.init);
  } else {
    console.assert(false, 'Not support VariableDeclarator without init yet');
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
  console.assert(false, 'Not support WithStatement yet');
  return '';
}

export function codeFromYieldExpression(ast: YieldExpression): string {
  let str = 'coroutine.yield(';
  str += codeFromAST(ast.argument);
  str += ')';
  return str;
}

export function codeFromTSEnumDeclaration(ast: TSEnumDeclaration): string {
  console.assert(false, 'Not support TSEnumDeclaration yet');
  return '';
}

function indent(str: string): string {
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
    newStr += indentStr + lines[i];
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