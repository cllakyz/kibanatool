declare module "rison-node" {
  const rison: {
    encode(value: unknown): string;
    decode(text: string): unknown;
  };
  export default rison;
}
