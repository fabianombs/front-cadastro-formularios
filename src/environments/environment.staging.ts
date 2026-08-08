// API de homologacao. O nome NAO deriva do IP: quando o homolog for recriado
// com outro IP, muda so o registro A na Vercel — este arquivo continua valendo.
// Substitui o Railway (https://poc-fabiano-production.up.railway.app), que foi
// abandonado ha meses e apontava para um endereco morto.
export const environment = {
  production: false,
  apiUrl: 'https://api-hml.nexventa.com.br',
};
