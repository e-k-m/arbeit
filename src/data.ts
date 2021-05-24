import { SetOperations } from "./utils";

export class Data {
    private _inputs: { [key: string]: unknown };
    private _outputs: { [key: string]: unknown };

    constructor(inputs: { [key: string]: unknown }) {
        this._inputs = inputs;
        this._outputs = {};
    }

    public get inputs(): { [key: string]: unknown } {
        return this._inputs;
    }

    public get outputs(): { [key: string]: unknown } {
        return this._outputs;
    }

    public get(key: string): unknown | null {
        if (this._inputs[key] !== undefined) {
            return this._inputs[key];
        }
        if (this._outputs[key] !== undefined) {
            return this._outputs[key];
        }
        return null;
    }

    public set(key: string, value: unknown): void {
        this._outputs[key] = value;
    }

    public checkInputs(simInputs: string[], simOutputs: string[]): void {
        const dataInputs = new Set(Object.keys(this.inputs));
        let diff = SetOperations.difference(dataInputs, SetOperations.difference(dataInputs, new Set(simOutputs)));
        if (diff.size) {
            throw new Error(`The following inputs are already in the model: ${Array.from(diff)}`);
        }

        const inputsToProvide = SetOperations.difference(new Set(simInputs), new Set(simOutputs));
        diff = SetOperations.difference(inputsToProvide, dataInputs);

        if (diff.size) {
            throw new Error(`The following inputs are needed ${Array.from(diff)}`);
        }
    }
}
