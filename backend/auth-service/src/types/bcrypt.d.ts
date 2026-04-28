declare module 'bcrypt' {
  export default bcrypt;
  export function hash(
    data: string,
    saltOrRounds: number | string,
  ): Promise<string>;
}
