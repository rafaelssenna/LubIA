// Cliente
export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  veiculos?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Veículo
export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor?: string;
  km: string;
  clienteId: number;
  cliente?: Cliente;
  createdAt?: Date;
  updatedAt?: Date;
}

// Ordem de Serviço
export interface OrdemServico {
  id: string;
  clienteId: number;
  veiculoId: number;
  cliente?: Cliente;
  veiculo?: Veiculo;
  servicos: string[];
  valor: string;
  status: OSStatus;
  dataEntrada: string;
  previsao?: string;
  mecanico?: string;
  observacoes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OSStatus =
  | 'agendado'
  | 'aguardando'
  | 'em_andamento'
  | 'aguardando_pecas'
  | 'aguardando_aprovacao'
  | 'concluido'
  | 'cancelado';

// Serviço
export interface Servico {
  id: number;
  nome: string;
  preco: number;
  descricao?: string;
}

// API Response
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
