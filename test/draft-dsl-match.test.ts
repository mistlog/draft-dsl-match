import { LocalContext, ToString, ToBinding, InlineContext, ToNodePath, ToFile } from "typedraft";
import { BlockStatement, Program } from "@babel/types";
import traverse, { NodePath } from "@babel/traverse";
import { PatternMatch } from "../src/draft-dsl-match";

describe("test dsl match", () => {
    test("dsl.match.number", () => {
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

        SnapshotTest(code);

    })

    test("dsl.match.string", () => {
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

        SnapshotTest(code);


    })

    test("dsl.match.enum", () => {
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

        SnapshotTest(code);


    })

    test("dsl.match.instanceof", () => {
        //
        const code = `
            function Test(value:ClassA | ClassB){
                'use match';

                (value: ClassA) =>
                {
                    console.log("class A");
                }
            
                (value: ClassB) =>
                {
                    console.log("class B");
                }
            }
        `;

        SnapshotTest(code);
    })

    test("dsl.match.only-default: only default is not allowed", () => {
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

        const context = new LocalContext(ToBinding(code));
        expect(() => context.Resolve(new PatternMatch())).toThrowError("Cannot set property 'alternate' of null");
    })

    test("dsl.match.default", () => {
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

        SnapshotTest(code);

    })

    test("dsl.match: return block statement", () => {
        //
        const code = `
            function Test(value:number){
                'use match';

                (value: 1) => console.log(1);
            
                () => <HandleSomething/>;
            }
        `;

        SnapshotTest(code);

    })

    test("dsl.match.or", () => {
        //
        const code = `
            function Test(value:any){
                'use match';

                (value: "a" | "b") =>
                {
                    console.log("string");
                }

                (value: 1 | 2) =>
                {
                    console.log("number");
                }

                (value: Event.A | Event.B) => 
                {
                    console.log("enum");
                }
            }
        `;

        SnapshotTest(code);

    })

    test("dsl.match.inline-context", () => {
        const code = `
            {
                'use match';

                (value: "a" | "b") => {
                    console.log("string");
                }

                (value: 1 | 2) => {
                    console.log("number");
                }
            }
        `;

        const context = new InlineContext(ToNodePath(code));
        context.Resolve(new PatternMatch());
        expect(ToString(context.m_Code)).toMatchSnapshot();
    })

    test("dsl.match.inline-context: merge", () => {
        const code = `
            {
                'use match';

                (value: "a" | "b") => {
                    console.log("string");
                }

                (value: 1 | 2) => {
                    console.log("number");
                }
            }
        `;


        // ToNodePath returns path without container, key, etc... 
        // however, they will be used in merge(path.replaceWithMultiple)
        // so we will get real path by traverse:
        let program_path: NodePath<Program> = null;
        traverse(ToFile(code), { Program(path) { program_path = path; } });
        const [path] = program_path.get("body") as [NodePath<BlockStatement>];

        const context = new InlineContext(path);
        context.Resolve(new PatternMatch(true));

        // path will be invalid after merge, that's fine in typedraft due to RefreshDraftPlugin
        // so we use program_path.node to check the transcribed code:
        expect(ToString(program_path.node)).toMatchSnapshot();
    })
});

function SnapshotTest(code: string) {
    const context = new LocalContext(ToBinding(code));
    context.Resolve(new PatternMatch());
    expect(ToString(context.m_Code)).toMatchSnapshot();
}