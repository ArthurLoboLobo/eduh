export interface Translations {
  auth: {
    tagline: string;
    hero: string;
    learnMore: string;
    howItWorksTitle: string;
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
    bonusBadge: string;
    bonusDescription: string;
  };
  nav: {
    language: string;
    logout: string;
    dashboard: string;
    profileMenu: string;
    subscription: string;
  };
  dashboard: {
    title: string;
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
      'loading-planning': string;
      'loading-studying': string;
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
    loadingPlanning: string;
    loadingStudying: string;
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
  studying: {
    title: string;
    progressTitle: string;
    topicsTitle: string;
    progressText: string;
    interactions: string;
    noInteractions: string;
    revision: string;
    revisionDescription: string;
    loading: string;
    errorLoading: string;
    retry: string;
    markComplete: string;
    completed: string;
  };
  chat: {
    loading: string;
    errorLoading: string;
    retry: string;
    inputPlaceholder: string;
    rateLimited: string;
    streamError: string;
    undoError: string;
    cannotUndoSummarized: string;
    undoConfirmTitle: string;
    undoConfirmMessage: string;
    undoConfirmButton: string;
    undoCancelButton: string;
    undo: string;
    searchingMaterials: string;
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
  subscription: {
    usageLimitFree: string;
    subscribeToPro: string;
    freeDegraded: string;
    proDegraded: string;
    usageWarningPro: string;
    usageWarningFreeBest: string;
    usageWarningFreeDegraded: string;
    usageWarningFreeDegradedFinal: string;
    title: string;
    freePlan: string;
    proPlan: string;
    currentPlan: string;
    limitedUsage: string;
    unlimitedUsage: string;
    perMonth: string;
    subscribe: string;
    proUntil: string;
    yourBalance: string;
    confirmationTitle: string;
    useBalance: string;
    confirmSubscription: string;
    payWithPix: string;
    pixInstructions: string;
    payWithinMinutes: string;
    copyCode: string;
    copied: string;
    youAreNowPro: string;
    close: string;
    paymentExpired: string;
    paymentFailed: string;
    choosePlan: string;
    choosePlanSubtitle: string;
    recommended: string;
    walletTitle: string;
    walletSubtitle: string;
    featuresFree: string[];
    featuresPro: string[];
  };
  promotions: {
    title: string;
    universityEmailTitle: string;
    universityEmailDescription: string;
    unknownTitle: string;
    unknownDescription: string;
    creditAmount: string;
    claimed: string;
    claim: string;
    notEligible: string;
    alreadyClaimed: string;
    claimSuccess: string;
    claimError: string;
    loadError: string;
    claimTooltipNavbar: string;
    claimTooltipCard: string;
    claimTooltipSubscribe: string;
  };
}

const ptBR: Translations = {
  auth: {
    tagline: 'Estude menos. Estude melhor. Com IA.',
    hero: 'Transforme seus materiais em um plano de estudos personalizado e guiado por IA.',
    learnMore: 'Entenda como funciona',
    howItWorksTitle: 'Como o Eduh funciona',
    steps: [
      { title: 'Envie Seus Materiais', description: 'O Eduh vai além de um tutor genérico. Envie provas anteriores, slides e anotações, e ele aprenderá exatamente o que você precisa saber.' },
      { title: 'Receba um Plano de Estudos Inteligente', description: 'Nossa IA analisa automaticamente seus documentos e estrutura um plano de estudos personalizado, dividido em tópicos e subtópicos fáceis de assimilar. Edite, reordene e refine o plano antes de começar.' },
      { title: 'Domine Tópicos com IA', description: 'Mergulhe em chats de IA dedicados para cada tópico. Resolva problemas gerados dinamicamente, acompanhe seu progresso e converse com um modelo que se baseia exatamente nos materiais que você enviou.' },
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
    bonusBadge: 'Alunos da USP e Unicamp ganham 1 mês grátis!',
    bonusDescription: 'Basta fazer login com seu e-mail universitário e acessar a página de assinatura para resgatar a oferta.',
  },
  nav: {
    language: 'Idioma',
    logout: 'Sair',
    dashboard: 'Painel',
    profileMenu: 'Menu do perfil',
    subscription: 'Assinatura',
  },
  dashboard: {
    title: 'Suas Seções',
    createSection: 'Nova Seção',
    emptyTitle: 'Nenhuma seção criada ainda.',
    emptyDescription: "Clique em 'Nova Seção' para começar.",
    topicsCompleted: 'tópicos concluídos',
    deleteConfirmTitle: 'Excluir seção',
    deleteConfirmMessage: 'Tem certeza que deseja excluir esta seção? Essa ação não pode ser desfeita.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    status: {
      uploading: 'Enviando',
      planning: 'Planejando',
      studying: 'Estudando',
      'loading-planning': 'Planejando',
      'loading-studying': 'Preparando',
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
    loadingPlanning: 'Criando seu plano de estudos...',
    loadingStudying: 'Preparando sua sessão de estudos...',
    uploadingPlaceholder: 'Envio de arquivos',
    planningPlaceholder: 'Planejamento de estudos',
    studyingPlaceholder: 'Estudando',
  },
  uploading: {
    dropZoneLabel: 'Arraste e solte seus arquivos aqui, ou clique para selecionar os arquivos',
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
    retry: 'Tentar novamente',
    undo: 'Desfazer',
    regenerate: 'Refazer Plano',
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
  studying: {
    title: 'Sessão de Estudos',
    progressTitle: 'Progresso do Curso',
    topicsTitle: 'Tópicos',
    progressText: 'tópicos concluídos',
    interactions: 'mensagens',
    noInteractions: 'Nenhuma mensagem',
    revision: 'Revisão',
    revisionDescription: 'Uma revisão completa e interativa de todos os tópicos',
    loading: 'Carregando tópicos...',
    errorLoading: 'Erro ao carregar tópicos.',
    retry: 'Tentar novamente',
    markComplete: 'Concluir',
    completed: 'Concluído',
  },
  chat: {
    loading: 'Carregando conversa...',
    errorLoading: 'Erro ao carregar conversa.',
    retry: 'Tentar novamente',
    inputPlaceholder: 'Digite sua mensagem...',
    rateLimited: 'Aguarde um momento antes de enviar outra mensagem.',
    streamError: 'Falha ao enviar mensagem. Tente novamente.',
    undoError: 'Não foi possível desfazer.',
    cannotUndoSummarized: 'Esta mensagem não pode mais ser desfeita.',
    undoConfirmTitle: 'Desfazer mensagem?',
    undoConfirmMessage: 'Isso removerá esta e todas as mensagens seguintes. Essa ação não pode ser desfeita.',
    undoConfirmButton: 'Desfazer',
    undoCancelButton: 'Cancelar',
    undo: 'Desfazer',
    searchingMaterials: 'Buscando nos seus materiais',
  },
  errors: {
    EMAIL_INVALID: 'E-mail inválido.',
    EMAIL_MISSING: 'Informe seu e-mail.',
    CODE_MISSING: 'Informe o código.',
    CONFIG_ERROR: 'Ocorreu um erro interno. Por favor, tente novamente mais tarde.',
    RATE_LIMITED: 'Aguarde antes de enviar outro código.',
    USER_NOT_FOUND: 'Usuário não encontrado.',
    OTP_NOT_FOUND: 'Código não encontrado. Solicite um novo.',
    OTP_EXPIRED: 'Código expirado. Solicite um novo.',
    OTP_MAX_ATTEMPTS: 'Você atingiu o limite de tentativas. Por favor, solicite um novo código.',
    OTP_INVALID: 'Código incorreto. Tente novamente.',
    EMAIL_SEND_FAILED: 'Falha ao enviar o e-mail. Tente novamente.',
    UNKNOWN: 'Ocorreu um erro. Tente novamente.',
  },
  subscription: {
    usageLimitFree: 'Você atingiu seu limite diário de uso.',
    subscribeToPro: 'Assinar Pro',
    freeDegraded: 'Você atingiu o limite do modelo principal. Respostas continuarão com qualidade reduzida.',
    proDegraded: 'Você atingiu o limite diário do modelo principal. Respostas continuarão com um modelo mais leve.',
    usageWarningPro: 'Você já usou {percent}% do seu limite diário do modelo principal.',
    usageWarningFreeBest: 'Você já usou {percent}% do seu limite diário do modelo principal.',
    usageWarningFreeDegraded: 'Você já usou {percent}% do seu limite diário restante.',
    usageWarningFreeDegradedFinal: 'Você já usou {percent}% do seu limite diário restante. Após isso, o acesso será bloqueado até amanhã.',
    title: 'Assinatura',
    freePlan: 'Grátis',
    proPlan: 'Pro',
    currentPlan: 'Plano atual',
    limitedUsage: 'Uso diário limitado',
    unlimitedUsage: 'Uso ilimitado',
    perMonth: 'por mês',
    subscribe: 'Assinar',
    proUntil: 'Você é Pro até {date}',
    yourBalance: 'Seu saldo: {amount}',
    confirmationTitle: 'Confirmar assinatura',
    useBalance: 'Usar meu saldo',
    confirmSubscription: 'Confirmar assinatura',
    payWithPix: 'Pagar R${amount} com Pix',
    pixInstructions: 'Escaneie o QR Code ou use o Pix Copia e Cola para pagar',
    payWithinMinutes: 'Pague em até {time}',
    copyCode: 'Copiar código',
    copied: 'Copiado!',
    youAreNowPro: 'Agora você é Pro!',
    close: 'Fechar',
    paymentExpired: 'Pagamento expirado',
    paymentFailed: 'Falha no pagamento. Tente novamente.',
    choosePlan: 'Escolha seu plano',
    choosePlanSubtitle: 'Desbloqueie todo o poder da IA para seus estudos.',
    recommended: 'Recomendado',
    walletTitle: 'Carteira',
    walletSubtitle: 'Use seu saldo para obter desconto na assinatura.',
    featuresFree: [
      'Modelo de IA padrão',
      'Limite conversacional diário',
      'Bloqueio de estudos após atingir o limite',
    ],
    featuresPro: [
      'Melhor modelo de IA disponível',
      'Estudo contínuo e sem interrupções',
      'Sem bloqueio diário (uso ilimitado no modelo base)',
    ],
  },
  promotions: {
    title: 'Bônus',
    universityEmailTitle: 'Estuda na Unicamp ou USP? Ganhe 1 mês grátis!',
    universityEmailDescription: 'Se o seu email de conta for da Unicamp ou USP, resgate R$20 em créditos — o suficiente para um mês inteiro de Pro.',
    unknownTitle: 'Bônus',
    unknownDescription: 'Detalhes indisponíveis.',
    creditAmount: '{amount} em créditos',
    claimed: 'Resgatado',
    claim: 'Resgatar',
    notEligible: 'Seu email não é de uma universidade qualificada.',
    alreadyClaimed: 'Você já resgatou este bônus.',
    claimSuccess: 'Créditos adicionados ao seu saldo!',
    claimError: 'Não foi possível resgatar o bônus. Tente novamente.',
    loadError: 'Não foi possível carregar os bônus.',
    claimTooltipNavbar: 'Você tem um bônus especial disponível! Clique aqui para resgatar.',
    claimTooltipCard: 'Você tem um bônus exclusivo! Resgate aqui.',
    claimTooltipSubscribe: 'Você tem saldo suficiente para assinar o Pro de graça! Assine aqui.',
  },
};

export default ptBR;
