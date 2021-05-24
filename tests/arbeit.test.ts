import * as core from "../src/core";
// TODO: Change all import of project to this still here.

describe("test arbeit", () => {
    test("topologicalSort", () => {
        const res = core.topologicalSort({ a: ["b", "c"] });
        expect(res).toEqual([["b", "c"], ["a"]]);
    });

    test("simple", () => {
        const graph = new core.Graph();

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

        expect(res).toEqual(-1.5);
        expect(graph.getData("e")).toEqual(-1.5);

        res = graph.calculate({ a: 2, b: 3 });

        expect(res).toEqual(-1.5);
        expect(graph.getData("e")).toEqual(-1.5);
    });
});
