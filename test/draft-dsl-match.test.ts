import { NodePath } from "@babel/traverse";
import { TaggedTemplateExpression, TemplateLiteral } from "@babel/types";
import { ToAst, ToString } from "typedraft";
import { PatternMatch } from "../src/draft-dsl-match";

test("specify input and output type", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
        Λ<number>("match")\`\${value as number}
            \${2} -> \${30}
        \`
        `);

    const ast = dsl.InplaceTranscribe(path, "number");
    expect(ToString(ast)).toMatchSnapshot();
});

test("specify only input type", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
            Λ("match")\`\${value as number}
                \${2} -> \${30}
        \`;
    `);
    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("specify factory", () => {
    const dsl = new PatternMatch({ factory: "match" });
    const path = GetTemplateLiteralPath(`
            Λ("match")\`\${value}
                \${2} -> \${30}
        \`;
    `);
    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("use not", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
            Λ("match")\`\${value}
                \${not(2)} -> \${30}
        \`;
    `);
    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("value only", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
        Λ("match")\`\${value}
            \${2} -> \${30}
            \${'temp'} -> \${'temp'}
            \${string_type} -> \${\`value is \${value}\`}
            \${{ type: 'image' }} -> \${'type is image'}
    \`
    `);

    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("return object", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
        Λ("match")\`\${value}
            \${2} -> \${ x =>({ type: 'image' })}
            \${(value: any) => value === 3} -> \${"number: 3"}
    \`
    `);

    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});
test("use expression", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
        Λ("match")\`\${input}
            \${is3(input)} -> \${'temp'}
            \${input === 3} -> \${{key:'temp'}}
            \${__} -> \${6}
    \`;
    `);

    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("use handler", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
            Λ("match")\`\${['get', 2]}
                \${['get', as('value')]} -> \${(_: any, { value }: any) => value * 2}
        \`;
    `);
    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

test("use handler without param", () => {
    const dsl = new PatternMatch();
    const path = GetTemplateLiteralPath(`
            Λ("match")\`\${value}
                \${2} -> \${()=>30}
        \`;
    `);
    const ast = dsl.InplaceTranscribe(path, "");
    expect(ToString(ast)).toMatchSnapshot();
});

function GetTemplateLiteralPath(code: string) {
    const path = new NodePath<TemplateLiteral>(null, null);
    path.node = (ToAst(code).expression as TaggedTemplateExpression).quasi;
    return path;
}
