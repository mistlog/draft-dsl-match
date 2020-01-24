# DSL Match &middot; ![Build Status](https://github.com/mistlog/draft-dsl-match/workflows/build/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/mistlog/draft-dsl-match/badge.svg)](https://coveralls.io/github/mistlog/draft-dsl-match)

DSL Match is used in typedraft to add limited support for pattern match in typescript.

## Usage

In pattern match context, we use arrow function to denote pattern and only arrow function is allowed in a local context.

Currently, only number, string and enum are supported, for example:

```typescript
export function Main(){
    let value: any;
    <TestMatch/>;
}

function TestMatch(value: any) {
    "use match";

    (value: 1) => {
        // statements here
    }
}
```

and the transcribed result would be:

```typescript
export function Main() {
  let value: any;

  if (value === 1) {}
}
```

Arrow function with no argument is used to denote default case:

```typescript
export function Main() {
    let value: any;
    <TestMatch/>;
}

function TestMatch(value: any) {
    "use match";

    (value: 1) => {
        // statements here
    }

    () => {
    }
}
```

```typescript
export function Main() {
  let value: any;

  if (value === 1) {} else {}
}
```

See it in action with typedraft playground: https://mistlog.github.io/typedraft-playground/.

## Roadmap

To support syntax such as:

### instance of

```typescript
class Sample { }

function Test(value: any) {
    "use match";
    (value: Sample) => {

    }
}
```

### or

```typescript
function Test(value: any) {
    "use match";
    (value: "a" | "b") => {

    }
}
```

## License

DSL Match is [MIT licensed](https://github.com/mistlog/draft-dsl-match/blob/master/LICENSE).