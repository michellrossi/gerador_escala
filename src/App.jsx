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
  Loader2
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
  { id: 1, nome: 'Veículos Abandonados', peso: 1, categoria: 'Leve', periodo: 'Diurno' },
  { id: 2, nome: 'Feira Livre', peso: 3, categoria: 'Pesado', periodo: 'Diurno' },
  { id: 3, nome: 'Ambulantes', peso: 3, categoria: 'Pesado', periodo: 'Misto' },
  { id: 4, nome: 'Funcionamento após 1h', peso: 3, categoria: 'Pesado', periodo: 'Noturno' },
  { id: 5, nome: 'Atividade (08h às 19h)', peso: 1, categoria: 'Leve', periodo: 'Diurno' },
  { id: 6, nome: 'Atividade (pós 19h)', peso: 2, categoria: 'Médio', periodo: 'Noturno' },
];

const FISCAIS_INICIAIS_SEMENTE = [
  { id: '1', nome: 'Daviceli S. Cirino', rf: '6802796', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 0 },
  { id: '2', nome: 'Lizandra Barros Souza', rf: '7056702', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 1 },
  { id: '3', nome: 'Marcelo Makibara', rf: '7256787', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 2 },
  { id: '4', nome: 'Carlos Alberto Vannucchi Pachá', rf: '7330871', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 3 },
  { id: '5', nome: 'Amanda Melzi Costa', rf: '8982392', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 4 },
  { id: '6', nome: 'Samara Rodrigues de Paula', rf: '9152075', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 5 },
  { id: '7', nome: 'Bia R. Ribeiro', rf: '9387838', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 6 },
  { id: '8', nome: 'Fernanda Mendes dos Santos', rf: '9388753', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 7 },
  { id: '9', nome: 'Felipe Soares Santos', rf: '9389016', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 8 },
  { id: '10', nome: 'Fabíola Ruiz', rf: '9390651', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 9 },
  { id: '11', nome: 'Caroline Barbosa Paliarussi', rf: '9399208', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 10 },
  { id: '12', nome: 'Michell D. Rossi', rf: '9399640', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 11 },
  { id: '13', nome: 'Drailton José de Santana', rf: '9535241', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 12 },
  { id: '14', nome: 'Gabriel Guerrero', rf: '9535501', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 13 },
  { id: '15', nome: 'Giancarlo Soares Ferreira', rf: '9535624', pontos: 0, status: 'Ativo', ultimaEscala: null, ordem: 14 },
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
  const [notification, setNotification] = useState(null);

  // Drag and Drop e Ordenação
  const [sortDirection, setSortDirection] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Form de Novo Fiscal
  const [novoNome, setNovoNome] = useState('');
  const [novoRF, setNovoRF] = useState('');
  const [formErro, setFormErro] = useState('');

  // Estados de Modais Customizados
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, fiscal: null });
  const [resetModal, setResetModal] = useState({ isOpen: false });

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
      listaHistorico.sort((a, b) => new Date(b.data) - new Date(a.data));
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
          pontos: fiscal.pontos,
          status: fiscal.status,
          ultimaEscala: fiscal.ultimaEscala,
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

  // Cálculo de Indicação de Próximos Fiscais (Algoritmo de Fila de Justiça)
  const sugerirFiscais = useMemo(() => {
    return [...fiscais]
      .filter(f => f.status === 'Ativo')
      .sort((a, b) => {
        // Prioridade 1: Menor pontuação acumulada (Quem fez menos)
        if (a.pontos !== b.pontos) return a.pontos - b.pontos;
        // Prioridade 2: Quem está parado a mais tempo na escala temporal
        return (a.ultimaEscala || 0) - (b.ultimaEscala || 0);
      });
  }, [fiscais]);

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
    const dataIso = new Date().toISOString();
    const fiscalAlvo = fiscais.find(f => f.id === fiscalId);

    if (!fiscalAlvo) return;

    try {
      // 1. Atualizar pontuação e data da última escala no fiscal
      const fiscalDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'fiscais', fiscalId);
      await updateDoc(fiscalDocRef, {
        pontos: fiscalAlvo.pontos + postura.peso,
        ultimaEscala: Date.now()
      });

      // 2. Registrar comando no histórico
      const historicoColRef = collection(db, 'artifacts', appId, 'public', 'data', 'historico');
      await addDoc(historicoColRef, {
        fiscalNome: fiscalAlvo.nome,
        rf: fiscalAlvo.rf,
        postura: postura.nome,
        peso: postura.peso,
        data: dataIso
      });

      showNotification(`Escala de ${fiscalAlvo.nome} confirmada e gravada no banco!`);
    } catch (e) {
      console.error("Erro ao gravar escala:", e);
      showNotification("Falha ao gravar no Firebase.");
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

    try {
      const fiscaisColRef = collection(db, 'artifacts', appId, 'public', 'data', 'fiscais');
      const novaOrdem = fiscais.length; // Insere no fim da fila atual

      await addDoc(fiscaisColRef, {
        nome: novoNome.trim(),
        rf: novoRF.trim(),
        pontos: 0,
        status: 'Ativo',
        ultimaEscala: null,
        ordem: novaOrdem
      });

      setNovoNome('');
      setNovoRF('');
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

  // Limpar histórico e reiniciar todas as pontuações para zero
  const confirmarResetTotal = async () => {
    if (!user) return;
    try {
      // 1. Zera os pontos de cada um dos fiscais ativos no banco
      for (const f of fiscais) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'fiscais', f.id);
        await updateDoc(docRef, {
          pontos: 0,
          ultimaEscala: null
        });
      }

      // 2. Limpa o histórico de comandos
      for (const log of historico) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'historico', log.id);
        await deleteDoc(docRef);
      }

      setResetModal({ isOpen: false });
      showNotification("Histórico limpo e todas as pontuações zeradas!");
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

  // Filtro Dinâmico de Ordenação de Pontuação
  const handleToggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
      showNotification("Exibição ordenada por pontuação crescente.");
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
      showNotification("Exibição ordenada por pontuação decrescente.");
    } else {
      setSortDirection(null);
      showNotification("Fila de prioridade manual restaurada.");
    }
  };

  const sortedFiscais = useMemo(() => {
    if (sortDirection === 'asc') {
      return [...fiscais].sort((a, b) => a.pontos - b.pontos);
    }
    if (sortDirection === 'desc') {
      return [...fiscais].sort((a, b) => b.pontos - a.pontos);
    }
    return fiscais;
  }, [fiscais, sortDirection]);

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
      <div className="bg-[#f8f9fa] pt-4 px-4 sticky top-[76px] z-40">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Visão geral', icon: TrendingUp },
              { id: 'fiscais', label: 'Fiscais', icon: Users },
              { id: 'escalar', label: 'Gerar escala', icon: Calendar },
              { id: 'historico', label: 'Histórico', icon: History },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 ${
                    isActive 
                      ? 'bg-[#f5f3ef] text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={16} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-24">
        
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
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Média da Equipe</p>
                <h3 className="text-3xl font-black text-blue-600">
                  {fiscais.length > 0 
                    ? (fiscais.reduce((acc, curr) => acc + (curr.pontos || 0), 0) / fiscais.length).toFixed(1)
                    : 0
                  }
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Pontos por fiscal</p>
              </div>
            </div>

            {/* Posturas e Pesos List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider mb-4">Posturas e Pesos Definidos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POSTURAS.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">{p.nome}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{p.periodo} • {p.categoria}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Peso</span>
                      <span className="text-sm font-extrabold text-slate-800">{p.peso}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking de Equilíbrio */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-500" />
                  Ranking de Equilíbrio de Pontos
                </h2>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Menos pontos = Mais prioridade</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[...fiscais].sort((a, b) => b.pontos - a.pontos).map((fiscal, idx) => (
                  <div key={fiscal.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}º
                      </span>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{fiscal.nome}</p>
                        <p className="text-xs text-slate-400">RF {fiscal.rf} • {fiscal.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-extrabold text-slate-800">{fiscal.pontos}</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">pontos</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FISCAIS TAB */}
        {activeTab === 'fiscais' && (
          <div className="space-y-6">
            
            {/* Formulário de Novo Fiscal */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-amber-500" />
                Cadastrar Novo Fiscal de Posturas
              </h3>
              
              <form onSubmit={handleAdicionarFiscal} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Carlos Pachá"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-sm font-medium transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Registro Funcional (RF)</label>
                  <input 
                    type="text" 
                    value={novoRF}
                    onChange={(e) => setNovoRF(e.target.value)}
                    placeholder="Ex: 7330871"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-sm font-medium transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={15} />
                  Adicionar Fiscal
                </button>
              </form>

              {formErro && (
                <p className="text-red-500 text-xs font-semibold mt-3 flex items-center gap-1">
                  <AlertCircle size={14} /> {formErro}
                </p>
              )}
            </div>

            {/* Dica */}
            <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Instruções de Organização</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Para reordenar a fila manualmente, clique no ícone <GripVertical className="inline text-amber-600" size={14} /> e arraste o fiscal. Para ordenar estaticamente por pontos, clique no título <strong>"Pontuação Acumulada"</strong>.
                </p>
              </div>
            </div>

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
                          <span>Pontuação Acumulada</span>
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
                          className={`hover:bg-slate-50/50 transition-colors group ${
                            isDragging ? 'opacity-40 bg-slate-50' : ''
                          }`}
                        >
                          {/* Arrastar */}
                          <td className="px-5 py-4 text-center">
                            <div 
                              className={`flex justify-center items-center ${
                                sortDirection 
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
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-extrabold text-slate-800 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                {fiscal.pontos} <span className="text-[10px] text-slate-400 font-semibold">pts</span>
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              fiscal.status === 'Ativo' 
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  fiscal.status === 'Ativo'
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
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">1. Escolha a Postura a Realizar</label>
                  <div className="grid grid-cols-1 gap-2">
                    {POSTURAS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPostura(p)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all flex justify-between items-center ${
                          selectedPostura.id === p.id 
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
                        <div className="text-right">
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Peso</span>
                          <span className="text-lg font-black text-amber-600">{p.peso}</span>
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
                    
                    {sugerirFiscais.length > 0 ? (
                      <div className="relative z-10">
                        <p className="text-amber-400 text-[10px] font-bold uppercase mb-4 flex items-center gap-1.5 tracking-wider">
                          <AlertCircle size={13} /> Fiscal mais elegível hoje
                        </p>
                        <h3 className="text-2xl font-extrabold tracking-tight mb-1">{sugerirFiscais[0].nome}</h3>
                        <p className="text-slate-400 text-xs mb-6">
                          RF {sugerirFiscais[0].rf} • Pontos acumulados: {sugerirFiscais[0].pontos}
                        </p>
                        
                        <div className="space-y-3">
                          <button 
                            onClick={() => confirmarEscala(sugerirFiscais[0].id, selectedPostura)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-sm uppercase tracking-wider"
                          >
                            CONFIRMAR CONVOCAÇÃO
                          </button>
                          
                          <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                            Ao confirmar, o fiscal recebe mais {selectedPostura.peso} pontos de impacto por realizar a postura de categoria {selectedPostura.categoria}.
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">Próximos Fiscais na Fila de Prioridade</p>
                    <div className="space-y-2">
                      {sugerirFiscais.slice(1, 4).map((f, i) => (
                        <div key={f.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold">{i + 2}º</span>
                            {f.nome}
                          </span>
                          <span className="text-[11px] bg-slate-50 px-2 py-0.5 rounded border text-slate-500 font-bold">{f.pontos} pts</span>
                        </div>
                      ))}
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
              {historico.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-10" />
                  <p className="text-sm font-semibold">Nenhum comando registrado ainda no banco.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historico.map(log => (
                    <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/30">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                          SP
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800">{log.fiscalNome}</p>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{log.postura}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">+{log.peso} Pontos</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Carga do Comando</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-600">
                            {new Date(log.data).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {new Date(log.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white border-t p-3 text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest z-40">
        Escalador Justo de Posturas • Prefeitura de São Paulo
      </footer>
    </div>
  );
}