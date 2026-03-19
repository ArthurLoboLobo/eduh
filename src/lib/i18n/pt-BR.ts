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
  nav: {
    language: string;
    logout: string;
    dashboard: string;
  };
  dashboard: {
    searchPlaceholder: string;
    createSection: string;
    emptyTitle: string;
    emptyDescription: string;
    topicsCompleted: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    confirm: string;
    cancel: string;
    status: {
      uploading: string;
      planning: string;
      studying: string;
    };
    createModal: {
      title: string;
      nameLabel: string;
      namePlaceholder: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      create: string;
    };
    maxSectionsError: string;
  };
  section: {
    notFound: string;
    loading: string;
    uploadingPlaceholder: string;
    planningPlaceholder: string;
    studyingPlaceholder: string;
  };
  uploading: {
    dropZoneLabel: string;
    dropZoneActive: string;
    fileStatus: {
      uploading: string;
      processing: string;
      processed: string;
      error: string;
    };
    retry: string;
    startPlanning: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    confirm: string;
    cancel: string;
    previewTitle: string;
    noPreview: string;
    errors: {
      INVALID_FILE_TYPE: string;
      FILE_TOO_LARGE: string;
      SIZE_LIMIT_EXCEEDED: string;
      UPLOAD_FAILED: string;
    };
    emptyFiles: string;
  };
  planning: {
    loading: string;
    errorMessage: string;
    errorInterrupted: string;
    retry: string;
    undo: string;
    regenerate: string;
    regenerateGuidancePlaceholder: string;
    regenerateConfirm: string;
    regenerateCancel: string;
    startStudying: string;
    alreadyKnown: string;
    addTopic: string;
    addSubtopic: string;
    newTopicTitle: string;
    newSubtopicText: string;
    saveFailed: string;
    undoFailed: string;
  };
  errors: {
    EMAIL_INVALID: string;
    EMAIL_MISSING: string;
    CODE_MISSING: string;
    CONFIG_ERROR: string;
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
      { title: 'Envie seus materiais', description: 'Provas anteriores, slides, anotações...' },
      { title: 'Receba um plano de estudo', description: 'A IA analisa e cria um plano personalizado' },
      { title: 'Estude com tutoria IA', description: 'Chats por tópico com acesso ao seu material' },
      { title: 'Revise e domine', description: 'Acompanhe seu progresso e tire dúvidas gerais' },
    ],
    emailLabel: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    sendCode: 'Enviar código',
    codeLabel: 'Código de verificação',
    codePlaceholder: '000000',
    verify: 'Verificar',
    resendCode: 'Reenviar código',
    resendIn: 'Reenviar em',
    back: 'Voltar',
    sending: 'Enviando...',
    verifying: 'Verificando...',
  },
  nav: {
    language: 'Idioma',
    logout: 'Sair',
    dashboard: 'Painel',
  },
  dashboard: {
    searchPlaceholder: 'Buscar seções...',
    createSection: 'Criar nova Seção',
    emptyTitle: 'Nenhuma seção criada ainda.',
    emptyDescription: 'Clique em Criar nova Seção para começar.',
    topicsCompleted: 'tópicos completos',
    deleteConfirmTitle: 'Excluir seção',
    deleteConfirmMessage: 'Tem certeza que deseja excluir esta seção? Essa ação não pode ser desfeita.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    status: {
      uploading: 'Enviando',
      planning: 'Planejando',
      studying: 'Estudando',
    },
    createModal: {
      title: 'Criar nova Seção',
      nameLabel: 'Nome',
      namePlaceholder: 'Ex: Cálculo II',
      descriptionLabel: 'Descrição (opcional)',
      descriptionPlaceholder: 'Uma breve descrição da seção',
      create: 'Criar',
    },
    maxSectionsError: 'Você atingiu o limite de 10 seções.',
  },
  section: {
    notFound: 'Seção não encontrada.',
    loading: 'Carregando...',
    uploadingPlaceholder: 'Envio de arquivos',
    planningPlaceholder: 'Planejamento de estudos',
    studyingPlaceholder: 'Estudando',
  },
  uploading: {
    dropZoneLabel: 'Arraste arquivos aqui ou clique para selecionar',
    dropZoneActive: 'Solte os arquivos aqui',
    fileStatus: {
      uploading: 'Enviando',
      processing: 'Processando',
      processed: 'Processado',
      error: 'Erro',
    },
    retry: 'Tentar novamente',
    startPlanning: 'Iniciar Planejamento',
    deleteConfirmTitle: 'Excluir arquivo',
    deleteConfirmMessage: 'Tem certeza que deseja excluir este arquivo?',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    previewTitle: 'Visualizar arquivo',
    noPreview: 'Visualização não disponível para este tipo de arquivo.',
    errors: {
      INVALID_FILE_TYPE: 'Tipo de arquivo não suportado.',
      FILE_TOO_LARGE: 'Arquivo excede o limite de 4 MB.',
      SIZE_LIMIT_EXCEEDED: 'Limite de 10 MB da seção atingido.',
      UPLOAD_FAILED: 'Falha ao enviar o arquivo.',
    },
    emptyFiles: 'Nenhum arquivo enviado ainda.',
  },
  planning: {
    loading: 'Criando seu plano de estudos...',
    errorMessage: 'Erro ao gerar o plano de estudos.',
    errorInterrupted: 'A geração do plano foi interrompida. Volte ao painel e tente novamente.',
    retry: 'Tentar novamente',
    undo: 'Desfazer',
    regenerate: 'Regenerar Plano',
    regenerateGuidancePlaceholder: 'Ex: Focar mais em cálculo',
    regenerateConfirm: 'Regenerar',
    regenerateCancel: 'Cancelar',
    startStudying: 'Começar a Estudar',
    alreadyKnown: 'Já domino',
    addTopic: 'Adicionar tópico',
    addSubtopic: 'Adicionar subtópico',
    newTopicTitle: 'Novo tópico',
    newSubtopicText: 'Novo subtópico',
    saveFailed: 'Falha ao salvar.',
    undoFailed: 'Falha ao desfazer.',
  },
  errors: {
    EMAIL_INVALID: 'E-mail inválido.',
    EMAIL_MISSING: 'Informe seu e-mail.',
    CODE_MISSING: 'Informe o código.',
    CONFIG_ERROR: 'Erro de configuração no servidor.',
    RATE_LIMITED: 'Aguarde antes de enviar outro código.',
    USER_NOT_FOUND: 'Usuário não encontrado.',
    OTP_NOT_FOUND: 'Código não encontrado. Solicite um novo.',
    OTP_EXPIRED: 'Código expirado. Solicite um novo.',
    OTP_MAX_ATTEMPTS: 'Muitas tentativas. Solicite um novo código.',
    OTP_INVALID: 'Código incorreto. Tente novamente.',
    EMAIL_SEND_FAILED: 'Falha ao enviar o e-mail. Tente novamente.',
    UNKNOWN: 'Ocorreu um erro. Tente novamente.',
  },
};

export default ptBR;
