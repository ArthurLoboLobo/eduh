export interface Translations {
  auth: {
    tagline: string;
    hero: string;
    steps: { title: string; description: string }[];
    emailLabel: string;
    emailPlaceholder: string;
    sendCode: string;
    codeLabel: string;
    codePlaceholder: string;
    verify: string;
    resendCode: string;
    resendIn: string;
    back: string;
    sending: string;
    verifying: string;
  };
  errors: {
    EMAIL_INVALID: string;
    RATE_LIMITED: string;
    USER_NOT_FOUND: string;
    OTP_NOT_FOUND: string;
    OTP_EXPIRED: string;
    OTP_MAX_ATTEMPTS: string;
    OTP_INVALID: string;
    EMAIL_SEND_FAILED: string;
    UNKNOWN: string;
  };
}

const ptBR: Translations = {
  auth: {
    tagline: 'Prepare-se para suas provas com IA',
    hero: 'Transforme seu material de estudo em um plano personalizado com tutoria inteligente.',
    steps: [
      { title: 'Envie seus materiais', description: 'Provas anteriores, slides, anotacoes...' },
      { title: 'Receba um plano de estudo', description: 'A IA analisa e cria um plano personalizado' },
      { title: 'Estude com tutoria IA', description: 'Chats por topico com acesso ao seu material' },
      { title: 'Revise e domine', description: 'Acompanhe seu progresso e tire duvidas gerais' },
    ],
    emailLabel: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    sendCode: 'Enviar codigo',
    codeLabel: 'Codigo de verificacao',
    codePlaceholder: '000000',
    verify: 'Verificar',
    resendCode: 'Reenviar codigo',
    resendIn: 'Reenviar em',
    back: 'Voltar',
    sending: 'Enviando...',
    verifying: 'Verificando...',
  },
  errors: {
    EMAIL_INVALID: 'E-mail invalido.',
    RATE_LIMITED: 'Aguarde antes de enviar outro codigo.',
    USER_NOT_FOUND: 'Usuario nao encontrado.',
    OTP_NOT_FOUND: 'Codigo nao encontrado. Solicite um novo.',
    OTP_EXPIRED: 'Codigo expirado. Solicite um novo.',
    OTP_MAX_ATTEMPTS: 'Muitas tentativas. Solicite um novo codigo.',
    OTP_INVALID: 'Codigo incorreto. Tente novamente.',
    EMAIL_SEND_FAILED: 'Falha ao enviar o e-mail. Tente novamente.',
    UNKNOWN: 'Ocorreu um erro. Tente novamente.',
  },
};

export default ptBR;
