// Funções utilitárias de formatação padrão

// Capitaliza cada palavra (João Silva)
export const capitalize = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Formata placa (detecta Mercosul ou antiga)
export const formatPlate = (placa: string | null | undefined): string => {
  if (!placa) return '';
  const cleaned = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length === 7) {
    // Detecta se é Mercosul (5º caractere é letra) ou antiga (5º é número)
    const isMercosul = /[A-Z]/.test(cleaned[4]);
    if (isMercosul) {
      return cleaned; // Mercosul: ABC1D23
    }
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`; // Antiga: ABC-1234
  }
  return placa.toUpperCase();
};

// Formata CPF/CNPJ
export const formatCpfCnpj = (value: string | null | undefined): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return value;
};

// Formata telefone
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Tudo maiúsculo (para placas em inputs)
export const toUpper = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toUpperCase();
};
