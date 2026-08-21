// Mock dataset for vertical timelines with advanced event categories & labels

export const EVENT_CATEGORIES = [
  { id: 'agendamento', name: 'Agendamento', icon: '📅', color: '#06b6d4' },
  { id: 'repetitivo', name: 'Repetitivo / Aniversário', icon: '🔁', color: '#ec4899' },
  { id: 'tarefa', name: 'Pilha de Tarefas (Flutuante)', icon: '📌', color: '#f59e0b' },
  { id: 'memoria', name: 'Memória / Nota', icon: '📝', color: '#10b981' }
];

export const DEFAULT_LABELS = [
  { id: 'trabalho', name: 'Trabalho', color: '#6366f1' },
  { id: 'pessoal', name: 'Pessoal', color: '#ec4899' },
  { id: 'aniversario', name: 'Aniversário', color: '#f59e0b' },
  { id: 'urgente', name: 'Urgente', color: '#ef4444' },
  { id: 'ideia', name: 'Ideia / Nota', color: '#10b981' }
];

export const initialTimelines = [
  {
    id: "tl-1",
    name: "Lançamento da Plataforma Chrono",
    description: "Planeamento executivo e execução do novo ecossistema de gestão temporal para equipas de alta performance.",
    startDate: "2026-08-01",
    endDate: "2026-09-15",
    status: "Em Progresso",
    type: "Tecnologia",
    color: "#6366f1",
    events: [
      {
        id: "ev-today",
        date: "2026-08-21",
        time: "10:30",
        title: "Sincronização da Interface Vertical & Protótipo UI",
        description: "Apresentação da nova linha temporal vertical interativa com ordenação decrescente e nós diários em tempo real.",
        status: "Em Progresso",
        category: "agendamento",
        priority: "Alta",
        author: "Igor Matos",
        labels: ["Trabalho", "Urgente"],
        tasks: [
          { text: "Aprovação do layout visual", completed: true },
          { text: "Testes de responsividade mobile", completed: false },
          { text: "Integrar animações Framer Motion", completed: true }
        ]
      },
      {
        id: "ev-repeat-1",
        date: "2026-08-21",
        time: "09:00",
        title: "Aniversário da Empresa (Comemoração Anual)",
        description: "Data comemorativa recorrente do nascimento da equipa de desenvolvimento.",
        status: "Concluído",
        category: "repetitivo",
        priority: "Média",
        author: "RH Team",
        labels: ["Aniversário", "Pessoal"]
      },
      {
        id: "ev-mem-1",
        date: "2026-08-20",
        time: "18:00",
        title: "Memória: Insights sobre Usabilidade de Timelines",
        description: "Nota de reflexão: A ordenação decrescente com filtro de tarefas flutuantes aumenta imenso a clareza do roadmap diário.",
        status: "Concluído",
        category: "memoria",
        priority: "Baixa",
        author: "Igor Matos",
        labels: ["Ideia / Nota"]
      },
      // Floating Tasks (Pending - float in top stack until completed)
      {
        id: "ev-task-pending-1",
        date: "2026-08-21",
        time: "",
        title: "Configurar integrações de webhooks para notificações",
        description: "Tarefa flutuante: permanece na pilha no topo da timeline até ser concluída.",
        status: "Em Progresso",
        category: "tarefa",
        priority: "Alta",
        author: "DevOps",
        labels: ["Trabalho", "Urgente"],
        isCompleted: false
      },
      {
        id: "ev-task-pending-2",
        date: "2026-08-21",
        time: "",
        title: "Revisar documentação de código da API",
        description: "Tarefa pendente em pilha flutuante.",
        status: "Em Progresso",
        category: "tarefa",
        priority: "Média",
        author: "Igor Matos",
        labels: ["Trabalho"],
        isCompleted: false
      },
      // Fixed Completed Task (was completed on 18 Aug)
      {
        id: "ev-task-completed-1",
        date: "2026-08-18",
        time: "15:00",
        title: "Aprovação dos Esquemas de Cores Glassmorphism",
        description: "Esta tarefa estava na pilha flutuante e foi fixada no dia 18 de Agosto quando foi concluída.",
        status: "Concluído",
        category: "tarefa",
        priority: "Alta",
        author: "UI Team",
        labels: ["Trabalho"],
        isCompleted: true
      },
      {
        id: "ev-1",
        date: "2026-08-15",
        time: "11:00",
        title: "Reunião de Alinhamento Estratégico Q3",
        description: "Aprovação do orçamento e roadmap para a versão 1.0 sem persistência remota.",
        status: "Concluído",
        category: "agendamento",
        priority: "Urgente",
        author: "Stakeholders",
        labels: ["Trabalho"]
      }
    ]
  },
  {
    id: "tl-2",
    name: "Redesign de Identidade Visual 2026",
    description: "Modernização completa dos assets visuais, tipografia e diretrizes de marca para a nova década.",
    startDate: "2026-07-01",
    endDate: "2026-08-15",
    status: "Concluído",
    type: "Design",
    color: "#ec4899",
    events: [
      {
        id: "ev-201",
        date: "2026-08-15",
        time: "17:00",
        title: "Entrega do Brandbook Final",
        description: "Publicação do manual da marca em formato PDF e design system no Figma.",
        status: "Concluído",
        category: "agendamento",
        priority: "Alta",
        author: "Design Core",
        labels: ["Trabalho"]
      }
    ]
  }
];

export const TIMELINE_TYPES = [
  "Tecnologia",
  "Design",
  "Gestão",
  "Marketing",
  "Pessoal",
  "Infraestrutura",
  "Pesquisa",
  "Outro"
];

export const TIMELINE_STATUSES = [
  "Em Progresso",
  "Concluído",
  "Planeado",
  "Em Pausa"
];
