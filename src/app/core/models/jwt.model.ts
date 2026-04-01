// 📌 Representa o payload decodificado do JWT
export interface JwtPayload {
  sub: string;
  userId: number;
  role: string;
  exp: number;
  iat: number;
}
