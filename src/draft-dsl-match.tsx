import {
    isTSUnionType,
    expressionStatement,
    blockStatement,
    Identifier,
    TypeAnnotation,
    isTSLiteralType,
    IfStatement,
    BlockStatement,
    StringLiteral,
    NumberLiteral,
    isTSTypeReference,
    ArrowFunctionExpression,
    ExpressionStatement,
    isStringLiteral,
    isTSQualifiedName,
    isIdentifier,
} from "@babel/types";
import { ToAst, ToString } from "typedraft";

export class PatternMatch {
    m_Merge: boolean;

    constructor(merge = false) {
        this.m_Merge = merge;
    }
}

//@ts-ignore
<PatternMatch /> +
    function Transcribe(block: Array<ExpressionStatement>): [IfStatement] {
        let tail: IfStatement = null;
        let head: IfStatement = null;

        // if we are in inline context, remove "use match"
        const [first] = block;
        if (first && isStringLiteral(first.expression)) {
            block = block.slice(1);
        }

        block.forEach(each => {
            const expression = each.expression as ArrowFunctionExpression;

            //@ts-ignore
            <TranscribeExpressionToIf />;
        });

        /**
         * transcribed is the "head"(first) of if statement
         */
        return [head];
    };

function TranscribeExpressionToIf(
    expression: ArrowFunctionExpression,
    head: IfStatement,
    tail: IfStatement
) {
    if (expression.params.length === 0) {
        //@ts-ignore
        <HandleDefaultCase />;
    } else {
        //@ts-ignore
        <BuildCurrentIf />;

        //@ts-ignore
        <MoveToNext />;
    }
}

type Literal = (StringLiteral | NumberLiteral) & { extra: { raw: string } };

function BuildCurrentIf(expression: ArrowFunctionExpression) {
    //
    const [pattern_info] = expression.params as [Identifier];
    const to_match = pattern_info.name;
    const annotation = (pattern_info.typeAnnotation as TypeAnnotation).typeAnnotation;

    //
    let current: IfStatement = null;

    if (isTSLiteralType(annotation)) {
        /**
         * number or string
         */
        const pattern = (annotation.literal as Literal).extra.raw;
        current = ToAst(`if(${to_match}===${pattern}){}`) as IfStatement;
    } else if (isTSTypeReference(annotation)) {
        /**
         * enum, instanceof
         */

        let operator = null;
        if (isTSQualifiedName(annotation.typeName)) {
            operator = "===";
        } else if (isIdentifier(annotation.typeName)) {
            operator = "instanceof";
        }
        current = ToAst(`if(${to_match} ${operator} ${ToString(annotation)}){}`) as IfStatement;
    } else if (isTSUnionType(annotation)) {
        /**
         * or
         */
        const types = annotation.types;
        const patterns = types.map(each => {
            if (each.type === "TSLiteralType") {
                return (each.literal as Literal).extra.raw;
            } else if (each.type === "TSTypeReference") {
                return ToString(each);
            }
        });
        const fragments = patterns.map(each => `${to_match}===${each}`);
        const condition = fragments.join("||");
        current = ToAst(`if(${condition}){}`) as IfStatement;
    }

    current.consequent =
        expression.body.type === "BlockStatement"
            ? (expression.body as BlockStatement)
            : blockStatement([expressionStatement(expression.body)]);
}

function MoveToNext(head: IfStatement, current: IfStatement, tail: IfStatement) {
    if (head == null) {
        head = tail = current;
    } else {
        tail = tail.alternate = current;
    }
}

function HandleDefaultCase(expression: ArrowFunctionExpression, tail: IfStatement) {
    tail.alternate =
        expression.body.type === "BlockStatement"
            ? (expression.body as BlockStatement)
            : blockStatement([expressionStatement(expression.body)]);
}
