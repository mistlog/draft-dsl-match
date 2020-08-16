import { NodePath } from "@babel/core";
import {
    TemplateLiteral,
    ExpressionStatement,
    ArrowFunctionExpression,
    Expression,
    isTSAsExpression,
    callExpression,
    identifier,
    tsTypeParameterInstantiation,
    TSTypeAliasDeclaration,
    arrowFunctionExpression,
    blockStatement,
    returnStatement,
    BlockStatement,
} from "@babel/types";

import { ToAst as ast, ToString as str } from "typedraft";
import { __, MatchDSL, not } from "draft-dsl-match";

export { __, match as MatchDSL, when, not, select as use } from "ts-pattern";
export const String = __.string;
export const Number = __.number;
export const Boolean = __.boolean;

export interface IPatternMatchConfig {
    factory?: string;
}

export interface IPatternMatch {
    InplaceTranscribe(
        this: PatternMatch & IPatternMatch,
        literal: NodePath<TemplateLiteral>,
        output_type: string
    ): string;
    MatchChainBody(to_match: Expression, output_type: string): string;
    MatchChainItem(method: "when" | "with", param1_str: string, handler_str: string): string;
}

export class PatternMatch {
    m_Factory: string;

    constructor(config?: IPatternMatchConfig) {
        this.m_Factory = config?.factory ?? "MatchDSL";
    }
}

type HandlerType = ArrowFunctionExpression & {
    body?: { extra?: { parenthesized?: boolean } };
};

<PatternMatch /> +
    function InplaceTranscribe(
        this: PatternMatch & IPatternMatch,
        literal: NodePath<TemplateLiteral>,
        output_type: string
    ) {
        /**
         * `ab ${value} cd`
         *
         * - ab, cd: template element
         * - value: template expression
         */
        const template_elements = literal.node.quasis;
        const template_expressions = literal.node.expressions;

        /**
         * Λ<number>("match")` ${value}
              ${2} -> ${x => x*2}
           `
           the first template expression is the value we want to match
         */
        const [to_match] = template_expressions;
        let transcribed = this.MatchChainBody(to_match, output_type);

        template_elements.forEach((each, index) => {
            if (each.value.raw.trim() === "->") {
                const param1 = template_expressions[index - 1];
                const handler = template_expressions[index] as HandlerType;
                //@ts-ignore
                <AppendMatchChainItem />;
            }
        });

        //@ts-ignore
        <AppendDefaultHandler />;
        const transcribed_ast = (ast(transcribed) as ExpressionStatement).expression;
        return transcribed_ast;
    };

function AppendDefaultHandler(transcribed: string) {
    transcribed += ".run()";
}

function AppendMatchChainItem(
    this: IPatternMatch,
    transcribed: string,
    param1: Expression,
    handler: HandlerType
) {
    /**
     * param1 can be predicate when method is "when", or pattern when method is "with"
     */
    // prettier-ignore
    const { param1_str, method } = Λ<{param1_str:string, method:"with"|"when"}>('match')` ${param1 as Expression}
        ${{type: "CallExpression", callee: { name: not("not") }}} -> ${()=>{
            const predicate = arrowFunctionExpression([], blockStatement([returnStatement(param1)]))
            return { param1_str: str(predicate), method: "when"};
        }}

        ${["BinaryExpression","LogicalExpression"].includes(param1.type)} -> ${()=>{
            const predicate = arrowFunctionExpression([], blockStatement([returnStatement(param1)]))
            return { param1_str: str(predicate), method: "when"};
        }}

        ${{type: "ArrowFunctionExpression"}} -> ${{ param1_str: str(param1), method: "when"}}
        ${__} -> ${{param1_str: str(param1), method: "with"}}
    `;

    /**
     * by default, if handler is value, wrap it with "()" to be object expression
     * eg. transform ${{value:2}} to ()=>({value:2})
     *
     * if handler is function, pay attention to the return object in the same way:
     */
    // prettier-ignore
    const handler_str = Λ<string>("match")` ${handler}
        ${{ type: "ArrowFunctionExpression", body: { extra: { parenthesized: true } } }} -> ${()=>{
            handler.body = blockStatement([returnStatement(handler.body as Expression)])
            return str(handler);
        }}

        ${{ type: "ArrowFunctionExpression" }} -> ${()=> {
            const _handler = arrowFunctionExpression(handler.params, handler.body);
            return str(_handler);
        }}

        ${__} -> ${()=>{
            const _handler = arrowFunctionExpression([], blockStatement([returnStatement(handler)]));
            return str(_handler);
        }}
    `;
    transcribed += this.MatchChainItem(method, param1_str, handler_str);
}

/**
 * create the body of match chain: MatchDSL<number, number>(value)
 * (then append .with and .when)
 */
<PatternMatch /> +
    function MatchChainBody(to_match: Expression, output_type: string): string {
        /**
         * if we didn't specify input type, we have no template params part
         */
        const body = callExpression(identifier(this.m_Factory), [to_match]);

        if (isTSAsExpression(to_match)) {
            body.typeParameters = tsTypeParameterInstantiation([to_match.typeAnnotation]);

            /**
            * remove "as xxx" in case such as:
            * Λ<number>("match")` ${value as number}
                     ${2} -> ${x => x*2}
                `
            */
            body.arguments = [to_match.expression];

            if (output_type) {
                // create type from string
                const type = (ast(`type _ = ${output_type}`) as TSTypeAliasDeclaration)
                    .typeAnnotation;
                body.typeParameters.params.push(type);
            }
        }

        return str(body);
    };

/**
 * used to append to MatchChainBody
 *
 * eg. body
 *     .with ...
 *     .when ...
 */
<PatternMatch /> +
    function MatchChainItem(method: "when" | "with", param1_str: string, handler_str: string) {
        const params = [param1_str, ",", handler_str].join("");
        const item = [".", method, "(", ...params, ")"].join("");
        return item;
    };
