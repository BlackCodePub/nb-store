/**
 * API: LGPD - Cookie Consent e Gerenciamento de Dados
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { 
  recordCookieConsent, 
  getUserConsent, 
  requestDataExport, 
  requestDataDeletion,
  getExportStatus,
  processDataExport,
  type CookieConsentData 
} from '../../../src/server/privacy/lgpd-service';

// GET: Buscar consentimento atual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!session?.user?.id) {
      return NextResponse.json({ consent: null });
    }

    if (requestId) {
      const status = await getExportStatus(requestId, session.user.id);
      if (!status) {
        return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
      }
      return NextResponse.json({ status });
    }
    
    const consent = await getUserConsent(session.user.id);
    
    return NextResponse.json({ consent });
  } catch (error) {
    console.error('[API /lgpd] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar consentimento' },
      { status: 500 }
    );
  }
}

// POST: Registrar consentimento de cookies
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(buildAuthOptions('store'));
    const body = await request.json();
    
    const { action, categories } = body;
    
    // Ação de consentimento de cookies
    if (action === 'consent') {
      const consentData: CookieConsentData = {
        necessary: true, // Sempre true
        analytics: categories?.analytics ?? false,
        marketing: categories?.marketing ?? false,
      };
      
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      const consentId = await recordCookieConsent(
        ip,
        userAgent,
        consentData,
        session?.user?.id
      );
      
      return NextResponse.json({
        success: true,
        consentId,
        categories: consentData,
      });
    }
    
    // Ação de exportação de dados
    if (action === 'export') {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      const requestId = await requestDataExport(session.user.id);
      void processDataExport(requestId);
      
      return NextResponse.json({
        success: true,
        requestId,
        message: 'Solicitação de exportação registrada. Você receberá um email quando estiver pronta.',
      });
    }
    
    // Ação de exclusão de dados
    if (action === 'delete') {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      
      try {
        await requestDataDeletion(session.user.id);
        
        return NextResponse.json({
          success: true,
          message: 'Seus dados foram anonimizados. Sua conta foi desativada.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao excluir dados';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('[API /lgpd] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
