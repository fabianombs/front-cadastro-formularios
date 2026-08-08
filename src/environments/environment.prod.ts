// API de PRODUCAO. Migrado de https://100-30-35-83.sslip.io em 08/08/2026,
// junto com a virada de maquina (FABIANO-47).
//
// Por que o nome novo: o sslip.io deriva do proprio IP — trocar de Elastic IP
// obriga a trocar o dominio, o certificado e este arquivo, tudo junto. Com
// api.nexventa.com.br, uma troca de IP e so um registro A na Vercel.
//
// O sslip.io continua respondendo por enquanto, de proposito: e o alvo da sonda
// blackbox e a rede de seguranca se este endereco der problema.
export const environment = {
  production: true,
  apiUrl: 'https://api.nexventa.com.br',
};
