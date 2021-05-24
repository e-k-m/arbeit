class IO {
    private _name: string;
    private _map: string;
    private _value: unknown; // TODO: How to do this without unknown.

    constructor(name: string, map: string | null = null) {
        this._name = name;
        this._map = map ? map : name;
        this._value = null;
    }

    public get name(): string {
        return this._name;
    }

    public get map(): string {
        return this._map;
    }

    public get value(): unknown {
        return this._value;
    }

    public set value(value: unknown) {
        this._value = value;
    }
}

export class Input extends IO {
    public isArg: boolean;
    public isKwarg: boolean;
    public isConstant: boolean;

    constructor(name: string, map: string | null = null) {
        super(name, map);
        this.isArg = false;
        this.isKwarg = false;
        this.isConstant = false;
    }

    static constant(name: string, value: unknown): Input {
        const input = new Input(name);
        input.value = value;
        input.isConstant = true;
        return input;
    }

    static arg(name: string): Input {
        const input = new Input(name);
        input.isArg = true;
        return input;
    }

    static kwarg(name: string): Input {
        const input = new Input(name);
        input.isKwarg = true;
        return input;
    }
}

export class Output extends IO {}

// FIXME: Types. Relationships.
export function getIfExists<T extends IO>(
    provided: string[] | T[],
    existing: { [key: string]: T } | null
): Array<string | T> {
    if (!existing) {
        return provided;
    }

    const res: Array<string | T> = [];
    for (const p of provided) {
        let isIO = false;
        let name: string;
        if (typeof p == "string") {
            name = p;
        } else if (p instanceof Input || p instanceof Output) {
            name = p.name;
            isIO = true;
        } else {
            continue;
        }

        const exist = existing[name];
        if (exist) {
            if (isIO) {
                throw new Error("You cannot use Input / Output in a Node if already defined");
            }
            res.push(exist);
        } else {
            res.push(p);
        }
    }

    return res;
}
