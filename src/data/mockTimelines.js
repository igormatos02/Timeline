// Mock dataset for vertical timelines

export const initialTimelines = [
  {
    id: "tl-1",
    name: "Lançamento da Plataforma Chrono",
    description: "Planeamento executivo e execução do novo ecossistema de gestão temporal para equipas de alta performance.",
    startDate: "2026-08-01",
    endDate: "2026-09-15",
    status: "Em Progresso",
    type: "Tecnologia",
    color: "#6366f1", // Indigo
    events: [
      {
        id: "ev-today",
        date: "2026-08-21",
        time: "10:30",
        title: "Sincronização da Interface Vertical & Protótipo UI",
        description: "Apresentação da nova linha temporal vertical interativa com ordenação decrescente e nós diários em tempo real.",
        status: "Em Progresso",
        type: "Design & Frontend",
        priority: "Alta",
        author: "Igor Matos",
        tags: ["React", "UI/UX", "Timeline"],
        tasks: [
          { text: "Aprovação do layout visual", completed: true },
          { text: "Testes de responsividade mobile", completed: false },
          { text: "Integrar animações Framer Motion", completed: true }
        ]
      },
      {
        id: "ev-1",
        date: "2026-08-20",
        time: "16:00",
        title: "Revisão de Arquitetura Mock JSON",
        description: "Estruturação dos esquemas de dados sem dependência de base de dados inicial para aceleração do protótipo.",
        status: "Concluído",
        type: "Backend",
        priority: "Média",
        author: "Dev Team",
        tags: ["JSON", "Schema", "Architecture"]
      },
      {
        id: "ev-2",
        date: "2026-08-18",
        time: "14:15",
        title: "Validação do Design System & Palette HSL",
        description: "Definição do tema escuro premium com efeitos de glassmorphism, gradientes e estados de emissão de luz nos nós.",
        status: "Concluído",
        type: "Design",
        priority: "Alta",
        author: "UI Team",
        tags: ["Design System", "CSS Glass"]
      },
      {
        id: "ev-3",
        date: "2026-08-15",
        time: "11:00",
        title: "Reunião de Alinhamento Estratégico Q3",
        description: "Aprovação do orçamento e roadmap para a versão 1.0 sem persistência remota.",
        status: "Concluído",
        type: "Gestão",
        priority: "Urgente",
        author: "Stakeholders",
        tags: ["Roadmap", "Q3"]
      },
      {
        id: "ev-4",
        date: "2026-08-10",
        time: "09:00",
        title: "Benchmarking de Interfaces Temporais",
        description: "Estudo detalhado das melhores referências visuais de timelines verticais do mercado.",
        status: "Concluído",
        type: "Pesquisa",
        priority: "Baixa",
        author: "Igor Matos",
        tags: ["Research", "Benchmark"]
      },
      {
        id: "ev-5",
        date: "2026-08-01",
        time: "08:30",
        title: "Kickoff Oficial do Projeto Timeline",
        description: "Início formal do projeto com marcação da data de início oficial no calendário.",
        status: "Concluído",
        type: "Milestone",
        priority: "Alta",
        author: "Liderança",
        tags: ["Kickoff", "Start"]
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
    color: "#ec4899", // Pink
    events: [
      {
        id: "ev-201",
        date: "2026-08-15",
        time: "17:00",
        title: "Entrega do Brandbook Final",
        description: "Publicação do manual da marca em formato PDF e design system no Figma.",
        status: "Concluído",
        type: "Entregável",
        priority: "Alta",
        author: "Design Core",
        tags: ["Figma", "Brandbook"]
      },
      {
        id: "ev-202",
        date: "2026-07-25",
        time: "15:30",
        title: "Seleção da Paleta de Cores e Tipografia",
        description: "Aprovação da fonte Outfit / Inter e esquemas de contraste acessíveis W3C.",
        status: "Concluído",
        type: "Design",
        priority: "Média",
        author: "Design Core",
        tags: ["Typography", "Colors"]
      }
    ]
  },
  {
    id: "tl-3",
    name: "Expansão de Infias & Infraestrutura",
    description: "Planeamento e implementação de servidores dedicados de alta disponibilidade para 2027.",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    status: "Planeado",
    type: "Infraestrutura",
    color: "#10b981", // Emerald
    events: [
      {
        id: "ev-301",
        date: "2026-09-01",
        time: "09:00",
        title: "Início dos Testes de Carga",
        description: "Simulação de 100k requisições simultâneas nos ambientes de validação.",
        status: "Planeado",
        type: "DevOps",
        priority: "Alta",
        author: "DevOps Team",
        tags: ["DevOps", "LoadTest"]
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
