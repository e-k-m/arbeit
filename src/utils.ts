export class SetOperations {
    public static difference<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set<T>([...Array.from(a)].filter((e) => !b.has(e)));
    }
}
