export const environment = {
  production: false,
  /**
   * Em desenvolvimento, o hostname é resolvido dinamicamente em tempo de execução.
   * - Acessado via localhost → aponta para http://localhost:8080
   * - Acessado via IP da rede (ex: 192.168.1.10:4200) → aponta para http://192.168.1.10:8080
   * Isso permite compartilhar o link com outros dispositivos na mesma rede sem alterar configs.
   */
  get apiUrl(): string {
    return `http://${window.location.hostname}:8080`;
  },
};
