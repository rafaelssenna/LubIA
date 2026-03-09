import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, clearHistory } from '@/lib/chatbot';

// Endpoint de teste - simula conversas com o chatbot
export async function POST(request: NextRequest) {
  try {
    const { message, phone, userName, action } = await request.json();

    if (action === 'clear') {
      clearHistory(phone || '5500000000000');
      return NextResponse.json({ success: true, message: 'Histórico limpo' });
    }

    const response = await generateChatResponse(
      message,
      phone || '5500000000000',
      1, // empresaId
      userName || 'Cliente Teste'
    );

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('[TEST] Erro:', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
