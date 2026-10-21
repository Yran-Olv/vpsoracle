import React, { useState, useEffect } from 'react';
import { NewsFeedList } from '../components/News/NewsFeedList';
import { newsApi } from '../services/api';
import { NewsItem } from '../types';
import { Newspaper } from 'lucide-react';

export const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'relevance'>('newest');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const data = await newsApi.getAll(filter, sort);
      setNews(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [filter, sort]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
          <Newspaper className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Notícias & Comunidade Reddit</h1>
          <p className="text-xs text-slate-400">
            Feed diário com alertas sobre capacidade Ampere A1, cobranças, políticas e relatos de usuários
          </p>
        </div>
      </div>

      <NewsFeedList
        news={news}
        isLoading={isLoading}
        onRefresh={fetchNews}
        activeFilter={filter}
        onFilterChange={setFilter}
        activeSort={sort}
        onSortChange={setSort}
      />
    </div>
  );
};
