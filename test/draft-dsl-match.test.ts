import { LocalContext, ToAst, ToString } from "typedraft";
import { FunctionDeclaration } from "@babel/types";
import { PatternMatch } from "../src/draft-dsl-match";

describe("test dsl match", () =>
{
    test("dsl.match.number", () =>
    {
        //
        const code = `
            function Test(value:number){
                'use match';

                (value: 1) =>
                {
                    console.log(1);
                }
            
                (value: 2) =>
                {
                    console.log(2);
                }
            
                (value: 3) =>
                {
                    console.log(3);
                }
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();
    })

    test("dsl.match.string", () =>
    {
        //
        const code = `
            function Test(value:string){
                'use match';

                (value: "a") =>
                {
                    console.log("a");
                }
            
                (value: "b") =>
                {
                    console.log("b");
                }
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();

    })

    test("dsl.match.enum", () =>
    {
        //
        const code = `
            function Test(value:Event){
                'use match';

                (value: Event.EventA) =>
                {
                    console.log(1);
                }
            
                (value: Event.EventB) =>
                {
                    console.log("a");
                }
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();

    })

    test("dsl.match.only-default: only default is not allowed", () =>
    {
        //
        const code = `
            function Test(value:number){
                'use match';

                () =>
                {
                    console.log(2);
                }
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        expect(() => context.Resolve(new PatternMatch())).toThrowError();
    })

    test("dsl.match.default", () =>
    {
        //
        const code = `
            function Test(value:number){
                'use match';

                (value: 1) =>
                {
                    console.log(1);
                }
            
                () =>
                {
                    console.log(2);
                }
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();
    })

    test("dsl.match: return block statement", () =>
    {
        //
        const code = `
            function Test(value:number){
                'use match';

                (value: 1) => console.log(1);
            
                () => <HandleSomething/>;
            }
        `;

        const context = new LocalContext(ToAst(code) as FunctionDeclaration);
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();
    })
})