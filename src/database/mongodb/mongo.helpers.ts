export function stripMongoMeta<T>(document: T | null): T | null {
  if (!document) {
    return null;
  }

  const { _id, __v, ...rest } = document as T & {
    _id?: unknown;
    __v?: unknown;
  };
  return rest as T;
}

export function stripMongoMetaArray<T>(documents: T[]): T[] {
  return documents
    .map((document) => stripMongoMeta(document))
    .filter((document): document is T => document !== null);
}
