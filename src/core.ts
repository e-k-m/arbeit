import { getIfExists, Input, Output } from "./io";
import { Data } from "./data";
import { SetOperations } from "./utils";

declare global {
    interface Set<T> {
        filter(element: (element: T) => boolean): Set<T>;
    }
}

Set.prototype.filter = function filter(f) {
    const res = new Set();
    for (const v of Array.from(this)) {
        if (f(v)) {
            res.add(v);
        }
    }
    return res;
};

function isObject(obj: unknown): boolean {
    const type = typeof obj;
    return type === "function" || (type === "object" && !!obj);
}

function uuidv4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function topologicalSort(data: { [name: string]: string[] }): string[][] {
    let data_: { [name: string]: Set<string> } = {};

    for (const key in data) {
        data_[key] = new Set(data[key]);
    }

    for (const [key, value] of Object.entries(data_)) {
        data_[key] = value.filter((e) => e != key);
    }

    const dependents = Object.keys(data_);

    const dependecies = Object.values(data_).reduce((r, e) => {
        e.forEach(r.add, r);
        return r;
    }, new Set<string>());

    const extraItemsInDeps = SetOperations.difference(dependecies, new Set(dependents));

    for (const e of Array.from(extraItemsInDeps)) {
        data_[e] = new Set();
    }

    const res: string[][] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const ordered = new Set<string>();
        for (const [item, dep] of Object.entries(data_)) {
            if (dep.size == 0) {
                ordered.add(item);
            }
        }

        if (ordered.size == 0) {
            break;
        }

        res.push(Array.from(ordered).sort());

        const tmp: { [name: string]: Set<string> } = {};
        for (const [item, dep] of Object.entries(data_)) {
            if (!ordered.has(item)) {
                tmp[item] = SetOperations.difference(dep, ordered);
            }
        }

        data_ = tmp;
    }

    if (Object.keys(data_).length !== 0) {
        throw new Error(`A cyclic dependency exists amongst ${data_}`);
    }

    return res;
}

// FIXME
// eslint-disable-next-line @typescript-eslint/ban-types
type Fct = Function;

export class Node {
    private _id: string;
    private _fct: Fct;
    private _inputs: Input[];
    private _outputs: Output[];
    private _args: string[];

    /* TODO
    private _kwargs: string[];
    private _kwargsDefault: { [key: string]: unknown };
    */

    constructor(fct: Fct, inputs: Array<string | Input>, outputs: Array<string | Output>, args: string[] = []) {
        this._id = uuidv4();
        this._fct = fct;
        this._inputs = [];
        this._processInputs(inputs, false);
        this._args = args;
        this._processInputs(args, true);

        /* TODO
        this._kwargs = kwargs;
        this._processInputs(kwargs, false, true);
        this._kwargsDefault = {};
        self._processKwargs(this._kwargs);
        */

        this._outputs = [];
        this._processOutputs(outputs);
    }

    public get id(): string {
        return this._id;
    }

    public get inputNames(): string[] {
        return this._inputs.map((input) => input.name);
    }

    public get inputsWithoutConstants(): Input[] {
        return this._inputs.filter((input) => !input.isConstant);
    }

    public get outputs(): Output[] {
        return this._outputs;
    }

    public get outputNames(): string[] {
        return this._outputs.map((output) => output.name);
    }

    public get fctName(): string {
        return this._fct.name;
    }

    public setValueToInput(inputName: string, value: unknown): void {
        for (const input of this._inputs) {
            if (input.name === inputName) {
                input.value = value;
                return;
            }
        }

        throw Error(`Input ${inputName} does not exist on this node.`);
    }

    public runWithLoadedInputs(): unknown {
        const args = this._inputs.filter((input) => input.isArg || !input.isArg).map((input) => input.value);
        return this._call(args);
    }

    private _call(args: unknown[]): unknown {
        const res = this._fct.apply(null, args);
        if (Array.isArray(res)) {
            for (let i = 0; i < this.outputs.length; i++) {
                this.outputs[i].value = res[i];
            }
        } else {
            this._outputs[0].value = res;
        }
        return res;
    }

    private _processInputs(inputs: Array<string | Input>, isArgs: boolean): void {
        if (inputs === null) {
            // FIXME
        }

        for (const input_ of inputs) {
            let input = null;
            if (input_ instanceof Input) {
                input = input_;
            } else if (typeof input_ === "string") {
                if (isArgs) {
                    input = Input.arg(input_);
                } else {
                    input = new Input(input_);
                }
            } else if (isObject(input_)) {
                const entries = Object.entries(input_);
                if (entries.length !== 1) {
                    throw new Error("Object inputs should have only one property and cannot be empty.");
                }
                const [[key, value]] = entries;
                input = Input.constant(key, value);
            } else {
                throw new Error("Inputs need to be of type Input, string or object");
            }
            this._inputs.push(input);
        }
    }

    private _processOutputs(outputs: Array<string | Output>): void {
        if (outputs === null) {
            // FIXME
        }
        for (const output_ of outputs) {
            let output = null;
            if (output_ instanceof Output) {
                output = output_;
            } else if (typeof output_ === "string") {
                output = new Output(output_);
            } else {
                throw new Error("Outputs need to be type Output or string.");
            }
            this._outputs.push(output);
        }
    }
}

interface RegisterOptions {
    inputs: string[];
    outputs: string[];
    argsNames?: string[];
}

export class Graph {
    private _nodes: { [key: string]: Node };
    private _data: Data | null;
    private _parallel: boolean;
    private _poolSize: number;
    private _sortedDep: string[][] | null;
    private _inputs: { [key: string]: Input } | null;
    private _outputs: { [key: string]: Output } | null;

    constructor(inputs: Input[] | null = null, outputs: Output[] | null = null, parallel = false, poolSize = 2) {
        this._nodes = {};
        this._data = null;
        this._parallel = parallel;
        this._poolSize = poolSize;
        this._sortedDep = null;
        this._inputs =
            inputs === null
                ? null
                : inputs.reduce((acc, e) => {
                      acc[e.name] = e;
                      return acc;
                  }, <{ [key: string]: Input }>{});
        this._outputs =
            outputs === null
                ? null
                : outputs.reduce((acc, e) => {
                      acc[e.name] = e;
                      return acc;
                  }, <{ [key: string]: Output }>{});
    }

    public getData(key: string): unknown {
        if (this._data === null) {
            return null;
        }
        return this._data.get(key);
    }

    public get simInputs(): string[] {
        const inputs: string[] = [];

        for (const node of Object.values(this._nodes)) {
            for (const input of node.inputsWithoutConstants) {
                inputs.push(input.map);
            }
        }

        return inputs;
    }

    public get simOutputs(): string[] {
        const outputs: string[] = [];

        for (const node of Object.values(this._nodes)) {
            for (const input of node.outputs) {
                outputs.push(input.map);
            }
        }

        return outputs;
    }

    public get dag(): Node[][] {
        const orderedNodes: Node[][] = [];
        for (const nodeIDs of topologicalSort(this._dependencies())) {
            const nodes = nodeIDs.map((nodeID) => this._getNode(nodeID));
            orderedNodes.push(nodes);
        }
        return orderedNodes;
    }

    public static runNode(node: Node): [string, unknown] {
        return [node.id, node.runWithLoadedInputs()];
    }

    public register(options: RegisterOptions): (fct: Fct) => Fct {
        const decorator = (fct: Fct) => {
            this._register(fct, options);
            return fct;
        };
        return decorator;
    }

    public calculate(data: { [key: string]: unknown }): unknown {
        this._data = new Data(data);
        this._data.checkInputs(this.simInputs, this.simOutputs);

        if (this._sortedDep === null) {
            this._sortedDep = this._topologicalSort();
        }

        let res: unknown = null;
        for (const items of this._sortedDep) {
            // loading nodes with inputs
            for (const item of items) {
                const node = this._getNode(item);
                const inputs = node.inputsWithoutConstants;
                for (const inp of inputs) {
                    // REVIEW: If this is correct, since diffrent from original!
                    node.setValueToInput(inp.name, this._data.get(inp.map));
                }
            }

            // running nodes
            const results: { [key: string]: unknown } = {};
            for (const item of items) {
                const node = this._getNode(item);
                const res = node.runWithLoadedInputs();
                results[node.id] = res;
            }

            // save results
            for (const item of items) {
                const node = this._getNode(item);
                res = results[node.id];
                if (Array.isArray(res)) {
                    for (let i = 0; i < node.outputs.length; i++) {
                        const out = node.outputs[i];
                        this._data.set(out.map, res[i]);
                    }
                } else {
                    this._data.set(node.outputs[0].map, res);
                }
            }
        }

        return res;
    }

    private _register(fct: Fct, options: RegisterOptions) {
        // FIXME: assert
        this._createNode(fct, options.inputs, options.outputs, options.argsNames);
    }

    private _createNode(fct: Fct, inputs: string[] | Input[], outputs: string[] | Output[], argsName: string[] = []) {
        const inputs_ = getIfExists(inputs, this._inputs);
        const outputs_ = getIfExists(outputs, this._outputs);
        const node = new Node(fct, inputs_, outputs_, argsName);

        for (const n of Object.values(this._nodes)) {
            for (const outName in n.outputNames) {
                if (node.outputNames.includes(outName)) {
                    throw new Error(`${outName} output already exists.`);
                }
            }
        }

        this._nodes[node.id] = node;
    }

    private _dependencies(): { [name: string]: string[] } {
        const dep: { [name: string]: string[] } = {};

        for (const node of Object.values(this._nodes)) {
            let d: string[] = [];
            if (dep[node.id] !== undefined) {
                d = dep[node.id];
            }

            for (const inp of node.inputNames) {
                for (const node2 of Object.values(this._nodes)) {
                    if (node2.outputNames.includes(inp)) {
                        d.push(node2.id);
                    }
                }
            }

            dep[node.id] = d;
        }

        return dep;
    }

    private _getNode(id: string): Node {
        return this._nodes[id];
    }

    private _topologicalSort(): string[][] {
        return topologicalSort(this._dependencies());
    }
}
