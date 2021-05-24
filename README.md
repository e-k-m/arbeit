# arbeit

![](https://github.com/e-k-m/arbeit/workflows/main/badge.svg)

> lets you execute functions

[Installation](#installation) | [Getting Up And Running](#getting-up-and-running) | [Examples](#examples) | [API](#api) | [See Also](#see-also)

!!! WIP, come back once this is gone !!!

arbeit is a library to define a set of dependent functions, and execute them in order. The main feature are:

-   Define a set of dependent functions,

-   and execute them in order using different strategies.

## Installation

```bash
npm install FIXME
```

## Getting Up and Running

```bash
npm run
```

## Examples

```js
import * as arbeit from "arbeit";

const graph = new arbeit.Graph();

function fnA(a: number, b: number): number {
    return a + b;
}

function fnB(c: number): number {
    return c / 10.0;
}

function fnC(d: number, a: number): number {
    return d - a;
}

graph.register({ inputs: ["a", "b"], outputs: ["c"] })(fnA);
graph.register({ inputs: ["c"], outputs: ["d"] })(fnB);
graph.register({ inputs: ["d", "a"], outputs: ["e"] })(fnC);

let res = graph.calculate({ a: 2, b: 3 });
console.log(res);
// -1.5
```

## API

FIXME

## See Also

FIXME
