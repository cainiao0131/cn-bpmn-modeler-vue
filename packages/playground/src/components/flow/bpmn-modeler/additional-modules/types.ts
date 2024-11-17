export type EventType = Record<string, string>;
export type ShapeType = Record<string, string>;
export type ElementType = Record<string, string>;
export type TranslateType = (str: string) => string;
export type ElementFactoryType = { createShape: (param: { type: string }) => ShapeType };
export type CreateType = {
  start: (event: EventType, shape: ShapeType, element?: ElementType) => void;
};
