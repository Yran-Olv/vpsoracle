import { Router } from 'express';
import { OracleNewsService } from '../services/oracle-news.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const filter = (req.query.filter as 'today' | '7d' | '30d' | 'all') || 'all';
  const sort = (req.query.sort as 'newest' | 'relevance') || 'newest';

  try {
    const news = OracleNewsService.getNews(filter, sort);
    return res.json(news);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter notícias', details: err.message });
  }
});

router.get('/reddit', authMiddleware, (req, res) => {
  const filter = (req.query.filter as 'today' | '7d' | '30d' | 'all') || 'all';
  const sort = (req.query.sort as 'newest' | 'relevance') || 'newest';

  try {
    const allNews = OracleNewsService.getNews(filter, sort);
    const redditOnly = allNews.filter(n => n.source.toLowerCase().includes('reddit'));
    return res.json(redditOnly);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter notícias do Reddit', details: err.message });
  }
});

router.post('/refresh', authMiddleware, auditMiddleware('REFRESH_NEWS'), async (req, res) => {
  try {
    const result = await OracleNewsService.refreshNews();
    return res.json({
      message: 'Notícias atualizadas com sucesso.',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao sincronizar notícias', details: err.message });
  }
});

export default router;
