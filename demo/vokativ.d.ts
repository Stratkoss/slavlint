declare module "vokativ" {
  const pkg: {
    vokativ(name: string, woman?: boolean | null, lastName?: boolean | null): string;
    isWoman(name: string): boolean;
  };
  export default pkg;
}
