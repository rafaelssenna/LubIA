import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const produtos = [
  // ===== ÓLEOS LUBRIFICANTES =====
  // Castrol
  { codigo: 'OL-001', nome: 'Castrol GTX 5W-30 Sintético', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 100, estoqueMinimo: 20, precoCompra: 28.50, precoVenda: 42.00, precoGranel: 38.00, localizacao: 'A1-01' },
  { codigo: 'OL-002', nome: 'Castrol GTX 10W-40 Semissintético', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 80, estoqueMinimo: 20, precoCompra: 22.00, precoVenda: 35.00, precoGranel: 32.00, localizacao: 'A1-02' },
  { codigo: 'OL-003', nome: 'Castrol Edge 5W-30 Full Synthetic', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 60, estoqueMinimo: 15, precoCompra: 45.00, precoVenda: 68.00, precoGranel: 62.00, localizacao: 'A1-03' },
  { codigo: 'OL-004', nome: 'Castrol Magnatec 5W-40 Sintético', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 75, estoqueMinimo: 15, precoCompra: 32.00, precoVenda: 48.00, precoGranel: 44.00, localizacao: 'A1-04' },
  { codigo: 'OL-005', nome: 'Castrol Edge 0W-20 Full Synthetic', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 40, estoqueMinimo: 10, precoCompra: 52.00, precoVenda: 78.00, precoGranel: 72.00, localizacao: 'A1-05' },

  // Mobil
  { codigo: 'OL-006', nome: 'Mobil 1 5W-30 Sintético', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 90, estoqueMinimo: 20, precoCompra: 48.00, precoVenda: 72.00, precoGranel: 66.00, localizacao: 'A2-01' },
  { codigo: 'OL-007', nome: 'Mobil Super 3000 5W-40', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 70, estoqueMinimo: 15, precoCompra: 35.00, precoVenda: 52.00, precoGranel: 48.00, localizacao: 'A2-02' },
  { codigo: 'OL-008', nome: 'Mobil 1 0W-40 Racing', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 30, estoqueMinimo: 10, precoCompra: 65.00, precoVenda: 95.00, precoGranel: 88.00, localizacao: 'A2-03' },
  { codigo: 'OL-009', nome: 'Mobil Delvac 15W-40 Diesel', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 120, estoqueMinimo: 30, precoCompra: 18.00, precoVenda: 28.00, precoGranel: 25.00, localizacao: 'A2-04' },
  { codigo: 'OL-010', nome: 'Mobil Super 2000 10W-40', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 85, estoqueMinimo: 20, precoCompra: 24.00, precoVenda: 38.00, precoGranel: 35.00, localizacao: 'A2-05' },

  // Shell
  { codigo: 'OL-011', nome: 'Shell Helix Ultra 5W-30', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 95, estoqueMinimo: 20, precoCompra: 42.00, precoVenda: 65.00, precoGranel: 59.00, localizacao: 'A3-01' },
  { codigo: 'OL-012', nome: 'Shell Helix HX7 10W-40', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 80, estoqueMinimo: 20, precoCompra: 25.00, precoVenda: 40.00, precoGranel: 36.00, localizacao: 'A3-02' },
  { codigo: 'OL-013', nome: 'Shell Helix Ultra ECT 5W-30', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 55, estoqueMinimo: 15, precoCompra: 48.00, precoVenda: 72.00, precoGranel: 66.00, localizacao: 'A3-03' },
  { codigo: 'OL-014', nome: 'Shell Rimula R4 15W-40 Diesel', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 100, estoqueMinimo: 25, precoCompra: 16.00, precoVenda: 26.00, precoGranel: 23.00, localizacao: 'A3-04' },
  { codigo: 'OL-015', nome: 'Shell Helix Ultra 0W-20 Hybrid', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 35, estoqueMinimo: 10, precoCompra: 55.00, precoVenda: 82.00, precoGranel: 75.00, localizacao: 'A3-05' },

  // Petronas
  { codigo: 'OL-016', nome: 'Petronas Syntium 5000 5W-30', marca: 'Petronas', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 65, estoqueMinimo: 15, precoCompra: 38.00, precoVenda: 58.00, precoGranel: 52.00, localizacao: 'A4-01' },
  { codigo: 'OL-017', nome: 'Petronas Syntium 3000 5W-40', marca: 'Petronas', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 70, estoqueMinimo: 15, precoCompra: 32.00, precoVenda: 50.00, precoGranel: 45.00, localizacao: 'A4-02' },
  { codigo: 'OL-018', nome: 'Petronas Urania 15W-40 Diesel', marca: 'Petronas', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 90, estoqueMinimo: 20, precoCompra: 15.00, precoVenda: 24.00, precoGranel: 21.00, localizacao: 'A4-03' },

  // Lubrax
  { codigo: 'OL-019', nome: 'Lubrax Essencial 5W-30 SN', marca: 'Lubrax', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 110, estoqueMinimo: 25, precoCompra: 22.00, precoVenda: 35.00, precoGranel: 32.00, localizacao: 'A5-01' },
  { codigo: 'OL-020', nome: 'Lubrax Top Turbo 15W-40', marca: 'Lubrax', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 150, estoqueMinimo: 30, precoCompra: 14.00, precoVenda: 22.00, precoGranel: 19.00, localizacao: 'A5-02' },
  { codigo: 'OL-021', nome: 'Lubrax Valora 5W-40 Sintético', marca: 'Lubrax', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 60, estoqueMinimo: 15, precoCompra: 30.00, precoVenda: 46.00, precoGranel: 42.00, localizacao: 'A5-03' },

  // Total/Elf
  { codigo: 'OL-022', nome: 'Total Quartz 9000 5W-40', marca: 'Total', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 50, estoqueMinimo: 12, precoCompra: 35.00, precoVenda: 54.00, precoGranel: 49.00, localizacao: 'A6-01' },
  { codigo: 'OL-023', nome: 'Elf Evolution 900 5W-30', marca: 'Elf', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 55, estoqueMinimo: 12, precoCompra: 38.00, precoVenda: 58.00, precoGranel: 53.00, localizacao: 'A6-02' },

  // Óleos de Câmbio/Diferencial
  { codigo: 'OL-024', nome: 'Óleo Câmbio Manual 75W-90 GL-4', marca: 'Castrol', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 40, estoqueMinimo: 10, precoCompra: 45.00, precoVenda: 68.00, precoGranel: 62.00, localizacao: 'B1-01' },
  { codigo: 'OL-025', nome: 'Óleo ATF Dexron III Automático', marca: 'Mobil', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 50, estoqueMinimo: 12, precoCompra: 35.00, precoVenda: 55.00, precoGranel: 50.00, localizacao: 'B1-02' },
  { codigo: 'OL-026', nome: 'Óleo Diferencial 85W-140 GL-5', marca: 'Shell', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 35, estoqueMinimo: 10, precoCompra: 42.00, precoVenda: 65.00, precoGranel: 59.00, localizacao: 'B1-03' },
  { codigo: 'OL-027', nome: 'Óleo Câmbio CVT', marca: 'Petronas', categoria: 'OLEO_LUBRIFICANTE', unidade: 'LITRO', quantidade: 25, estoqueMinimo: 8, precoCompra: 55.00, precoVenda: 85.00, precoGranel: 78.00, localizacao: 'B1-04' },

  // ===== FILTROS DE ÓLEO =====
  // Mann
  { codigo: 'FO-001', nome: 'Filtro Óleo Mann W719/30', marca: 'Mann', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 5, precoCompra: 28.00, precoVenda: 45.00, precoGranel: null, localizacao: 'C1-01' },
  { codigo: 'FO-002', nome: 'Filtro Óleo Mann W712/95', marca: 'Mann', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 32.00, precoVenda: 52.00, precoGranel: null, localizacao: 'C1-02' },
  { codigo: 'FO-003', nome: 'Filtro Óleo Mann HU719/7x', marca: 'Mann', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 45.00, precoVenda: 72.00, precoGranel: null, localizacao: 'C1-03' },
  { codigo: 'FO-004', nome: 'Filtro Óleo Mann W940/25', marca: 'Mann', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 5, precoCompra: 35.00, precoVenda: 55.00, precoGranel: null, localizacao: 'C1-04' },

  // Tecfil
  { codigo: 'FO-005', nome: 'Filtro Óleo Tecfil PSL47', marca: 'Tecfil', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 30, estoqueMinimo: 8, precoCompra: 18.00, precoVenda: 32.00, precoGranel: null, localizacao: 'C2-01' },
  { codigo: 'FO-006', nome: 'Filtro Óleo Tecfil PSL141', marca: 'Tecfil', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 28, estoqueMinimo: 8, precoCompra: 20.00, precoVenda: 35.00, precoGranel: null, localizacao: 'C2-02' },
  { codigo: 'FO-007', nome: 'Filtro Óleo Tecfil PSL315', marca: 'Tecfil', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 22, estoqueMinimo: 6, precoCompra: 22.00, precoVenda: 38.00, precoGranel: null, localizacao: 'C2-03' },
  { codigo: 'FO-008', nome: 'Filtro Óleo Tecfil PEL710', marca: 'Tecfil', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 32.00, precoVenda: 52.00, precoGranel: null, localizacao: 'C2-04' },

  // Fram
  { codigo: 'FO-009', nome: 'Filtro Óleo Fram PH6607', marca: 'Fram', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 24.00, precoVenda: 42.00, precoGranel: null, localizacao: 'C3-01' },
  { codigo: 'FO-010', nome: 'Filtro Óleo Fram PH4967', marca: 'Fram', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 22, estoqueMinimo: 5, precoCompra: 26.00, precoVenda: 44.00, precoGranel: null, localizacao: 'C3-02' },

  // Bosch
  { codigo: 'FO-011', nome: 'Filtro Óleo Bosch OB0003', marca: 'Bosch', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'C4-01' },
  { codigo: 'FO-012', nome: 'Filtro Óleo Bosch OF0021', marca: 'Bosch', categoria: 'FILTRO_OLEO', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 4, precoCompra: 42.00, precoVenda: 68.00, precoGranel: null, localizacao: 'C4-02' },

  // ===== FILTROS DE AR =====
  // Mann
  { codigo: 'FA-001', nome: 'Filtro Ar Mann C2774', marca: 'Mann', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 55.00, precoVenda: 88.00, precoGranel: null, localizacao: 'D1-01' },
  { codigo: 'FA-002', nome: 'Filtro Ar Mann C27154', marca: 'Mann', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 4, precoCompra: 62.00, precoVenda: 98.00, precoGranel: null, localizacao: 'D1-02' },
  { codigo: 'FA-003', nome: 'Filtro Ar Mann C30005', marca: 'Mann', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 10, estoqueMinimo: 3, precoCompra: 72.00, precoVenda: 115.00, precoGranel: null, localizacao: 'D1-03' },

  // Tecfil
  { codigo: 'FA-004', nome: 'Filtro Ar Tecfil ARL6096', marca: 'Tecfil', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 38.00, precoVenda: 62.00, precoGranel: null, localizacao: 'D2-01' },
  { codigo: 'FA-005', nome: 'Filtro Ar Tecfil ARL2218', marca: 'Tecfil', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 42.00, precoVenda: 68.00, precoGranel: null, localizacao: 'D2-02' },
  { codigo: 'FA-006', nome: 'Filtro Ar Tecfil ARL8833', marca: 'Tecfil', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'D2-03' },

  // Fram
  { codigo: 'FA-007', nome: 'Filtro Ar Fram CA10171', marca: 'Fram', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 14, estoqueMinimo: 4, precoCompra: 48.00, precoVenda: 78.00, precoGranel: null, localizacao: 'D3-01' },
  { codigo: 'FA-008', nome: 'Filtro Ar Fram CA9482', marca: 'Fram', categoria: 'FILTRO_AR', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 3, precoCompra: 52.00, precoVenda: 85.00, precoGranel: null, localizacao: 'D3-02' },

  // ===== FILTROS AR CONDICIONADO =====
  { codigo: 'FC-001', nome: 'Filtro Cabine Mann CU2939', marca: 'Mann', categoria: 'FILTRO_AR_CONDICIONADO', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 48.00, precoVenda: 78.00, precoGranel: null, localizacao: 'E1-01' },
  { codigo: 'FC-002', nome: 'Filtro Cabine Mann CUK2939', marca: 'Mann', categoria: 'FILTRO_AR_CONDICIONADO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 65.00, precoVenda: 105.00, precoGranel: null, localizacao: 'E1-02' },
  { codigo: 'FC-003', nome: 'Filtro Cabine Tecfil ACP001', marca: 'Tecfil', categoria: 'FILTRO_AR_CONDICIONADO', unidade: 'UNIDADE', quantidade: 22, estoqueMinimo: 6, precoCompra: 32.00, precoVenda: 55.00, precoGranel: null, localizacao: 'E2-01' },
  { codigo: 'FC-004', nome: 'Filtro Cabine Tecfil ACP503', marca: 'Tecfil', categoria: 'FILTRO_AR_CONDICIONADO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'E2-02' },
  { codigo: 'FC-005', nome: 'Filtro Cabine Carvão Ativado Bosch', marca: 'Bosch', categoria: 'FILTRO_AR_CONDICIONADO', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 3, precoCompra: 72.00, precoVenda: 115.00, precoGranel: null, localizacao: 'E3-01' },

  // ===== FILTROS COMBUSTÍVEL =====
  { codigo: 'FB-001', nome: 'Filtro Combustível Mann WK69', marca: 'Mann', categoria: 'FILTRO_COMBUSTIVEL', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 38.00, precoVenda: 62.00, precoGranel: null, localizacao: 'F1-01' },
  { codigo: 'FB-002', nome: 'Filtro Combustível Mann WK853/3', marca: 'Mann', categoria: 'FILTRO_COMBUSTIVEL', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 55.00, precoVenda: 88.00, precoGranel: null, localizacao: 'F1-02' },
  { codigo: 'FB-003', nome: 'Filtro Combustível Tecfil GI05/7', marca: 'Tecfil', categoria: 'FILTRO_COMBUSTIVEL', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 28.00, precoVenda: 48.00, precoGranel: null, localizacao: 'F2-01' },
  { codigo: 'FB-004', nome: 'Filtro Combustível Tecfil GI12', marca: 'Tecfil', categoria: 'FILTRO_COMBUSTIVEL', unidade: 'UNIDADE', quantidade: 22, estoqueMinimo: 5, precoCompra: 32.00, precoVenda: 52.00, precoGranel: null, localizacao: 'F2-02' },
  { codigo: 'FB-005', nome: 'Filtro Diesel Racor R60T', marca: 'Racor', categoria: 'FILTRO_COMBUSTIVEL', unidade: 'UNIDADE', quantidade: 10, estoqueMinimo: 3, precoCompra: 85.00, precoVenda: 135.00, precoGranel: null, localizacao: 'F3-01' },

  // ===== ADITIVOS =====
  { codigo: 'AD-001', nome: 'Aditivo Radiador Concentrado Vermelho', marca: 'Paraflu', categoria: 'ADITIVO', unidade: 'LITRO', quantidade: 45, estoqueMinimo: 10, precoCompra: 18.00, precoVenda: 32.00, precoGranel: 28.00, localizacao: 'G1-01' },
  { codigo: 'AD-002', nome: 'Aditivo Radiador Concentrado Verde', marca: 'Paraflu', categoria: 'ADITIVO', unidade: 'LITRO', quantidade: 40, estoqueMinimo: 10, precoCompra: 18.00, precoVenda: 32.00, precoGranel: 28.00, localizacao: 'G1-02' },
  { codigo: 'AD-003', nome: 'Aditivo Radiador Pronto Uso Rosa', marca: 'Mobil', categoria: 'ADITIVO', unidade: 'LITRO', quantidade: 50, estoqueMinimo: 12, precoCompra: 12.00, precoVenda: 22.00, precoGranel: 18.00, localizacao: 'G1-03' },
  { codigo: 'AD-004', nome: 'Limpa Radiador', marca: 'Radiex', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 15.00, precoVenda: 28.00, precoGranel: null, localizacao: 'G2-01' },
  { codigo: 'AD-005', nome: 'Aditivo Combustível Flex', marca: 'STP', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 35, estoqueMinimo: 8, precoCompra: 22.00, precoVenda: 38.00, precoGranel: null, localizacao: 'G2-02' },
  { codigo: 'AD-006', nome: 'Aditivo Combustível Diesel', marca: 'Bardahl', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'G2-03' },
  { codigo: 'AD-007', nome: 'Limpa Bicos Injetores', marca: 'Wurth', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 30, estoqueMinimo: 8, precoCompra: 45.00, precoVenda: 75.00, precoGranel: null, localizacao: 'G3-01' },
  { codigo: 'AD-008', nome: 'Limpa TBI', marca: 'Bardahl', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 28.00, precoVenda: 48.00, precoGranel: null, localizacao: 'G3-02' },
  { codigo: 'AD-009', nome: 'Descarbonizante Motor', marca: 'Wurth', categoria: 'ADITIVO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 52.00, precoVenda: 85.00, precoGranel: null, localizacao: 'G3-03' },

  // ===== GRAXAS =====
  { codigo: 'GR-001', nome: 'Graxa Chassis MP2 500g', marca: 'Lubrax', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 18.00, precoVenda: 32.00, precoGranel: null, localizacao: 'H1-01' },
  { codigo: 'GR-002', nome: 'Graxa Rolamento Azul 500g', marca: 'Mobil', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 25.00, precoVenda: 42.00, precoGranel: null, localizacao: 'H1-02' },
  { codigo: 'GR-003', nome: 'Graxa Branca Multiuso 200g', marca: 'Wurth', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 30, estoqueMinimo: 8, precoCompra: 22.00, precoVenda: 38.00, precoGranel: null, localizacao: 'H1-03' },
  { codigo: 'GR-004', nome: 'Graxa Grafitada 500g', marca: 'Shell', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 28.00, precoVenda: 48.00, precoGranel: null, localizacao: 'H1-04' },
  { codigo: 'GR-005', nome: 'Graxa Alta Temperatura 500g', marca: 'Castrol', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 3, precoCompra: 42.00, precoVenda: 68.00, precoGranel: null, localizacao: 'H2-01' },
  { codigo: 'GR-006', nome: 'Graxa CV Joint (Homocinética)', marca: 'Mobil', categoria: 'GRAXA', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'H2-02' },

  // ===== ACESSÓRIOS =====
  { codigo: 'AC-001', nome: 'Aromatizante Little Trees', marca: 'Little Trees', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 100, estoqueMinimo: 20, precoCompra: 3.50, precoVenda: 8.00, precoGranel: null, localizacao: 'I1-01' },
  { codigo: 'AC-002', nome: 'Limpa Vidros 500ml', marca: 'Wurth', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 12.00, precoVenda: 22.00, precoGranel: null, localizacao: 'I1-02' },
  { codigo: 'AC-003', nome: 'Silicone Spray 300ml', marca: 'Wurth', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 30, estoqueMinimo: 8, precoCompra: 18.00, precoVenda: 32.00, precoGranel: null, localizacao: 'I1-03' },
  { codigo: 'AC-004', nome: 'WD-40 Desengripante 300ml', marca: 'WD-40', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 28.00, precoVenda: 48.00, precoGranel: null, localizacao: 'I2-01' },
  { codigo: 'AC-005', nome: 'Água Destilada 5L', marca: 'Genérico', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 40, estoqueMinimo: 10, precoCompra: 8.00, precoVenda: 15.00, precoGranel: null, localizacao: 'I2-02' },
  { codigo: 'AC-006', nome: 'Fluido de Freio DOT4 500ml', marca: 'Bosch', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 35, estoqueMinimo: 8, precoCompra: 32.00, precoVenda: 52.00, precoGranel: null, localizacao: 'I3-01' },
  { codigo: 'AC-007', nome: 'Fluido de Freio DOT5.1 500ml', marca: 'Castrol', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 45.00, precoVenda: 72.00, precoGranel: null, localizacao: 'I3-02' },
  { codigo: 'AC-008', nome: 'Fluido Direção Hidráulica ATF', marca: 'Mobil', categoria: 'ACESSORIO', unidade: 'LITRO', quantidade: 30, estoqueMinimo: 8, precoCompra: 28.00, precoVenda: 45.00, precoGranel: 40.00, localizacao: 'I3-03' },
  { codigo: 'AC-009', nome: 'Palheta Limpador Universal 20"', marca: 'Bosch', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 35.00, precoVenda: 58.00, precoGranel: null, localizacao: 'I4-01' },
  { codigo: 'AC-010', nome: 'Palheta Limpador Universal 22"', marca: 'Bosch', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 18, estoqueMinimo: 5, precoCompra: 38.00, precoVenda: 62.00, precoGranel: null, localizacao: 'I4-02' },
  { codigo: 'AC-011', nome: 'Palheta Limpador Universal 24"', marca: 'Bosch', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 42.00, precoVenda: 68.00, precoGranel: null, localizacao: 'I4-03' },
  { codigo: 'AC-012', nome: 'Lâmpada H4 12V 60/55W', marca: 'Osram', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 30, estoqueMinimo: 8, precoCompra: 18.00, precoVenda: 32.00, precoGranel: null, localizacao: 'I5-01' },
  { codigo: 'AC-013', nome: 'Lâmpada H7 12V 55W', marca: 'Osram', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 28, estoqueMinimo: 8, precoCompra: 22.00, precoVenda: 38.00, precoGranel: null, localizacao: 'I5-02' },
  { codigo: 'AC-014', nome: 'Lâmpada H1 12V 55W', marca: 'Philips', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 20.00, precoVenda: 35.00, precoGranel: null, localizacao: 'I5-03' },
  { codigo: 'AC-015', nome: 'Tampa Radiador Universal', marca: 'Genérico', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 12.00, precoVenda: 25.00, precoGranel: null, localizacao: 'I6-01' },
  { codigo: 'AC-016', nome: 'Bico Pneu Válvula TR413', marca: 'Genérico', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 50, estoqueMinimo: 15, precoCompra: 2.00, precoVenda: 5.00, precoGranel: null, localizacao: 'I6-02' },
  { codigo: 'AC-017', nome: 'Calibrador Pneu Digital', marca: 'Tramontina', categoria: 'ACESSORIO', unidade: 'UNIDADE', quantidade: 8, estoqueMinimo: 2, precoCompra: 45.00, precoVenda: 75.00, precoGranel: null, localizacao: 'I6-03' },

  // ===== OUTROS =====
  { codigo: 'OU-001', nome: 'Estopa Branca 200g', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 100, estoqueMinimo: 25, precoCompra: 4.00, precoVenda: 8.00, precoGranel: null, localizacao: 'J1-01' },
  { codigo: 'OU-002', nome: 'Pano Microfibra', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 50, estoqueMinimo: 15, precoCompra: 5.00, precoVenda: 12.00, precoGranel: null, localizacao: 'J1-02' },
  { codigo: 'OU-003', nome: 'Luva Nitrílica Caixa 100un', marca: 'Volk', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 20, estoqueMinimo: 5, precoCompra: 55.00, precoVenda: 85.00, precoGranel: null, localizacao: 'J1-03' },
  { codigo: 'OU-004', nome: 'Desengraxante 5L', marca: 'Wurth', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 15, estoqueMinimo: 4, precoCompra: 48.00, precoVenda: 78.00, precoGranel: null, localizacao: 'J2-01' },
  { codigo: 'OU-005', nome: 'Sabão Mecânico Pasta 500g', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 25, estoqueMinimo: 6, precoCompra: 8.00, precoVenda: 15.00, precoGranel: null, localizacao: 'J2-02' },
  { codigo: 'OU-006', nome: 'Fita Veda Rosca 18mm', marca: 'Tigre', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 40, estoqueMinimo: 10, precoCompra: 5.00, precoVenda: 10.00, precoGranel: null, localizacao: 'J2-03' },
  { codigo: 'OU-007', nome: 'Abraçadeira Inox 12-22mm', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 60, estoqueMinimo: 15, precoCompra: 2.50, precoVenda: 6.00, precoGranel: null, localizacao: 'J3-01' },
  { codigo: 'OU-008', nome: 'Abraçadeira Inox 22-32mm', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 50, estoqueMinimo: 12, precoCompra: 3.00, precoVenda: 7.00, precoGranel: null, localizacao: 'J3-02' },
  { codigo: 'OU-009', nome: 'Bomba Óleo Manual 5L', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 5, estoqueMinimo: 2, precoCompra: 45.00, precoVenda: 75.00, precoGranel: null, localizacao: 'J4-01' },
  { codigo: 'OU-010', nome: 'Funil Plástico c/ Bico Flexível', marca: 'Genérico', categoria: 'OUTRO', unidade: 'UNIDADE', quantidade: 12, estoqueMinimo: 3, precoCompra: 15.00, precoVenda: 28.00, precoGranel: null, localizacao: 'J4-02' },
];

async function main() {
  console.log('🌱 Iniciando seed do sistema...\n');

  // 1. Criar empresa demo
  console.log('📦 Criando empresa demo...');
  let empresa = await prisma.empresa.findUnique({
    where: { slug: 'demo' },
  });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: 'Oficina Demo',
        slug: 'demo',
        ativo: true,
      },
    });
    console.log('✅ Empresa criada: Oficina Demo');
  } else {
    console.log('⏭️  Empresa demo já existe');
  }

  const empresaId = empresa.id;

  // 2. Criar usuário admin
  console.log('\n👤 Criando usuário admin...');
  const existingUser = await prisma.usuario.findUnique({
    where: { email: 'admin@demo.com' },
  });

  if (!existingUser) {
    const senhaHash = await hashPassword('admin123');
    await prisma.usuario.create({
      data: {
        email: 'admin@demo.com',
        senhaHash,
        nome: 'Administrador',
        empresaId,
        ativo: true,
      },
    });
    console.log('✅ Usuário criado: admin@demo.com / admin123');
  } else {
    console.log('⏭️  Usuário admin já existe');
  }

  // 3. Criar configuração padrão
  console.log('\n⚙️  Criando configuração padrão...');
  const existingConfig = await prisma.configuracao.findUnique({
    where: { empresaId },
  });

  if (!existingConfig) {
    await prisma.configuracao.create({
      data: {
        empresaId,
        nomeOficina: 'Oficina Demo',
        chatbotEnabled: true,
        chatbotNome: 'LoopIA',
        chatbotHorario: JSON.stringify({
          seg: { ativo: true, abertura: '08:00', fechamento: '18:00' },
          ter: { ativo: true, abertura: '08:00', fechamento: '18:00' },
          qua: { ativo: true, abertura: '08:00', fechamento: '18:00' },
          qui: { ativo: true, abertura: '08:00', fechamento: '18:00' },
          sex: { ativo: true, abertura: '08:00', fechamento: '18:00' },
          sab: { ativo: true, abertura: '08:00', fechamento: '12:00' },
          dom: { ativo: false, abertura: '08:00', fechamento: '12:00' },
        }),
      },
    });
    console.log('✅ Configuração criada');
  } else {
    console.log('⏭️  Configuração já existe');
  }

  // 4. Criar serviços padrão
  console.log('\n🔧 Criando serviços padrão...');
  const servicosExistentes = await prisma.servico.count({ where: { empresaId } });

  if (servicosExistentes === 0) {
    await prisma.servico.createMany({
      data: [
        {
          empresaId,
          nome: 'Troca de Óleo 5W30',
          descricao: 'Troca de óleo do motor com óleo semi-sintético 5W30',
          categoria: 'TROCA_OLEO',
          precoBase: 180.00,
          duracaoMin: 60,
        },
        {
          empresaId,
          nome: 'Troca de Óleo Sintético',
          descricao: 'Troca de óleo do motor com óleo 100% sintético',
          categoria: 'TROCA_OLEO',
          precoBase: 280.00,
          duracaoMin: 60,
        },
        {
          empresaId,
          nome: 'Alinhamento e Balanceamento',
          descricao: 'Alinhamento das rodas dianteiras e traseiras + balanceamento das 4 rodas',
          categoria: 'PNEUS',
          precoBase: 140.00,
          duracaoMin: 90,
        },
        {
          empresaId,
          nome: 'Troca de Filtros',
          descricao: 'Substituição do filtro de óleo, ar e combustível',
          categoria: 'FILTROS',
          precoBase: 150.00,
          duracaoMin: 45,
        },
      ],
    });
    console.log('✅ Serviços padrão criados');
  } else {
    console.log('⏭️  Serviços já existem');
  }

  // 5. Criar produtos do estoque
  console.log('\n📦 Criando produtos do estoque...\n');

  let criados = 0;
  let ignorados = 0;

  for (const produto of produtos) {
    try {
      // Verificar se já existe pelo código + empresaId
      const existente = await prisma.produto.findUnique({
        where: { codigo_empresaId: { codigo: produto.codigo, empresaId } },
      });

      if (existente) {
        console.log(`⏭️  ${produto.codigo} - ${produto.nome} (já existe)`);
        ignorados++;
        continue;
      }

      await prisma.produto.create({
        data: {
          empresaId,
          codigo: produto.codigo,
          nome: produto.nome,
          marca: produto.marca,
          categoria: produto.categoria as any,
          unidade: produto.unidade as any,
          quantidade: produto.quantidade,
          estoqueMinimo: produto.estoqueMinimo,
          precoCompra: produto.precoCompra,
          precoCompraAtual: produto.precoCompra,
          precoVenda: produto.precoVenda,
          precoGranel: produto.precoGranel,
          localizacao: produto.localizacao,
        },
      });

      console.log(`✅ ${produto.codigo} - ${produto.nome}`);
      criados++;
    } catch (error: any) {
      console.error(`❌ Erro em ${produto.codigo}: ${error.message}`);
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Empresa: ${empresa.nome}`);
  console.log(`   Login: admin@demo.com / admin123`);
  console.log(`   Produtos criados: ${criados}`);
  console.log(`   Produtos ignorados: ${ignorados}`);
  console.log(`   Total no seed: ${produtos.length}`);
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
