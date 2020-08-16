/**
 * Test cases are adapted from https://github.com/gvergnaud/ts-pattern
 */
import { MatchDSL, __, String, Number, when, not, use } from "./draft-dsl-match";

describe("numbers", () => {
    test("match exact numbers", () => {
        const output = Λ("match")` ${1}
            ${1} -> ${x => x * 2}
            ${2} -> ${x => x * x}
            ${__} -> ${-1}
        `;

        expect(output).toEqual(2);
    });
});

describe("object", () => {
    test("optional props", () => {
        type Post = {
            type: "post";
            id?: number;
            body: string;
        };

        const result = Λ("match")` ${{ type: "post", id: 2, body: "az" } as Post} :
            ${{ type: "post", id: 2 }} -> ${100}
            ${{ type: "post", id: Number }} -> ${10}
            ${{ type: "post" }} -> ${1}
        `;

        expect(result).toEqual(100);
    });

    test("match records", () => {
        type Vector1 = { x: number };
        type Vector2 = { x: number; y: number };
        type Vector3 = {
            x: number;
            y: number;
            z: number;
        };
        type Vector = Vector1 | Vector2 | Vector3;

        const vector: Vector = { x: 1 };

        expect(Λ<string>("match")` ${vector as Vector} 
                ${{ x: 1, y: 1, z: 1 }} -> ${"vector3"}
                ${{ x: 2, y: 1 }} -> ${"vector2"}
                ${{ x: 1 }} -> ${"vector1"}`).toEqual("vector1");
    });
});

describe("collection", () => {
    test("match list patterns", () => {
        const http_result = {
            id: 20,
            title: "hellooo",
        };

        const result = Λ<Option<Blog[]>>("match")` ${[http_result] as any}
            ${[]} -> ${{ kind: "some", value: [{ id: 0, title: "LOlol" }] }}
            ${[{ id: Number, title: String }]} -> ${blogs => ({ kind: "some", value: blogs })}
            ${20} -> ${{ kind: "none" }}
            ${__} -> ${{ kind: "none" }}
        `;

        expect(result).toEqual({ kind: "some", value: [http_result] });
    });

    test("match map patterns", () => {
        const users_map = new Map([
            ["gab", { name: "gabriel" }],
            ["angégé", { name: "angéline" }],
        ]);

        const user_pattern = { name: String };

        const result = Λ("match")` ${users_map as Map<string, { name: string }>}
            concatenate name:

            ${new Map([
                ["angégé", user_pattern],
                ["gab", user_pattern],
            ])} -> ${map => ({ name: map.get("angégé")!.name + " " + map.get("gab")!.name })}

            return name:

            ${new Map([["angégé", user_pattern]])} -> ${map => map.get("angégé")}
            ${new Map([["gab", user_pattern]])} -> ${map => map.get("gab")}
            ${__} -> ${{ name: "unknown" }}
        `;

        expect(result).toEqual({ name: "angéline gabriel" });
    });

    test("match set patterns", () => {
        // prettier-ignore
        const ContainsGabAndYo = (set: Set<string | number>) => Λ<[boolean, boolean]>("match")` ${set}
            ${new Set(["gab", "yo"])} -> ${[true, true]}
            ${new Set(["gab"])} -> ${[true, false]}
            ${new Set(["yo"])} -> ${[false, true]}
            ${__} -> ${[false, false]}
        `;

        expect(ContainsGabAndYo(new Set(["gab", "yo", "hello"]))).toEqual([true, true]);
        expect(ContainsGabAndYo(new Set(["gab", "hello"]))).toEqual([true, false]);
        expect(ContainsGabAndYo(new Set(["yo", "hello"]))).toEqual([false, true]);
        expect(ContainsGabAndYo(new Set(["hello"]))).toEqual([false, false]);
        expect(ContainsGabAndYo(new Set([]))).toEqual([false, false]);
        expect(ContainsGabAndYo(new Set([2]))).toEqual([false, false]);
    });

    test("match tuple patterns", () => {
        const sum = (xs: number[]): number => Λ<number>("match")` ${xs} 
            ${[]} -> ${0}
            ${[Number, Number]} -> ${([x, y]) => x + y}
            ${[Number, Number, Number]} -> ${([x, y, z]) => x + y + z}
            ${[Number, Number, Number, Number]} -> ${([x, y, z, w]) => x + y + z + w}
        `;

        expect(sum([2, 3, 2, 4])).toEqual(11);
    });

    test("match union of tuples", () => {
        type Input = ["+", number, number] | ["*", number, number] | ["-", number] | ["++", number];

        // prettier-ignore
        const result1 = Λ<number>("match")` ${["-", 2]}
        
            ${["+", Number, Number]} -> ${value => {
                const [, x, y] = value;
                return x + y;
            }}

            ${["*", Number, Number]} -> ${value => {
                const [, x, y] = value;
                return x * y;
            }}

            ${["-", Number]} -> ${value => {
                const [, x] = value;
                return -x;
            }}
        `;

        // prettier-ignore
        const result2 = Λ<number>("match")` ${["-", 2] as Input}
            ${["+", __, __]} -> ${value => {
                const [, x, y] = value;
                return x + y;
            }}

            ${["*", __, __]} -> ${value => {
                const [, x, y] = value;
                return x * y;
            }}

            ${["-", __]} -> ${value => {
                const [, x] = value;
                return -x;
            }}
        `;

        expect(result1).toEqual(-2);
        expect(result2).toEqual(-2);
    });

    describe("match heterogenous tuple patterns", () => {
        const tuples: { tuple: [string, number]; expected: string }[] = [
            { tuple: ["coucou", 20], expected: "number match" },
            { tuple: ["hello", 20], expected: "perfect match" },
            { tuple: ["hello", 21], expected: "string match" },
            { tuple: ["azeaze", 17], expected: "not matching" },
        ];

        tuples.forEach(({ tuple, expected }) => {
            it(`should work with ${tuple}`, () => {
                expect(Λ("match")` ${tuple}
                    ${["hello", 20]} -> ${"perfect match"}
                    ${["hello", __]} -> ${"string match"}
                    ${[__, 20]} -> ${"number match"}
                    ${[String, Number]} -> ${"not matching"}
                    ${[__, __]} -> ${"can't happen"}
                    ${__} -> ${"can't happen"}
                `).toEqual(expected);
            });
        });
    });

    test("match tuple of records", () => {
        const init_state: State = {
            status: "idle",
        };

        // prettier-ignore
        const reducer = (state: State, event: Event) => Λ<State>("match")`${[state, event] as [State, Event]}
            ${[__, { type: "fetch" }]} -> ${{ status: "loading" }}
            ${[{ status: "loading" }, { type: "success" }]} -> ${x => ({ status: "success", data: x[1].data })}
            ${[{ status: "loading" }, { type: "error" }]} -> ${x => ({ status: "error", error: x[1].error })}
            ${[{ status: "loading" }, { type: "cancel" }]} -> ${init_state}
            ${__} -> ${state}
        `;

        expect(reducer(init_state, { type: "fetch" })).toEqual({
            status: "loading",
        });

        expect(reducer({ status: "loading" }, { type: "success", data: "yo" })).toEqual({
            status: "success",
            data: "yo",
        });

        expect(reducer({ status: "loading" }, { type: "cancel" })).toEqual({
            status: "idle",
        });
    });
});

describe("unions", () => {
    test("union 1", () => {
        const value: Option<string> = {
            kind: "some",
            value: "hello",
        };

        const result = Λ("match")` ${value as Option<string>} 
            ${{ kind: "some" }} -> ${o => o.value}
            ${{ kind: "none" }} -> ${"no value"}
        `;

        expect(result).toEqual("hello");
    });

    test("union 2", () => {
        type Post = {
            type: "post";
            id: number;
            content: { body: string };
        };
        type Video = { type: "video"; id: number; content: { src: string } };
        type Image = { type: "image"; id: number; content: { src: number } };

        type Input = Post | Video | Image;

        const value: Input = {
            type: "post",
            id: 2,
            content: { body: "yo" },
        };

        const result = Λ("match")` ${value as Input} 
            ${{ type: "post", content: __ }} -> ${1}
            ${{ type: "post", id: 7 }} -> ${1}
            ${{ type: "video", content: { src: String } }} -> ${2}
            ${{ type: "image", content: { src: Number } }} -> ${3}
        `;

        expect(result).toEqual(1);
    });

    test("union 3", () => {
        type Text = { type: "text"; content: string };
        type Img = { type: "img"; src: string };
        type Video = { type: "video"; src: string };
        type Story = {
            type: "story";
            likes: number;
            views: number;
            author: string;
            src: string;
        };
        type Data = Text | Img | Video | Story;

        type Ok<T> = { type: "ok"; data: T };
        type ResError<T> = { type: "error"; error: T };

        type Result<TError, TOk> = Ok<TOk> | ResError<TError>;

        const result: Result<Error, Data> = {
            type: "ok",
            data: { type: "img", src: "hello.com" },
        };

        // prettier-ignore
        const ouput = Λ('match')` ${result as Result<Error, Data>} 
            ${{ type: "ok", data: { type: "text" } }} -> ${res => `<p>${res.data.content}</p>`}
            ${{ type: "ok", data: { type: "img" } }} -> ${res => `<img src="${res.data.src}" />`}
            ${{ type: "ok", data: { type: "story", likes: 10 } }} -> ${res => `<div>story with ${res.data.likes} likes</div>`}
            ${{ type: "error" }} -> ${"<p>Oups! An error occured</p>"}
            ${__} -> ${"<p>everything else</p>"}
        `;

        expect(ouput).toEqual('<img src="hello.com" />');
    });
});

describe("use when", () => {
    test("use inline predicate", () => {
        const values = [
            { value: 1, expected: false },
            { value: -2, expected: false },
            { value: 3, expected: false },
            { value: 100, expected: false },
            { value: 20, expected: true },
            { value: 39, expected: true },
        ];

        values.forEach(({ value, expected }) => {
            const result = Λ<boolean>("match")` ${value}
                ${(x: number) => x > 10 && x < 50} -> ${true}
                ${__} -> ${false}
            `;
            expect(result).toEqual(expected);
        });
    });

    test("use function call", () => {
        const input: unknown = 2;

        const is2 = (value: any) => value === 2;

        const output = Λ("match")` ${input} 
            ${is2(input)} -> ${"number: two"}
            ${(value: any) => value === 3} -> ${"number: 3"}
            ${__} -> ${"something else"}
        `;

        expect(output).toEqual("number: two");
    });

    test("use binary expression", () => {
        const input: unknown = 3;

        const is2 = (value: any) => value === 2;

        const output = Λ("match")` ${input} 
            ${is2(input)} -> ${"number: two"}
            ${input === 3} -> ${"number: 3"}
            ${__} -> ${"something else"}
        `;

        expect(output).toEqual("number: 3");
    });

    test("use logical expression", () => {
        const input: unknown = 3;

        const is2 = (value: any) => value === 2;

        const output = Λ("match")` ${input} 
            ${is2(input)} -> ${"number: two"}
            ${input > 2 && input < 4} -> ${"number: 3"}
            ${__} -> ${"something else"}
        `;

        expect(output).toEqual("number: 3");
    });

    test("use predicate in pattern", () => {
        type Input = { data: { score: number; content: string } };

        const output = Λ("match")` ${{ data: { score: 5, content: "temp" } } as Input} 
            ${{ data: { score: when(score => score === 5) } }} -> ${_ => _.data.content}
            ${{ data: { score: when(score => score < 5) } }} -> ${"bad"}
            ${{ data: { score: when(score => score > 5) } }} -> ${"good"}
        `;

        expect(output).toEqual("temp");
    });
});

describe("nested", () => {
    test("nested dsl", () => {
        const output = Λ("match")` ${1}
            ${1} -> ${x => Λ("match")`${x}
                ${1} -> ${x => x * 2}
            `}
            
            ${2} -> ${x => x * x}
            ${__} -> ${-1}
        `;

        expect(output).toEqual(2);
    });

    test("nested input", () => {
        // prettier-ignore
        expect(
            Λ("match")` ${[[[[{ two: "2", foo: 2, bar: true }]]]]}
                ${[[[[{ foo: __, bar: __ }]]]]} -> ${([[[[{ bar }]]]]) => bar}
            `
        ).toEqual(true);
    });
});

describe("not", () => {
    test("not", () => {
        const get = (x: unknown) => Λ<string>("match")` ${x}
            ${not(Number)} -> ${"not a number"}
            ${not(String)} -> ${"not a string"}
        `;

        expect(get(20)).toEqual("not a string");
        expect(get("hello")).toEqual("not a number");
    });
});

describe("select", () => {
    test("tuple", () => {
        // prettier-ignore
        expect(
            Λ("match")` ${["get", 2]}
                ${["get", use("y")]} -> ${(_, { y }) => y}
        `
        ).toEqual(2);
    });

    test("array", () => {
        // prettier-ignore
        expect(
            Λ('match')` ${['you', 'hello']}
                ${[use('texts')]} -> ${(_, { texts }) => texts}
            `
          ).toEqual(['you', 'hello']);

        // prettier-ignore
        const input = [
            { text: { content: 'you' } },
            { text: { content: 'hello' } },
        ];

        expect(
            Λ("match")` ${input}
              ${[{ text: { content: use("texts") } }]} -> ${(_, { texts }) => texts}
            `
        ).toEqual(["you", "hello"]);
    });

    test("object", () => {
        const input = {
            status: "success",
            data: "some data",
            other: 20,
        };

        expect(
            Λ("match")` ${input}
                ${{ status: "success", data: use("data"), other: use("other") }} 
                    -> ${(_, { data, other }) => data + other.toString()}
            `
        ).toEqual("some data20");
    });
});

type Option<a> = { kind: "none" } | { kind: "some"; value: a };

type Blog = {
    id: number;
    title: string;
};

type State =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: string }
    | { status: "error"; error: Error };

type Event =
    | { type: "fetch" }
    | { type: "success"; data: string; requestTime?: number }
    | { type: "error"; error: Error }
    | { type: "cancel" };
