import React, { useState } from 'react';
import { NewsItem } from '../../types';
import { 
  Newspaper, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  RefreshCw, 
  Search,
  Filter
} from 'lucide-react';
import { newsApi } from '../../services/api';

interface NewsFeedListProps {
  news: NewsItem[];
  isLoading: boolean;
  onRefresh: () => void;
  activeFilter: 'today' | '7d' | '30d' | 'all';
  onFilterChange: (filter: 'today' | '7d' | '30d' | 'all') => void;
  activeSort: 'newest' | 'relevance';
  onSortChange: (sort: 'newest' | 'relevance') => void;
}

export const NewsFeedList: React.FC<NewsFeedListProps> = ({
  news,
  isLoading,
  onRefresh,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await newsApi.refresh();
      onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredNews = news.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.summary.toLowerCase().includes(term) ||
      item.source.toLowerCase().includes(term) ||
      item.tags.some(t => t.toLowerCase().includes(term))
    );
  });

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'Oficial':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Possível Risco':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'Relato de Usuário':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-red-500/10 border border-orange-500/30 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
              Oracle Free Tier News & Reddit Feed
            </h2>
            <p className="text-xs text-slate-400">
              Atualização diária de notícias, discussões de capacidade (Ampere A1) e relatos de cobranças
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          <span>Sincronizar Feeds</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Time Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'today', label: 'Hoje' },
            { key: '7d', label: 'Últimos 7 dias' },
            { key: '30d', label: 'Últimos 30 dias' }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === f.key
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar notícias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={activeSort}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="newest">Mais recentes</option>
            <option value="relevance">Mais relevantes</option>
          </select>
        </div>
      </div>

      {/* News Items List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-400 mb-2" />
          Carregando feed de notícias...
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
          Nenhuma notícia encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassificationBadge(item.classification)}`}>
                      {item.classificationBadge}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      {item.source}
                    </span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs md:text-sm font-bold text-white hover:text-orange-400 transition-colors flex items-center gap-1 inline-block"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 inline ml-1 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {item.summary}
              </p>

              {/* Reddit Disclaimer Banner */}
              {item.isDisclaimerRequired && (
                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[10px] text-amber-400/90 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Esta informação não foi confirmada oficialmente pela Oracle e baseia-se em discussões comunitárias do Reddit.</span>
                </div>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
