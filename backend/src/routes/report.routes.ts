import { Router } from 'express';
import { ReportService } from '../services/report.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/markdown', authMiddleware, async (req, res) => {
  try {
    const md = await ReportService.generateMarkdownReport();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vps-multivus-relatorio.md"');
    return res.send(md);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar relatório', details: err.message });
  }
});

router.get('/json', authMiddleware, async (req, res) => {
  try {
    const md = await ReportService.generateMarkdownReport();
    return res.json({ markdown: md });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar relatório', details: err.message });
  }
});

export default router;
