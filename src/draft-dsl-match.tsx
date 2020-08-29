import { NodePath } from "@babel/core";
import {
    TemplateLiteral,
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
    CallExpression,
    Identifier,
    memberExpression,
} from "@babel/types";

import { ToAst as ast } from "typedraft";
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
    CallChainRoot(to_match: Expression, output_type: string): CallExpression;
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
        let root = this.CallChainRoot(to_match, output_type);

        template_elements.forEach((each, index) => {
            if (each.value.raw.trim() === "->") {
                const arg1 = template_expressions[index - 1];
                const handler = template_expressions[index] as HandlerType;
                //@ts-ignore
                <AppendWithAndWhen />;
            }
        });

        root = AppendToCallChain(root, identifier("run"), []);
        return root;
    };

function AppendWithAndWhen(
    this: IPatternMatch,
    root: CallExpression,
    arg1: Expression,
    handler: HandlerType
) {
    /**
     * arg1 can be predicate when method is "when", or pattern when method is "with"
     */
    // prettier-ignore
    const { predicate, pattern, method } = Λ<{pattern?: Expression, predicate?: ArrowFunctionExpression, method:Identifier}>('match')` ${arg1 as Expression}
        ${{type: "CallExpression", callee: { name: not("not") }}} -> ${{ 
            predicate: WrapAsArrowFunctionExpression(arg1), method: identifier("when")
        }}

        ${["BinaryExpression","LogicalExpression"].includes(arg1.type)} -> ${{ 
            predicate: WrapAsArrowFunctionExpression(arg1), method: identifier("when")
        }}

        ${{type: "ArrowFunctionExpression"}} -> ${{ predicate: arg1 as ArrowFunctionExpression, method: identifier("when")}}

        ${__} -> ${{pattern: arg1, method: identifier("with")}}
    `;

    /**
     * by default, if handler is value, convert it to { return ...; }
     *  eg. transform ${{value:2}} to ()=>{ return {value:2}; }
     *
     * if handler is function, pay attention to the return object in the same way:
     */
    // prettier-ignore
    const _handler = Λ<ArrowFunctionExpression>("match")` ${handler}
        ${{ type: "ArrowFunctionExpression", body: { extra: { parenthesized: true } } }} -> ${()=>{
            const _handler = WrapAsArrowFunctionExpression(handler.body as Expression);
            _handler.params = handler.params;
            return _handler;
        }}

        ${{ type: "ArrowFunctionExpression"}} -> ${handler}

        ${__} -> ${WrapAsArrowFunctionExpression(handler)}
    `;

    root = AppendToCallChain(root, method, [pattern ?? predicate, _handler]);
}

/**
 * create the root of call chain: MatchDSL<T1, T2>(value)
 * (then append .with and .when)
 */
<PatternMatch /> +
    function CallChainRoot(to_match: Expression, output_type: string): CallExpression {
        /**
         * if we didn't specify input type, we have no template params part
         */
        const root = callExpression(identifier(this.m_Factory), [to_match]);

        if (isTSAsExpression(to_match)) {
            root.typeParameters = tsTypeParameterInstantiation([to_match.typeAnnotation]);

            /**
            * remove "as xxx" in case such as:
            * Λ<number>("match")` ${value as number}
                     ${2} -> ${x => x*2}
                `
            */
            root.arguments = [to_match.expression];

            if (output_type) {
                const type = CreateTSTypeFromString(output_type);
                root.typeParameters.params.push(type);
            }
        }

        return root;
    };

/**
 * # Utility
 *
 * convert <expression> to () => { return <expression>; }
 * in order to deal with object literal as return value uniformly
 *  eg. () => ({value:1})
 *      after transformation, "()" around "{value:1}" will lost, so we convert it to () => { return { value: 1 }; }
 */
const WrapAsArrowFunctionExpression = (expression: Expression) =>
    arrowFunctionExpression([], blockStatement([returnStatement(expression)]));

const CreateTSTypeFromString = (type: string) =>
    (ast(`type _ = ${type}`) as TSTypeAliasDeclaration).typeAnnotation;

const AppendToCallChain = (root: CallExpression, method: Identifier, args: Expression[]) =>
    callExpression(memberExpression(root, method), args);
