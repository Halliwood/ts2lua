import { ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, Import, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration } from '@typescript-eslint/typescript-estree/dist/ts-estree/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import sf = require('string-format');

export function processAST(ast: any, str: string = ''): string {
  switch(ast.type) {
    
      case AST_NODE_TYPES.ArrayExpression:
        str += processArrayExpression(ast, str);
        break;

      case AST_NODE_TYPES.ArrayPattern:
        str += processArrayPattern(ast, str);
        break;

      case AST_NODE_TYPES.ArrowFunctionExpression:
        str += processArrowFunctionExpression(ast, str);
        break;

      case AST_NODE_TYPES.AssignmentExpression:
        str += processAssignmentExpression(ast, str);
        break;

      case AST_NODE_TYPES.AssignmentPattern:
        str += processAssignmentPattern(ast, str);
        break;

      case AST_NODE_TYPES.AwaitExpression:
        str += processAwaitExpression(ast, str);
        break;

      case AST_NODE_TYPES.BigIntLiteral:
        str += processBigIntLiteral(ast, str);
        break;

      case AST_NODE_TYPES.BinaryExpression:
        str += processBinaryExpression(ast, str);
        break;

      case AST_NODE_TYPES.BlockStatement:
        str += processBlockStatement(ast, str);
        break;

      case AST_NODE_TYPES.BreakStatement:
        str += processBreakStatement(ast, str);
        break;

      case AST_NODE_TYPES.CallExpression:
        str += processCallExpression(ast, str);
        break;

      case AST_NODE_TYPES.CatchClause:
        str += processCatchClause(ast, str);
        break;

      case AST_NODE_TYPES.ClassBody:
        str += processClassBody(ast, str);
        break;

      case AST_NODE_TYPES.ClassDeclaration:
        str += processClassDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.ClassExpression:
        str += processClassExpression(ast, str);
        break;

      case AST_NODE_TYPES.ClassProperty:
        str += processClassProperty(ast, str);
        break;

      case AST_NODE_TYPES.ConditionalExpression:
        str += processConditionalExpression(ast, str);
        break;

      case AST_NODE_TYPES.ContinueStatement:
        str += processContinueStatement(ast, str);
        break;

      case AST_NODE_TYPES.DebuggerStatement:
        str += processDebuggerStatement(ast, str);
        break;

      case AST_NODE_TYPES.Decorator:
        str += processDecorator(ast, str);
        break;

      case AST_NODE_TYPES.DoWhileStatement:
        str += processDoWhileStatement(ast, str);
        break;

      case AST_NODE_TYPES.EmptyStatement:
        str += processEmptyStatement(ast, str);
        break;

      case AST_NODE_TYPES.ExportAllDeclaration:
        str += processExportAllDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.ExportDefaultDeclaration:
        str += processExportDefaultDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.ExportNamedDeclaration:
        str += processExportNamedDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.ExportSpecifier:
        str += processExportSpecifier(ast, str);
        break;

      case AST_NODE_TYPES.ExpressionStatement:
        str += processExpressionStatement(ast, str);
        break;

      case AST_NODE_TYPES.ForInStatement:
        str += processForInStatement(ast, str);
        break;

      case AST_NODE_TYPES.ForOfStatement:
        str += processForOfStatement(ast, str);
        break;

      case AST_NODE_TYPES.ForStatement:
        str += processForStatement(ast, str);
        break;

      case AST_NODE_TYPES.FunctionDeclaration:
        str += processFunctionDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.FunctionExpression:
        str += processFunctionExpression(ast, str);
        break;

      case AST_NODE_TYPES.Identifier:
        str += processIdentifier(ast, str);
        break;

      case AST_NODE_TYPES.IfStatement:
        str += processIfStatement(ast, str);
        break;

      case AST_NODE_TYPES.Import:
        str += processImport(ast, str);
        break;

      case AST_NODE_TYPES.ImportDeclaration:
        str += processImportDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.ImportDefaultSpecifier:
        str += processImportDefaultSpecifier(ast, str);
        break;

      case AST_NODE_TYPES.ImportNamespaceSpecifier:
        str += processImportNamespaceSpecifier(ast, str);
        break;

      case AST_NODE_TYPES.ImportSpecifier:
        str += processImportSpecifier(ast, str);
        break;

      case AST_NODE_TYPES.LabeledStatement:
        str += processLabeledStatement(ast, str);
        break;

      case AST_NODE_TYPES.Literal:
        str += processLiteral(ast, str);
        break;

      case AST_NODE_TYPES.LogicalExpression:
        str += processLogicalExpression(ast, str);
        break;

      case AST_NODE_TYPES.MemberExpression:
        str += processMemberExpression(ast, str);
        break;

      case AST_NODE_TYPES.MetaProperty:
        str += processMetaProperty(ast, str);
        break;

      case AST_NODE_TYPES.MethodDefinition:
        str += processMethodDefinition(ast, str);
        break;

      case AST_NODE_TYPES.NewExpression:
        str += processNewExpression(ast, str);
        break;

      case AST_NODE_TYPES.ObjectExpression:
        str += processObjectExpression(ast, str);
        break;

      case AST_NODE_TYPES.ObjectPattern:
        str += processObjectPattern(ast, str);
        break;

      case AST_NODE_TYPES.Program:
        str += processProgram(ast, str);
        break;

      case AST_NODE_TYPES.Property:
        str += processProperty(ast, str);
        break;

      case AST_NODE_TYPES.RestElement:
        str += processRestElement(ast, str);
        break;

      case AST_NODE_TYPES.ReturnStatement:
        str += processReturnStatement(ast, str);
        break;

      case AST_NODE_TYPES.SequenceExpression:
        str += processSequenceExpression(ast, str);
        break;

      case AST_NODE_TYPES.SpreadElement:
        str += processSpreadElement(ast, str);
        break;

      case AST_NODE_TYPES.Super:
        str += processSuper(ast, str);
        break;

      case AST_NODE_TYPES.SwitchCase:
        str += processSwitchCase(ast, str);
        break;

      case AST_NODE_TYPES.SwitchStatement:
        str += processSwitchStatement(ast, str);
        break;

      case AST_NODE_TYPES.TaggedTemplateExpression:
        str += processTaggedTemplateExpression(ast, str);
        break;

      case AST_NODE_TYPES.TemplateElement:
        str += processTemplateElement(ast, str);
        break;

      case AST_NODE_TYPES.TemplateLiteral:
        str += processTemplateLiteral(ast, str);
        break;

      case AST_NODE_TYPES.ThisExpression:
        str += processThisExpression(ast, str);
        break;

      case AST_NODE_TYPES.ThrowStatement:
        str += processThrowStatement(ast, str);
        break;

      case AST_NODE_TYPES.TryStatement:
        str += processTryStatement(ast, str);
        break;

      case AST_NODE_TYPES.UnaryExpression:
        str += processUnaryExpression(ast, str);
        break;

      case AST_NODE_TYPES.UpdateExpression:
        str += processUpdateExpression(ast, str);
        break;

      case AST_NODE_TYPES.VariableDeclaration:
        str += processVariableDeclaration(ast, str);
        break;

      case AST_NODE_TYPES.VariableDeclarator:
        str += processVariableDeclarator(ast, str);
        break;

      case AST_NODE_TYPES.WhileStatement:
        str += processWhileStatement(ast, str);
        break;

      case AST_NODE_TYPES.WithStatement:
        str += processWithStatement(ast, str);
        break;

      case AST_NODE_TYPES.YieldExpression:
        str += processYieldExpression(ast, str);
        break;

      case AST_NODE_TYPES.TSEnumDeclaration:
        str += processTSEnumDeclaration(ast, str);
        break;

    default:
      console.error('unrecornized type: %s', ast.type);
      break;
  }
  return str;
}


export function processArrayExpression(ast: ArrayExpression, str: string = ''): string {
  return str;
}

export function processArrayPattern(ast: ArrayPattern, str: string = ''): string {
  return str;
}

export function processArrowFunctionExpression(ast: ArrowFunctionExpression, str: string = ''): string {
  return str;
}

export function processAssignmentExpression(ast: AssignmentExpression, str: string = ''): string {
  return str;
}

export function processAssignmentPattern(ast: AssignmentPattern, str: string = ''): string {
  return str;
}

export function processAwaitExpression(ast: AwaitExpression, str: string = ''): string {
  return str;
}

export function processBigIntLiteral(ast: BigIntLiteral, str: string = ''): string {
  return str;
}

export function processBinaryExpression(ast: BinaryExpression, str: string = ''): string {
  return str;
}

export function processBlockStatement(ast: BlockStatement, str: string = ''): string {
  return str;
}

export function processBreakStatement(ast: BreakStatement, str: string = ''): string {
  return str;
}

export function processCallExpression(ast: CallExpression, str: string = ''): string {
  return str;
}

export function processCatchClause(ast: CatchClause, str: string = ''): string {
  return str;
}

export function processClassBody(ast: ClassBody, str: string = ''): string {
  return str;
}

export function processClassDeclaration(ast: ClassDeclaration, str: string = ''): string {
  return str;
}

export function processClassExpression(ast: ClassExpression, str: string = ''): string {
  return str;
}

export function processClassProperty(ast: ClassProperty, str: string = ''): string {
  return str;
}

export function processConditionalExpression(ast: ConditionalExpression, str: string = ''): string {
  return str;
}

export function processContinueStatement(ast: ContinueStatement, str: string = ''): string {
  return str;
}

export function processDebuggerStatement(ast: DebuggerStatement, str: string = ''): string {
  return str;
}

export function processDecorator(ast: Decorator, str: string = ''): string {
  return str;
}

export function processDoWhileStatement(ast: DoWhileStatement, str: string = ''): string {
  return str;
}

export function processEmptyStatement(ast: EmptyStatement, str: string = ''): string {
  return str;
}

export function processExportAllDeclaration(ast: ExportAllDeclaration, str: string = ''): string {
  return str;
}

export function processExportDefaultDeclaration(ast: ExportDefaultDeclaration, str: string = ''): string {
  return str;
}

export function processExportNamedDeclaration(ast: ExportNamedDeclaration, str: string = ''): string {
  return str;
}

export function processExportSpecifier(ast: ExportSpecifier, str: string = ''): string {
  return str;
}

export function processExpressionStatement(ast: ExpressionStatement, str: string = ''): string {
  return str;
}

export function processForInStatement(ast: ForInStatement, str: string = ''): string {
  return str;
}

export function processForOfStatement(ast: ForOfStatement, str: string = ''): string {
  return str;
}

export function processForStatement(ast: ForStatement, str: string = ''): string {
  return str;
}

export function processFunctionDeclaration(ast: FunctionDeclaration, str: string = ''): string {
  return str;
}

export function processFunctionExpression(ast: FunctionExpression, str: string = ''): string {
  return str;
}

export function processIdentifier(ast: Identifier, str: string = ''): string {
  return str;
}

export function processIfStatement(ast: IfStatement, str: string = ''): string {
  return str;
}

export function processImport(ast: Import, str: string = ''): string {
  return str;
}

export function processImportDeclaration(ast: ImportDeclaration, str: string = ''): string {
  let tmpl = `require({})
`;
  return sf(tmpl, (ast.source as Literal).raw);
}

export function processImportDefaultSpecifier(ast: ImportDefaultSpecifier, str: string = ''): string {
  return str;
}

export function processImportNamespaceSpecifier(ast: ImportNamespaceSpecifier, str: string = ''): string {
  return str;
}

export function processImportSpecifier(ast: ImportSpecifier, str: string = ''): string {
  return str;
}

export function processLabeledStatement(ast: LabeledStatement, str: string = ''): string {
  return str;
}

export function processLiteral(ast: Literal, str: string = ''): string {
  return str;
}

export function processLogicalExpression(ast: LogicalExpression, str: string = ''): string {
  return str;
}

export function processMemberExpression(ast: MemberExpression, str: string = ''): string {
  return str;
}

export function processMetaProperty(ast: MetaProperty, str: string = ''): string {
  return str;
}

export function processMethodDefinition(ast: MethodDefinition, str: string = ''): string {
  return str;
}

export function processNewExpression(ast: NewExpression, str: string = ''): string {
  return str;
}

export function processObjectExpression(ast: ObjectExpression, str: string = ''): string {
  return str;
}

export function processObjectPattern(ast: ObjectPattern, str: string = ''): string {
  return str;
}

export function processProgram(ast: Program, str: string = ''): string {
  for(let i = 0, len = ast.body.length; i < len; i++) {
    let stm = ast.body[i];
    str = processAST(stm, str);
  }
  return str;
}

export function processProperty(ast: Property, str: string = ''): string {
  return str;
}

export function processRestElement(ast: RestElement, str: string = ''): string {
  return str;
}

export function processReturnStatement(ast: ReturnStatement, str: string = ''): string {
  return str;
}

export function processSequenceExpression(ast: SequenceExpression, str: string = ''): string {
  return str;
}

export function processSpreadElement(ast: SpreadElement, str: string = ''): string {
  return str;
}

export function processSuper(ast: Super, str: string = ''): string {
  return str;
}

export function processSwitchCase(ast: SwitchCase, str: string = ''): string {
  return str;
}

export function processSwitchStatement(ast: SwitchStatement, str: string = ''): string {
  return str;
}

export function processTaggedTemplateExpression(ast: TaggedTemplateExpression, str: string = ''): string {
  return str;
}

export function processTemplateElement(ast: TemplateElement, str: string = ''): string {
  return str;
}

export function processTemplateLiteral(ast: TemplateLiteral, str: string = ''): string {
  return str;
}

export function processThisExpression(ast: ThisExpression, str: string = ''): string {
  return str;
}

export function processThrowStatement(ast: ThrowStatement, str: string = ''): string {
  return str;
}

export function processTryStatement(ast: TryStatement, str: string = ''): string {
  return str;
}

export function processUnaryExpression(ast: UnaryExpression, str: string = ''): string {
  return str;
}

export function processUpdateExpression(ast: UpdateExpression, str: string = ''): string {
  return str;
}

export function processVariableDeclaration(ast: VariableDeclaration, str: string = ''): string {
  return str;
}

export function processVariableDeclarator(ast: VariableDeclarator, str: string = ''): string {
  return str;
}

export function processWhileStatement(ast: WhileStatement, str: string = ''): string {
  return str;
}

export function processWithStatement(ast: WithStatement, str: string = ''): string {
  return str;
}

export function processYieldExpression(ast: YieldExpression, str: string = ''): string {
  return str;
}

export function processTSEnumDeclaration(ast: TSEnumDeclaration, str: string = ''): string {
  return str;
}

