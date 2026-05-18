import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  History,
  Settings,
  AlertCircle,
  CheckCircle2,
  ArrowUpCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Sun,
  Moon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Palmtree,
  Trash2,
  UserPlus,
  X,
  Loader2,
  BarChart3
} from 'lucide-react';

// Importações nativas do pacote npm do Firebase para compatibilidade completa no ambiente React
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// Configuração do Firebase com suporte dinâmico para variáveis de ambiente ou fallback para o seu projeto
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
    apiKey: "AIzaSyAkcvdM0ejRoG6rBGicdaxYfI0M9ElJPTc",
    authDomain: "gerador-de-escala-9baf0.firebaseapp.com",
    projectId: "gerador-de-escala-9baf0",
    storageBucket: "gerador-de-escala-9baf0.firebasestorage.app",
    messagingSenderId: "935916934856",
    appId: "1:935916934856:web:53949854120c1780c737fd"
  };

// Inicialização dos serviços Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const POSTURAS = [
  { id: 1, nome: 'Veículos Abandonados', categoria: 'Leve', periodo: 'Diurno' },
  { id: 2, nome: 'Feira Livre', categoria: 'Pesado', periodo: 'Diurno' },
  { id: 3, nome: 'Ambulantes', categoria: 'Pesado', periodo: 'Misto' },
  { id: 4, nome: 'Funcionamento após 1h', categoria: 'Pesado', periodo: 'Noturno' },
  { id: 5, nome: 'Atividade (08h às 19h)', categoria: 'Leve', periodo: 'Diurno' },
  { id: 6, nome: 'Atividade (pós 19h)', categoria: 'Médio', periodo: 'Noturno' },
];

const FISCAIS_INICIAIS_SEMENTE = [
  { id: '1', nome: 'Daviceli S. Cirino', rf: '6802796', status: 'Ativo', ordem: 0 },
  { id: '2', nome: 'Lizandra Barros Souza', rf: '7056702', status: 'Ativo', ordem: 1 },
  { id: '3', nome: 'Marcelo Makibara', rf: '7256787', status: 'Ativo', ordem: 2 },
  { id: '4', nome: 'Carlos Alberto Vannucchi Pachá', rf: '7330871', status: 'Ativo', ordem: 3 },
  { id: '5', nome: 'Amanda Melzi Costa', rf: '8982392', status: 'Ativo', ordem: 4 },
  { id: '6', nome: 'Samara Rodrigues de Paula', rf: '9152075', status: 'Ativo', ordem: 5 },
  { id: '7', nome: 'Bia R. Ribeiro', rf: '9387838', status: 'Ativo', ordem: 6 },
  { id: '8', nome: 'Fernanda Mendes dos Santos', rf: '9388753', status: 'Ativo', ordem: 7 },
  { id: '9', nome: 'Felipe Soares Santos', rf: '9389016', status: 'Ativo', ordem: 8 },
  { id: '10', nome: 'Fabíola Ruiz', rf: '9390651', status: 'Ativo', ordem: 9 },
  { id: '11', nome: 'Caroline Barbosa Paliarussi', rf: '9399208', status: 'Ativo', ordem: 10 },
  { id: '12', nome: 'Michell D. Rossi', rf: '9399640', status: 'Ativo', ordem: 11 },
  { id: '13', nome: 'Drailton José de Santana', rf: '9535241', status: 'Ativo', ordem: 12 },
  { id: '14', nome: 'Gabriel Guerrero', rf: '9535501', status: 'Ativo', ordem: 13 },
  { id: '15', nome: 'Giancarlo Soares Ferreira', rf: '9535624', status: 'Ativo', ordem: 14 },
];

export default function App() {
  const [fiscais, setFiscais] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [user, setUser] = useState(null);

  // Loading states
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingFiscais, setLoadingFiscais] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  // Navegação e Controle
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPostura, setSelectedPostura] = useState(POSTURAS[0]);
  const [dataComando, setDataComando] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
  });
  const [horarioComando, setHorarioComando] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [notification, setNotification] = useState(null);

  // Filtros do Histórico
  const [filtroFiscalHistorico, setFiltroFiscalHistorico] = useState('');
  const [filtroPosturaHistorico, setFiltroPosturaHistorico] = useState('');

  // Drag and Drop e Ordenação
  const [sortDirection, setSortDirection] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Form de Novo Fiscal
  const [novoNome, setNovoNome] = useState('');
  const [novoRF, setNovoRF] = useState('');
  const [formErro, setFormErro] = useState('');

  // Botão Desfazer Último Comando (Melhoria 2)
  const [ultimoComandoGravado, setUltimoComandoGravado] = useState(null);
  const [segundosRestantesDesfazer, setSegundosRestantesDesfazer] = useState(0);

  useEffect(() => {
    if (segundosRestantesDesfazer <= 0) return;
    const timer = setTimeout(() => {
      setSegundosRestantesDesfazer(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [segundosRestantesDesfazer]);

  // Estados de Modais Customizados
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, fiscal: null });
  const [resetModal, setResetModal] = useState({ isOpen: false });
  const [addFiscalModalOpen, setAddFiscalModalOpen] = useState(false);

  // Injetar a fonte Plus Jakarta Sans
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Autenticação Silenciosa (MANDATÓRIO REGRA 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro na autenticação Firebase:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Sincronização em tempo real do banco de dados (MANDATÓRIO REGRA 1 & 2)
  useEffect(() => {
    if (!user) return;

    // Coleção Fiscais com o caminho restrito exigido
    const fiscaisCollection = collection(db, 'artifacts', appId, 'public', 'data', 'fiscais');
    // Coleção Histórico com o caminho restrito exigido
    const historicoCollection = collection(db, 'artifacts', appId, 'public', 'data', 'historico');

    // Escuta em tempo real para os Fiscais
    const unsubFiscais = onSnapshot(fiscaisCollection, (snapshot) => {
      const listaFiscais = [];
      snapshot.forEach(doc => {
        listaFiscais.push({ id: doc.id, ...doc.data() });
      });

      // Se o banco estiver vazio no primeiro uso, faz a auto-população semente
      if (listaFiscais.length === 0) {
        popularBancoInicial();
      } else {
        // Ordena por 'ordem' para respeitar a fila manual
        listaFiscais.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        setFiscais(listaFiscais);
      }
      setLoadingFiscais(false);
    }, (error) => {
      console.error("Erro ao escutar fiscais:", error);
      showNotification("Erro na conexão com o Firestore.");
    });

    // Escuta em tempo real para o Histórico (Sem consultas compostas - REGRA 2)
    const unsubHistorico = onSnapshot(historicoCollection, (snapshot) => {
      const listaHistorico = [];
      snapshot.forEach(doc => {
        listaHistorico.push({ id: doc.id, ...doc.data() });
      });
      // Ordenação na memória para evitar índices extras no Firebase
      listaHistorico.sort((a, b) => {
        const diffData = new Date(b.data) - new Date(a.data);
        if (diffData !== 0) return diffData;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
      setHistorico(listaHistorico);
      setLoadingHistorico(false);
    }, (error) => {
      console.error("Erro ao escutar histórico:", error);
    });

    return () => {
      unsubFiscais();
      unsubHistorico();
    };
  }, [user]);

  // Função para povoar o banco na primeira vez
  const popularBancoInicial = async () => {
    try {
      const fiscaisCollection = collection(db, 'artifacts', appId, 'public', 'data', 'fiscais');
      for (const fiscal of FISCAIS_INICIAIS_SEMENTE) {
        const docRef = doc(fiscaisCollection, fiscal.id);
        await setDoc(docRef, {
          nome: fiscal.nome,
          rf: fiscal.rf,
          status: fiscal.status,
          ordem: fiscal.ordem
        });
      }
      showNotification("Banco de dados populado com a lista inicial de fiscais.");
    } catch (error) {
      console.error("Erro ao popular banco inicial:", error);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Função para verificar se o fiscal trabalhou nos últimos 15 dias (descanso obrigatório de 15 dias)
  const checkBloqueioDescanso = (ultimaEscala, dataReferencia = new Date()) => {
    if (!ultimaEscala) return { isBloqueado: false, label: '' };

    let ref;
    if (typeof dataReferencia === 'string' && dataReferencia.includes('-')) {
      // Evita o bug de fuso horário (UTC vs Local) ao forçar meio-dia local
      ref = new Date(`${dataReferencia}T12:00:00`);
    } else {
      ref = new Date(dataReferencia);
    }
    ref.setHours(0, 0, 0, 0);

    // Converte o timestamp para string de data no fuso local antes de comparar
    const dataUltimaStr = new Date(ultimaEscala).toLocaleDateString('en-CA'); // "YYYY-MM-DD" local
    const dataUltima = new Date(`${dataUltimaStr}T12:00:00`); // ancora no meio-dia, sem risco de virar dia
    dataUltima.setHours(0, 0, 0, 0);

    const diffTempo = ref - dataUltima;
    const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));

    if (diffDias >= 0 && diffDias < 15) {
      if (diffDias === 0) return { isBloqueado: true, label: 'Trabalhou Hoje' };
      if (diffDias === 1) return { isBloqueado: true, label: 'Trabalhou Ontem' };
      return { isBloqueado: true, label: `Descanso (${15 - diffDias}d rest.)` };
    }
    return { isBloqueado: false, label: '' };
  };

  // Mapeia o histórico em tempo real para contar quantas vezes cada fiscal fez cada postura
  const estatisticasFiscais = useMemo(() => {
    const stats = {};

    // Inicializa a estrutura para todos os fiscais
    fiscais.forEach(f => {
      const rfStr = String(f.rf).trim();
      stats[rfStr] = {
        totalGeral: 0,
        porPostura: {},
        ultimaEscala: null
      };
      POSTURAS.forEach(p => {
        stats[rfStr].porPostura[p.nome.trim().toLowerCase()] = 0;
      });
    });

    // Processa os dados a partir do histórico recebido do Firestore
    historico.forEach(log => {
      const rfStr = String(log.rf).trim();
      if (stats[rfStr]) {
        stats[rfStr].totalGeral += 1;
        const posturaLog = String(log.postura).trim().toLowerCase();
        if (stats[rfStr].porPostura[posturaLog] !== undefined) {
          stats[rfStr].porPostura[posturaLog] += 1;
        } else {
          stats[rfStr].porPostura[posturaLog] = 1;
        }

        // Extrai o timestamp de forma ultra segura (suporta string ISO e Firestore Timestamp)
        let logTime = null;
        if (log.data) {
          if (typeof log.data.toDate === 'function') {
            logTime = log.data.toDate().getTime();
          } else {
            const parsedDate = new Date(log.data);
            if (!isNaN(parsedDate.getTime())) {
              logTime = parsedDate.getTime();
            }
          }
        }

        if (logTime && (!stats[rfStr].ultimaEscala || logTime > stats[rfStr].ultimaEscala)) {
          stats[rfStr].ultimaEscala = logTime;
        }
      }
    });

    return stats;
  }, [fiscais, historico]);

  // Função pura para retornar a fila ordenada de fiscais para uma postura específica
  const obterFilaPostura = useMemo(() => {
    return (posturaNome, dataReferencia = new Date()) => {
      const activeFiscais = fiscais.filter(f => f.status === 'Ativo');

      // 1. Encontrar o mínimo de realizações desta postura específica entre os fiscais ativos
      const realizacoesList = activeFiscais.map(f => {
        const stats = estatisticasFiscais[String(f.rf).trim()] || { porPostura: {}, totalGeral: 0 };
        return stats.porPostura[posturaNome.trim().toLowerCase()] || 0;
      });
      const minRealizacoes = realizacoesList.length > 0 ? Math.min(...realizacoesList) : 0;

      const listMapeada = activeFiscais
        .map(f => {
          const stats = estatisticasFiscais[String(f.rf).trim()] || { porPostura: {}, totalGeral: 0, ultimaEscala: null };
          const realizacoesDaPostura = stats.porPostura[posturaNome.trim().toLowerCase()] || 0;
          const statusBloqueio = checkBloqueioDescanso(stats.ultimaEscala, dataReferencia);

          const isPostureBlocked = realizacoesDaPostura > minRealizacoes;
          const isQuarentenado = statusBloqueio.isBloqueado;

          // Definição de grupos de prioridade:
          // Grupo 1: Apto (não bloqueado pela Postura) e NÃO quarentenado
          // Grupo 2: Apto mas quarentenado (quarentena é ignorada se todos os elegíveis estiverem nela)
          // Grupo 3: Bloqueado pela Postura (deve aguardar a rotação correspondente)
          let grupo = 1;
          let label = '';

          if (isPostureBlocked) {
            grupo = 3;
            // Calcula quantos fiscais precisam fazer essa postura para alcançar este fiscal
            const fiscaisAtras = activeFiscais.filter(other => {
              const otherStats = estatisticasFiscais[String(other.rf).trim()] || { porPostura: {}, totalGeral: 0 };
              const otherRealizacoes = otherStats.porPostura[posturaNome.trim().toLowerCase()] || 0;
              return otherRealizacoes < realizacoesDaPostura;
            }).length;
            label = `Aguard. ${fiscaisAtras} fisc.`;
          } else if (isQuarentenado) {
            grupo = 2;
            label = statusBloqueio.label;
          }

          return {
            ...f,
            realizacoesDaPostura,
            totalGeral: stats.totalGeral,
            ultimaEscala: stats.ultimaEscala,
            isBloqueado: isPostureBlocked || isQuarentenado,
            isBloqueadoLabel: label,
            grupo
          };
        });

      listMapeada.sort((a, b) => {
        // Ordena pelo grupo de prioridade (1, depois 2, depois 3)
        if (a.grupo !== b.grupo) {
          return a.grupo - b.grupo;
        }
        // Desempate final: ordem estrita da lista mãe manual
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      });

      // Se todos os aptos (grupo !== 3) estão sob quarentena (grupo === 2)
      const aptos = listMapeada.filter(f => f.grupo !== 3);
      const todosEmQuarentena = aptos.length > 0 && aptos.every(f => f.grupo === 2);

      if (todosEmQuarentena && listMapeada.length > 0) {
        // Promove o 1º da fila (desbloqueia visualmente)
        listMapeada[0].isBloqueado = false;
        listMapeada[0].isBloqueadoLabel = '';
      }

      return listMapeada;
    };
  }, [fiscais, estatisticasFiscais]);

  // Cálculo de Indicação de Próximos Fiscais para a postura selecionada (depende da data selecionada)
  const sugerirFiscais = useMemo(() => {
    if (!selectedPostura) return [];
    return obterFilaPostura(selectedPostura.nome, dataComando);
  }, [selectedPostura, obterFilaPostura, dataComando]);

  // O mais indicado é o primeiro fiscal da fila da postura (que já está ordenado por prioridade)
  const fiscalIndicado = useMemo(() => {
    if (sugerirFiscais.length === 0) return null;
    return sugerirFiscais[0];
  }, [sugerirFiscais]);

  // Verifica se todos os fiscais aptos para esta postura estão sob quarentena (grupo === 2)
  const todosAptosEmQuarentena = useMemo(() => {
    const aptos = sugerirFiscais.filter(f => f.grupo !== 3);
    return aptos.length > 0 && aptos.every(f => f.grupo === 2);
  }, [sugerirFiscais]);

  // Confirmação explícita mostrando quem seria o próximo se não fosse a regra (Melhoria 3)
  const justificativaEscala = useMemo(() => {
    if (!fiscalIndicado || !selectedPostura) return null;

    // Fiscais elegíveis para esta postura = grupos 1 e 2 (não bloqueados por postura)
    // Ordenados pela lista mãe manual (campo `ordem`)
    const elegiveisParaPostura = sugerirFiscais
      .filter(f => f.grupo !== 3)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    // O primeiro elegível na ordem da lista mãe é sempre o "próximo natural"
    // Se ele é exatamente o indicado → fluxo natural, sem justificativa
    const primeiroNatural = elegiveisParaPostura[0];
    if (!primeiroNatural || primeiroNatural.id === fiscalIndicado.id) {
      // Caso especial: descanso geral (todos elegíveis em quarentena)
      if (todosAptosEmQuarentena) {
        return `Todos os fiscais aptos estão em descanso. Convocando ${fiscalIndicado.nome} por ser o mais antigo disponível.`;
      }
      // Fluxo completamente normal — sem justificativa
      return null;
    }

    // Se chegou aqui, o indicado NÃO é o primeiro elegível da lista mãe.
    // Isso significa que alguém de grupo 2 (quarentena) foi pulado.
    // Mostra quem foi pulado e por quê.
    return `${primeiroNatural.nome} seria o próximo apto na fila, mas está em período de descanso obrigatório. Convocando ${fiscalIndicado.nome}.`;
  }, [fiscalIndicado, sugerirFiscais, todosAptosEmQuarentena, selectedPostura]);

  // Próximos na fila de prioridade (excluindo o indicado atual)
  const proximosFiscais = useMemo(() => {
    if (sugerirFiscais.length <= 1) return [];
    return sugerirFiscais.slice(1, 4);
  }, [sugerirFiscais]);

  // Filtragem dinâmica do histórico com base nos filtros selecionados pelo usuário
  const historicoFiltrado = useMemo(() => {
    return historico.filter(log => {
      const matchFiscal = !filtroFiscalHistorico || String(log.rf).trim() === filtroFiscalHistorico;
      const matchPostura = !filtroPosturaHistorico || String(log.postura).trim().toLowerCase() === filtroPosturaHistorico.toLowerCase();
      return matchFiscal && matchPostura;
    });
  }, [historico, filtroFiscalHistorico, filtroPosturaHistorico]);

  // Alterar status de férias de volta ao Firebase
  const toggleFerias = async (id, statusAtual) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'fiscais', id);
      await updateDoc(docRef, {
        status: statusAtual === 'Ativo' ? 'Férias' : 'Ativo'
      });
      showNotification("Status de escala atualizado com sucesso.");
    } catch (e) {
      console.error("Erro ao atualizar férias:", e);
    }
  };

  // Confirmar escala e registrar no banco
  const confirmarEscala = async (fiscalId, postura) => {
    if (!user) return;

    // Combinar dataComando (YYYY-MM-DD) e horarioComando (HH:MM)
    const dataObjeto = new Date(`${dataComando}T${horarioComando || '12:00'}:00`);
    const dataIso = dataObjeto.toISOString();

    const fiscalAlvo = fiscais.find(f => f.id === fiscalId);
    if (!fiscalAlvo) return;

    try {
      // Registrar comando no histórico (Removido peso!)
      const historicoColRef = collection(db, 'artifacts', appId, 'public', 'data', 'historico');
      const docRef = await addDoc(historicoColRef, {
        fiscalNome: fiscalAlvo.nome,
        rf: fiscalAlvo.rf,
        postura: String(postura.nome).trim(),
        data: dataIso,
        createdAt: Date.now() // Timestamp para desempate preciso
      });

      // Salva o último comando para a opção de Desfazer e alerta se o desfazer do anterior for cancelado
      if (ultimoComandoGravado && segundosRestantesDesfazer > 0) {
        showNotification(`Desfazer anterior cancelado. Nova escala gravada para ${fiscalAlvo.nome}!`);
      } else {
        showNotification(`Escala de ${fiscalAlvo.nome} confirmada e gravada no banco!`);
      }

      setUltimoComandoGravado({
        id: docRef.id,
        fiscalNome: fiscalAlvo.nome,
        rf: fiscalAlvo.rf,
        postura: postura.nome,
        timestamp: Date.now()
      });
      setSegundosRestantesDesfazer(30);
    } catch (e) {
      console.error("Erro ao gravar escala:", e);
      showNotification("Falha ao gravar no Firebase.");
    }
  };

  // Desfazer Última Escala Confirmada (Melhoria 2)
  const handleDesfazerUltimoComando = async () => {
    if (!ultimoComandoGravado) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'historico', ultimoComandoGravado.id);
      await deleteDoc(docRef);
      showNotification(`Convocação de ${ultimoComandoGravado.fiscalNome} desfeita com sucesso!`);
      setUltimoComandoGravado(null);
      setSegundosRestantesDesfazer(0);
    } catch (e) {
      console.error("Erro ao desfazer comando:", e);
      showNotification("Erro ao desfazer a convocação.");
    }
  };

  // Adicionar um novo Fiscal no banco
  const handleAdicionarFiscal = async (e) => {
    e.preventDefault();
    if (!user) return;
    setFormErro('');

    if (!novoNome.trim() || !novoRF.trim()) {
      setFormErro('Preencha o Nome Completo e o número do RF.');
      return;
    }

    const rfNormalizado = novoRF.trim();
    const rfExiste = fiscais.some(f => String(f.rf).trim() === rfNormalizado);
    if (rfExiste) {
      setFormErro('Já existe um fiscal cadastrado com este RF.');
      return;
    }

    try {
      const fiscaisColRef = collection(db, 'artifacts', appId, 'public', 'data', 'fiscais');
      const novaOrdem = fiscais.length; // Insere no fim da fila atual

      await addDoc(fiscaisColRef, {
        nome: novoNome.trim(),
        rf: novoRF.trim(),
        status: 'Ativo',
        ordem: novaOrdem
      });

      setNovoNome('');
      setNovoRF('');
      setAddFiscalModalOpen(false);
      showNotification("Novo fiscal cadastrado no banco!");
    } catch (e) {
      console.error("Erro ao adicionar fiscal:", e);
      setFormErro("Erro ao cadastrar no banco de dados.");
    }
  };

  // Remover Fiscal do Banco
  const confirmarExclusaoFiscal = async () => {
    const fiscalId = deleteModal.fiscal?.id;
    if (!user || !fiscalId) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'fiscais', fiscalId);
      await deleteDoc(docRef);
      setDeleteModal({ isOpen: false, fiscal: null });
      showNotification("Fiscal removido definitivamente do banco.");
    } catch (e) {
      console.error("Erro ao deletar:", e);
      showNotification("Erro ao excluir do banco de dados.");
    }
  };

  // Limpar histórico e reiniciar todas as datas de escalas
  const confirmarResetTotal = async () => {
    if (!user) return;
    try {
      // Limpa temporariamente o estado local de forma imediata para evitar flashes de UI
      setHistorico([]);

      // Limpa o histórico de comandos
      for (const log of historico) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'historico', log.id);
        await deleteDoc(docRef);
      }

      setResetModal({ isOpen: false });
      showNotification("Histórico limpo e rodízio reiniciado com sucesso!");
    } catch (e) {
      console.error("Erro ao redefinir base:", e);
      showNotification("Falha ao resetar o banco.");
    }
  };

  // Gerenciamento Drag and Drop integrado com o Firestore
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !user) return;

    setSortDirection(null); // Reseta qualquer ordenação estática por pontos

    const listaReordenada = [...fiscais];
    const [itemArrastado] = listaReordenada.splice(draggedIndex, 1);
    listaReordenada.splice(targetIndex, 0, itemArrastado);

    // Ajusta o state local de forma rápida para visualização instantânea
    setFiscais(listaReordenada);
    setDraggedIndex(null);

    // Sincroniza em lote assíncrono as novas posições no banco de dados Firestore
    try {
      for (let i = 0; i < listaReordenada.length; i++) {
        const f = listaReordenada[i];
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'fiscais', f.id);
        await updateDoc(docRef, { ordem: i });
      }
      showNotification("Nova fila de prioridade gravada no banco!");
    } catch (err) {
      console.error("Erro ao reordenar no banco:", err);
    }
  };

  // Filtro Dinâmico de Ordenação por Comandos Realizados
  const handleToggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
      showNotification("Exibição ordenada por menos comandos.");
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
      showNotification("Exibição ordenada por mais comandos.");
    } else {
      setSortDirection(null);
      showNotification("Fila de prioridade manual restaurada.");
    }
  };

  const sortedFiscais = useMemo(() => {
    if (sortDirection === 'asc') {
      return [...fiscais].sort((a, b) => {
        const aCount = estatisticasFiscais[a.rf]?.totalGeral || 0;
        const bCount = estatisticasFiscais[b.rf]?.totalGeral || 0;
        return aCount - bCount;
      });
    }
    if (sortDirection === 'desc') {
      return [...fiscais].sort((a, b) => {
        const aCount = estatisticasFiscais[a.rf]?.totalGeral || 0;
        const bCount = estatisticasFiscais[b.rf]?.totalGeral || 0;
        return bCount - aCount;
      });
    }
    return fiscais;
  }, [fiscais, sortDirection, estatisticasFiscais]);

  // Se a autenticação geral do Firebase ainda não terminou, renderiza tela de loading elegante
  if (authLoading || (user && loadingFiscais && loadingHistorico)) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center gap-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <p className="text-sm font-semibold text-slate-500">Conectando ao Banco de Dados da SP Posturas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#2d3748]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-slate-900 text-white p-5 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl text-slate-950">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl leading-tight tracking-tight">Fiscalização de Posturas</h1>
              <p className="text-xs text-slate-400">Prefeitura de São Paulo • Banco de Dados em Tempo Real</p>
            </div>
          </div>
          <button
            onClick={() => setResetModal({ isOpen: true })}
            className="p-2.5 hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
            title="Reiniciar Sistema"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/80 p-2 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] md:sticky md:top-[76px] md:bottom-auto md:bg-[#f8f9fa] md:border-t-0 md:p-0 md:pt-4 md:px-4 md:shadow-none">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-1 justify-around w-full md:bg-white md:p-1.5 md:rounded-2xl md:border md:border-slate-200/60 md:shadow-xs md:overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Visão geral', icon: TrendingUp },
              { id: 'fiscais', label: 'Fiscais', icon: Users },
              { id: 'escalar', label: 'Gerar escala', icon: Calendar },
              { id: 'historico', label: 'Histórico', icon: History },
              { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2.5 md:px-5 py-1.5 md:py-2.5 rounded-xl text-[9px] md:text-sm font-bold md:font-semibold transition-all whitespace-nowrap flex-1 ${isActive
                    ? 'bg-slate-100 text-slate-800 md:bg-[#f5f3ef] shadow-2xs md:shadow-sm'
                    : 'text-slate-400 md:text-slate-500 hover:text-slate-800 md:hover:bg-slate-50'
                    }`}
                >
                  <tab.icon size={18} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-28 md:pb-24">

        {/* Notification Toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in z-50 border border-slate-800">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-xs font-semibold">{notification}</span>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Fiscais Ativos</p>
                <h3 className="text-3xl font-black text-slate-800">
                  {fiscais.filter(f => f.status === 'Ativo').length}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Prontos para escala</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Em Férias</p>
                <h3 className="text-3xl font-black text-amber-600">
                  {fiscais.filter(f => f.status === 'Férias').length}
                </h3>
                <p className="text-[11px] text-amber-600/80 font-medium mt-1">prioridade ao retornar</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Comandos Registrados</p>
                <h3 className="text-3xl font-black text-slate-800">{historico.length}</h3>
                <p className="text-[11px] text-slate-400 mt-1">Total acumulado</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Média de Serviços</p>
                <h3 className="text-3xl font-black text-blue-600">
                  {fiscais.length > 0
                    ? (historico.length / fiscais.length).toFixed(1)
                    : 0
                  }
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Comandos por fiscal</p>
              </div>
            </div>

            {/* Posturas Cadastradas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider mb-4">Posturas Cadastradas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POSTURAS.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{p.nome}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{p.periodo} • {p.categoria}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visualização de 6 Listas de Rodízio por Tipo de Postura */}
            <div className="space-y-4">
              <h2 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" />
                Filas de Rodízio por Tipo de Postura (Descanso Obrigatório de 15 Dias)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {POSTURAS.map(p => {
                  const fila = obterFilaPostura(p.nome, dataComando);
                  return (
                    <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-slate-200">
                      <div className="p-4 bg-slate-900 text-white flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-xs leading-snug tracking-tight mb-1">{p.nome}</h3>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{p.periodo} • {p.categoria}</span>
                        </div>
                      </div>
                      <div className="p-3 divide-y divide-slate-100 flex-1 bg-slate-50/20">
                        {fila.slice(0, 5).map((f, idx) => (
                          <div key={f.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] ${f.isBloqueado ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-800'}`}>
                                {idx + 1}º
                              </span>
                              <div>
                                <span className={`font-bold ${f.isBloqueado ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{f.nome}</span>
                                {f.isBloqueado && (
                                  <span className="ml-1.5 px-1 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[8px] uppercase tracking-wider">
                                    {f.isBloqueadoLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {fila.length === 0 && (
                          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                            Nenhum fiscal ativo disponível
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FISCAIS TAB */}
        {activeTab === 'fiscais' && (
          <div className="space-y-6">



            {/* Lista com Tabela */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
                  <Users size={18} className="text-amber-500" />
                  Corpo de Fiscais e Escalas
                </h2>
                {sortDirection && (
                  <button
                    onClick={() => setSortDirection(null)}
                    className="text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded-md font-bold uppercase transition-all"
                  >
                    Restaurar Fila Manual
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100">
                      <th className="px-5 py-4 w-12 text-center">Mover</th>
                      <th className="px-5 py-4">Fiscal / RF</th>

                      <th
                        className="px-5 py-4 cursor-pointer select-none hover:bg-slate-50/80 transition-colors group"
                        onClick={handleToggleSort}
                      >
                        <div className="flex items-center gap-2">
                          <span>Comandos Realizados</span>
                          <span className="text-slate-400 group-hover:text-slate-800 transition-colors">
                            {sortDirection === 'asc' && <ArrowUp size={14} className="text-amber-600" />}
                            {sortDirection === 'desc' && <ArrowDown size={14} className="text-amber-600" />}
                            {!sortDirection && <ArrowUpDown size={14} />}
                          </span>
                        </div>
                      </th>

                      <th className="px-5 py-4">Status Atual</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedFiscais.map((fiscal, index) => {
                      const isDragging = draggedIndex === index;

                      return (
                        <tr
                          key={fiscal.id}
                          draggable={!sortDirection}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`hover:bg-slate-50/50 transition-colors group ${isDragging ? 'opacity-40 bg-slate-50' : ''
                            }`}
                        >
                          {/* Arrastar */}
                          <td className="px-5 py-4 text-center">
                            <div
                              className={`flex justify-center items-center ${sortDirection
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing'
                                }`}
                            >
                              <GripVertical size={16} />
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-sm text-slate-800">{fiscal.nome}</div>
                            <div className="text-xs text-slate-400">RF {fiscal.rf}</div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-extrabold text-slate-800 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                              {estatisticasFiscais[String(fiscal.rf).trim()]?.totalGeral || 0} <span className="text-[10px] text-slate-400 font-semibold">comandos</span>
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${fiscal.status === 'Ativo'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                              {fiscal.status === 'Ativo' ? (
                                <>Apto para Comando</>
                              ) : (
                                <><Palmtree size={10} /> Em Férias</>
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toggleFerias(fiscal.id, fiscal.status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${fiscal.status === 'Ativo'
                                  ? 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-100 border border-transparent'
                                  : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                  }`}
                              >
                                {fiscal.status === 'Ativo' ? 'Férias' : 'Ativar'}
                              </button>

                              <button
                                onClick={() => setDeleteModal({ isOpen: true, fiscal })}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remover fiscal"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ESCALAR TAB */}
        {activeTab === 'escalar' && (
          <div className="space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="font-extrabold text-base mb-5 flex items-center gap-2 text-slate-800">
                <Calendar size={18} className="text-amber-500" />
                Planejar Novo Comando
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Data do Comando</label>
                      <input
                        type="date"
                        value={dataComando}
                        onChange={(e) => setDataComando(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Horário de Início</label>
                      <input
                        type="time"
                        value={horarioComando}
                        onChange={(e) => setHorarioComando(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">1. Escolha a Postura a Realizar</label>
                  <div className="grid grid-cols-1 gap-2">
                    {POSTURAS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPostura(p)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all flex justify-between items-center ${selectedPostura.id === p.id
                          ? 'border-amber-500 bg-amber-50/40 ring-4 ring-amber-100/50'
                          : 'border-slate-100 hover:border-slate-300'
                          }`}
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-800">{p.nome}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] bg-white border px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">{p.categoria}</span>
                            <span className="text-[9px] flex items-center gap-1 text-slate-400 font-semibold">
                              {p.periodo === 'Diurno' ? <Sun size={10} /> : <Moon size={10} />}
                              {p.periodo}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">2. Indicação de Escala Justa</label>
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <ArrowUpCircle size={120} />
                    </div>

                    {fiscalIndicado ? (
                      <div className="relative z-10">
                        {todosAptosEmQuarentena ? (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3.5 rounded-xl mb-4 text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-400 shrink-0" />
                            <span>⚠️ Descanso Geral: Todos os fiscais aptos trabalharam nos últimos 15 dias! Sugerindo o mais antigo.</span>
                          </div>
                        ) : (
                          <p className="text-amber-400 text-[10px] font-bold uppercase mb-4 flex items-center gap-1.5 tracking-wider">
                            <AlertCircle size={13} /> Fiscal mais indicado para {selectedPostura.nome}
                          </p>
                        )}
                        <h3 className="text-2xl font-extrabold tracking-tight mb-1">{fiscalIndicado.nome}</h3>
                        <p className="text-slate-400 text-xs mb-4">
                          RF {fiscalIndicado.rf} • Total de comandos: {fiscalIndicado.totalGeral}
                        </p>

                        {justificativaEscala && (
                          <div className="mb-6 p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-[11px] text-amber-200/90 leading-relaxed font-medium">
                            <span className="font-bold text-amber-400">💡 Informação da Fila:</span> {justificativaEscala}
                          </div>
                        )}

                        <div className="space-y-3">
                          <button
                            onClick={() => confirmarEscala(fiscalIndicado.id, selectedPostura)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-sm uppercase tracking-wider"
                          >
                            CONFIRMAR CONVOCAÇÃO
                          </button>

                          <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                            Ao confirmar, o fiscal irá para o final da fila desta postura e entrará em descanso obrigatório nos próximos 15 dias.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        Não há fiscais ativos disponíveis para escalação.
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Próximos Fiscais na Fila de Prioridade ({selectedPostura.nome})</p>
                    <div className="space-y-2">
                      {proximosFiscais.map((f, i) => (
                        <div key={f.id} className={`flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-xs transition-all ${f.isBloqueado ? 'bg-slate-50/60 opacity-60' : ''}`}>
                          <span className="text-xs font-semibold flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">{i + 2}º</span>
                            <span className={f.isBloqueado ? 'text-slate-400 line-through' : 'text-slate-700'}>{f.nome}</span>
                            {f.isBloqueado && (
                              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[8px] uppercase tracking-wider scale-95">
                                {f.isBloqueadoLabel}
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] bg-slate-50 px-2.5 py-1 rounded border border-slate-200/80 text-slate-500 font-extrabold shadow-2xs">
                            {f.totalGeral} com.
                          </span>
                        </div>
                      ))}
                      {proximosFiscais.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 font-semibold">
                          Fim da fila de rodízio
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORICO TAB */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
                  <History size={18} className="text-amber-500" />
                  Registro de Comandos Realizados
                </h2>
              </div>

              {/* Filtros de Histórico */}
              {historico.length > 0 && (
                <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Filtrar por Fiscal</label>
                    <select
                      value={filtroFiscalHistorico}
                      onChange={(e) => setFiltroFiscalHistorico(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="">Todos os Fiscais</option>
                      {[...fiscais]
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .map(f => (
                          <option key={f.id} value={String(f.rf).trim()}>{f.nome} (RF {f.rf})</option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Filtrar por Postura</label>
                    <select
                      value={filtroPosturaHistorico}
                      onChange={(e) => setFiltroPosturaHistorico(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="">Todas as Posturas</option>
                      {POSTURAS.map(p => (
                        <option key={p.id} value={p.nome}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {historico.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-10" />
                  <p className="text-sm font-semibold">Nenhum comando registrado ainda no banco.</p>
                </div>
              ) : historicoFiltrado.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 opacity-60" />
                  <p className="text-sm font-semibold">Nenhum registro encontrado para os filtros selecionados.</p>
                  <button
                    onClick={() => {
                      setFiltroFiscalHistorico('');
                      setFiltroPosturaHistorico('');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historicoFiltrado.map(log => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/30">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[11px] sm:text-sm text-slate-800 truncate">{log.fiscalNome}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider truncate mt-0.5">{log.postura}</p>
                      </div>
                      <div className="shrink-0 text-right bg-slate-50 border border-slate-100 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-700">
                          {new Date(log.data).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">
                          às {new Date(log.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ESTATISTICAS TAB */}
        {activeTab === 'estatisticas' && (
          <div className="space-y-6">
            {/* Cabeçalho Premium */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <BarChart3 className="text-amber-500" size={22} />
                  Quadro de Produtividade dos Fiscais
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Acompanhe a quantidade total de convocações por postura e a data do último comando de cada fiscal em tempo real.</p>
              </div>
            </div>

            {/* Grid de Cards dos Fiscais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fiscais.map(f => {
                const stats = estatisticasFiscais[String(f.rf).trim()] || { porPostura: {}, totalGeral: 0, ultimaEscala: null };
                const formattedUltima = stats.ultimaEscala
                  ? `${new Date(stats.ultimaEscala).toLocaleDateString('pt-BR')} às ${new Date(stats.ultimaEscala).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Nenhum comando registrado';

                return (
                  <div key={f.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:border-slate-200/80 group">
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-extrabold text-sm text-slate-700">
                            {f.nome ? f.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'SP'}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-amber-600 transition-colors leading-tight">{f.nome}</h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RF {f.rf}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${f.status === 'Ativo'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                          {f.status === 'Ativo' ? 'Apto' : 'Férias'}
                        </span>
                      </div>

                      {/* Quadro Geral de Última Escala */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-4 flex items-center gap-2.5">
                        <Clock size={14} className={stats.ultimaEscala ? 'text-amber-500' : 'text-slate-400'} />
                        <div className="min-w-0">
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase leading-none mb-1">Último Comando Realizado</p>
                          <p className="text-xs font-bold text-slate-700 truncate">{formattedUltima}</p>
                        </div>
                      </div>

                      {/* Lista de Posturas */}
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2.5">Comandos por Postura</p>
                        {POSTURAS.map(p => {
                          const count = stats.porPostura[p.nome.trim().toLowerCase()] || 0;
                          return (
                            <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-slate-100/50 last:border-b-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${p.periodo === 'Diurno' ? 'bg-emerald-400' : p.periodo === 'Noturno' ? 'bg-indigo-400' : 'bg-amber-400'
                                  }`} />
                                <span className="text-[11px] font-bold text-slate-600 truncate">{p.nome}</span>
                              </div>
                              <span className="text-[11px] font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">
                                {count}x
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badge do Total de Comandos */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total de Convocações</span>
                      <span className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg shadow-2xs">
                        {stats.totalGeral} comandos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* MODAL CUSTOMIZADO: CONFIRMAR EXCLUSÃO DE FISCAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <AlertCircle className="text-red-500" size={20} />
                Confirmar Exclusão
              </h3>
              <button
                onClick={() => setDeleteModal({ isOpen: false, fiscal: null })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Você tem certeza que deseja excluir o fiscal <strong className="text-slate-800">{deleteModal.fiscal?.nome}</strong> (RF: {deleteModal.fiscal?.rf}) do sistema? Essa ação não poderá ser desfeita.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, fiscal: null })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusaoFiscal}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-red-100"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CUSTOMIZADO: REINICIAR SISTEMA */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Settings className="text-amber-500 animate-spin-slow" size={20} />
                Zerar Sistema de Escalas
              </h3>
              <button
                onClick={() => setResetModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Deseja zerar todas as pontuações dos fiscais atuais e limpar permanentemente o histórico de comandos? Isso irá reiniciar o ciclo de justiça.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResetModal({ isOpen: false })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarResetTotal}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                Confirmar Reinício
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante (FAB) para Cadastrar Novo Fiscal */}
      {activeTab === 'fiscais' && (
        <button
          onClick={() => {
            setFormErro('');
            setNovoNome('');
            setNovoRF('');
            setAddFiscalModalOpen(true);
          }}
          className="fixed bottom-14 right-6 z-40 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-5 py-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 border border-amber-400 group"
          title="Cadastrar Novo Fiscal"
        >
          <UserPlus size={20} className="transition-transform group-hover:rotate-6" />
          <span className="text-xs uppercase tracking-wider font-black hidden md:inline">Cadastrar Fiscal</span>
        </button>
      )}

      {/* MODAL POPUP: CADASTRAR NOVO FISCAL */}
      {addFiscalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-5">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <UserPlus className="text-amber-500" size={20} />
                Cadastrar Novo Fiscal
              </h3>
              <button
                onClick={() => setAddFiscalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdicionarFiscal} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Carlos Alberto"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-sm font-semibold transition-all bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Registro Funcional (RF)</label>
                <input
                  type="text"
                  value={novoRF}
                  onChange={(e) => setNovoRF(e.target.value)}
                  placeholder="Ex: 7330871"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-sm font-semibold transition-all bg-slate-50"
                  required
                />
              </div>

              {formErro && (
                <p className="text-red-500 text-xs font-semibold mt-2 flex items-center gap-1">
                  <AlertCircle size={14} className="shrink-0" /> {formErro}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setAddFiscalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Adicionar Fiscal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast flutuante de Desfazer Último Comando (Melhoria 2) */}
      {ultimoComandoGravado && segundosRestantesDesfazer > 0 && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:bottom-8 md:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 z-50 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-black shrink-0">
              {segundosRestantesDesfazer}s
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Última Convocação</p>
              <p className="text-xs font-semibold text-slate-200 truncate">{ultimoComandoGravado.fiscalNome}</p>
              <p className="text-[9px] text-slate-400 truncate">{ultimoComandoGravado.postura}</p>
            </div>
          </div>
          <button
            onClick={handleDesfazerUltimoComando}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shrink-0 cursor-pointer"
          >
            Desfazer
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white border-t p-3 text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest z-40">
        Escalador Justo de Posturas • Prefeitura de São Paulo
      </footer>
    </div>
  );
}