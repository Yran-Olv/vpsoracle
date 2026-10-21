import Parser from 'rss-parser';
import axios from 'axios';
import { db } from '../database';

export interface NewsItem {
  id?: number;
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  classification: 'Oficial' | 'Comunidade' | 'Relato de Usuário' | 'Possível Risco';
  classificationBadge: string;
  score: number;
  isDisclaimerRequired: boolean;
  disclaimerText?: string;
  tags: string[];
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

export class OracleNewsService {
  static getNews(filter: 'today' | '7d' | '30d' | 'all' = 'all', sort: 'newest' | 'relevance' = 'newest'): NewsItem[] {
    this.ensureSeedNews();

    let timeConstraint = '';
    const now = new Date();
    if (filter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      timeConstraint = `WHERE published_at >= '${startOfDay}'`;
    } else if (filter === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      timeConstraint = `WHERE published_at >= '${sevenDaysAgo}'`;
    } else if (filter === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
      timeConstraint = `WHERE published_at >= '${thirtyDaysAgo}'`;
    }

    const orderBy = sort === 'relevance' ? 'ORDER BY score DESC, published_at DESC' : 'ORDER BY published_at DESC';

    const rows = db.prepare(`SELECT * FROM oracle_news ${timeConstraint} ${orderBy}`).all() as any[];

    return rows.map(r => {
      let badge = '🔵 Comunidade';
      if (r.classification === 'Oficial') badge = '🟢 Oficial / Confirmado';
      else if (r.classification === 'Relato de Usuário') badge = '🟡 Relato de Usuário';
      else if (r.classification === 'Possível Risco') badge = '🔴 Possível Risco / Problema';

      return {
        id: r.id,
        title: r.title,
        source: r.source,
        sourceUrl: r.source_url,
        publishedAt: r.published_at,
        summary: r.summary,
        classification: r.classification,
        classificationBadge: badge,
        score: r.score,
        isDisclaimerRequired: Boolean(r.is_disclaimer_required),
        disclaimerText: r.is_disclaimer_required ? 'Esta informação não foi confirmada oficialmente pela Oracle e reflete apenas relatos da comunidade.' : undefined,
        tags: r.tags ? r.tags.split(',') : []
      };
    });
  }

  static async refreshNews(): Promise<{ fetched: number; newItems: number }> {
    let newItemsCount = 0;
    const feeds = [
      { url: 'https://www.reddit.com/r/oraclecloud/.rss', source: 'Reddit (r/oraclecloud)' },
      { url: 'https://www.reddit.com/r/selfhosted/.rss', source: 'Reddit (r/selfhosted)' },
      { url: 'https://blogs.oracle.com/cloud-infrastructure/rss', source: 'Oracle Cloud Official Blog' }
    ];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO oracle_news (
        title, source, source_url, published_at, summary, classification, score, is_disclaimer_required, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const feedConfig of feeds) {
      try {
        const feed = await parser.parseURL(feedConfig.url);
        if (feed && feed.items) {
          for (const item of feed.items) {
            if (!item.title || !item.link) continue;

            const title = item.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
            const lowerTitle = title.toLowerCase();
            const content = (item.contentSnippet || item.content || '').replace(/<[^>]*>?/gm, '');

            // Relevant keywords check
            const isRelevant = 
              lowerTitle.includes('oracle') ||
              lowerTitle.includes('free tier') ||
              lowerTitle.includes('always free') ||
              lowerTitle.includes('ampere') ||
              lowerTitle.includes('arm') ||
              lowerTitle.includes('ocpu') ||
              lowerTitle.includes('block volume') ||
              lowerTitle.includes('out of capacity') ||
              lowerTitle.includes('capacity') ||
              lowerTitle.includes('billing') ||
              lowerTitle.includes('invoice') ||
              lowerTitle.includes('charge') ||
              lowerTitle.includes('payg') ||
              lowerTitle.includes('pay as you go') ||
              lowerTitle.includes('suspension') ||
              lowerTitle.includes('terminated') ||
              feedConfig.source.includes('Oracle Cloud');

            if (!isRelevant) continue;

            // Classification & Scoring
            let classification: 'Oficial' | 'Comunidade' | 'Relato de Usuário' | 'Possível Risco' = 'Comunidade';
            let isDisclaimer = feedConfig.source.includes('Reddit');
            let score = 50;
            const tags: string[] = [];

            if (feedConfig.source.includes('Oracle')) {
              classification = 'Oficial';
              isDisclaimer = false;
              score = 100;
              tags.push('Oficial', 'Oracle');
            } else if (lowerTitle.includes('charge') || lowerTitle.includes('billing') || lowerTitle.includes('invoice') || lowerTitle.includes('suspended') || lowerTitle.includes('terminated')) {
              classification = 'Possível Risco';
              score = 90;
              tags.push('Cobrança', 'Risco', 'Atenção');
            } else if (lowerTitle.includes('out of capacity') || lowerTitle.includes('no capacity') || lowerTitle.includes('unavailable')) {
              classification = 'Possível Risco';
              score = 85;
              tags.push('Capacidade', 'Ampere A1');
            } else if (lowerTitle.includes('question') || lowerTitle.includes('help') || lowerTitle.includes('signup') || lowerTitle.includes('how to')) {
              classification = 'Relato de Usuário';
              score = 40;
              tags.push('Dúvida', 'Comunidade');
            } else {
              classification = 'Comunidade';
              score = 60;
              tags.push('Discussão', 'Always Free');
            }

            // Summary cleanup (short preview)
            const cleanSummary = content.substring(0, 300).trim() || title;
            const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : (item.isoDate || new Date().toISOString());

            const result = insertStmt.run(
              title,
              feedConfig.source,
              item.link,
              pubDate,
              cleanSummary + (cleanSummary.length >= 300 ? '...' : ''),
              classification,
              score,
              isDisclaimer ? 1 : 0,
              tags.join(',')
            );

            if (result.changes > 0) {
              newItemsCount++;
            }
          }
        }
      } catch (err: any) {
        console.warn(`Could not parse feed ${feedConfig.source}:`, err.message);
      }
    }

    return { fetched: feeds.length, newItems: newItemsCount };
  }

  static ensureSeedNews(): void {
    const count = (db.prepare('SELECT COUNT(*) as count FROM oracle_news').get() as { count: number }).count;
    if (count === 0) {
      const seedItems: NewsItem[] = [
        {
          title: 'Oracle Cloud Infrastructure Always Free Resources Documentation',
          source: 'Oracle Oficial',
          sourceUrl: 'https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm',
          publishedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
          summary: 'A Oracle mantém recursos Always Free disponíveis sem cobrança: até 4 OCPUs e 24 GB de RAM em instâncias ARM Ampere A1, 200 GB de armazenamento em bloco total e 10 TB de tráfego de saída.',
          classification: 'Oficial',
          classificationBadge: '🟢 Oficial / Confirmado',
          score: 100,
          isDisclaimerRequired: false,
          tags: ['Oficial', 'Documentação', 'Ampere A1', 'Storage']
        },
        {
          title: 'Regra de Reclamação de Instâncias Inativas (Idle Instance Reclamation)',
          source: 'Oracle Oficial',
          sourceUrl: 'https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm#compute__idleinstances',
          publishedAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
          summary: 'Instâncias Always Free com utilização no percentil 95 abaixo de 20% em CPU, RAM e Rede durante um período de 7 dias consecutivos podem ser identificadas como ociosas e reclamadas.',
          classification: 'Oficial',
          classificationBadge: '🟢 Oficial / Confirmado',
          score: 95,
          isDisclaimerRequired: false,
          tags: ['Oficial', 'Política', 'Reclamação Ociosa']
        },
        {
          title: 'Comunidade Reddit relata cobranças ao criar instâncias fora da Home Region',
          source: 'Reddit (r/oraclecloud)',
          sourceUrl: 'https://www.reddit.com/r/oraclecloud/comments/1w5bvqf/i_got_an_invoice/',
          publishedAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
          summary: 'Usuários relatam faturas pequenas ao alocar volumes de bloco ou recursos em regiões diferentes da Home Region definida no cadastro da conta Oracle.',
          classification: 'Possível Risco',
          classificationBadge: '🔴 Possível Risco / Problema',
          score: 88,
          isDisclaimerRequired: true,
          disclaimerText: 'Esta informação não foi confirmada oficialmente pela Oracle e reflete apenas relatos da comunidade.',
          tags: ['Cobrança', 'Home Region', 'Block Storage']
        },
        {
          title: 'Dicas para manter instâncias Ampere A1 ativas e evitar disponibilidade Out of Capacity',
          source: 'Reddit (r/oraclecloud)',
          sourceUrl: 'https://www.reddit.com/r/oraclecloud/search?q=out+of+capacity',
          publishedAt: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
          summary: 'Discussões da comunidade sobre a disponibilidade de capacidade ARM em regiões concorridas e a opção Pay As You Go para garantia de capacidade sem custo extra se mantido nos limites.',
          classification: 'Comunidade',
          classificationBadge: '🔵 Comunidade',
          score: 75,
          isDisclaimerRequired: true,
          disclaimerText: 'Esta informação não foi confirmada oficialmente pela Oracle e reflete apenas relatos da comunidade.',
          tags: ['Ampere A1', 'Out of Capacity', 'Pay As You Go']
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO oracle_news (
          title, source, source_url, published_at, summary, classification, score, is_disclaimer_required, tags, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const item of seedItems) {
        stmt.run(
          item.title,
          item.source,
          item.sourceUrl,
          item.publishedAt,
          item.summary,
          item.classification,
          item.score,
          item.isDisclaimerRequired ? 1 : 0,
          item.tags.join(',')
        );
      }
    }
  }
}
