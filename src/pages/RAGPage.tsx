import { useState, useEffect, useRef } from 'react';
import { VectorStore } from '../lib/vectorStore';
import { RAGRetriever, type HybridSearchResult } from '../lib/rag';
import { loadEmbeddingModel, isEmbeddingModelLoaded } from '../lib/embedding';
import { Term } from '../components/Term';
import { toast, ToastContainer, type ToastMessage } from '../components/Toast';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  chunks: number;
  createdAt: number;
}

type ViewMode = 'index' | 'search' | 'results';

export default function RAGPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('index');
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [vectorWeight, setVectorWeight] = useState(0.7);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'vector' | 'bm25'>('hybrid');
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(50);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const vectorStoreRef = useRef<VectorStore | null>(null);
  const retrieverRef = useRef<RAGRetriever | null>(null);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  // 初始化向量数据库
  useEffect(() => {
    const init = async () => {
      const store = new VectorStore('ragKnowledgeBase');
      await store.init();
      vectorStoreRef.current = store;
      retrieverRef.current = new RAGRetriever(store);

      // 加载已索引文档列表
      const count = await store.count();
      if (count > 0) {
        const docs = await store.getAllDocuments();
        const uniqueDocs = new Map<string, KnowledgeDoc>();

        docs.forEach((doc) => {
          const parentId = doc.metadata?.parentId || doc.id;
          if (!uniqueDocs.has(parentId)) {
            uniqueDocs.set(parentId, {
              id: parentId,
              title: doc.metadata?.title || '未命名文档',
              content: doc.text,
              chunks: 1,
              createdAt: doc.createdAt,
            });
          } else {
            uniqueDocs.get(parentId)!.chunks++;
          }
        });

        setDocuments(Array.from(uniqueDocs.values()));
      }
    };

    init().catch(console.error);
  }, []);

  const handleLoadModel = async () => {
    try {
      setProcessing(true);
      await loadEmbeddingModel('Xenova/all-MiniLM-L6-v2', (progress) => {
        setLoadProgress(Math.round(progress));
      });
      setModelLoaded(true);
      toast.success('模型加载成功', '384 维 Embedding 模型已就绪');
    } catch (err) {
      console.error('模型加载失败:', err);
      toast.error('模型加载失败', '请检查网络连接并重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleIndexDocument = async () => {
    if (!isEmbeddingModelLoaded()) {
      toast.warning('请先加载模型', '需要先加载 Embedding 模型才能索引文档');
      return;
    }

    if (!docTitle.trim() || !docContent.trim()) {
      toast.warning('请完善信息', '文档标题和内容都不能为空');
      return;
    }

    const retriever = retrieverRef.current;
    if (!retriever) return;

    try {
      setProcessing(true);

      const docId = `doc_${Date.now()}`;
      const chunksCount = await retriever.indexDocument(
        docId,
        docContent,
        { pooling: 'mean', normalize: true },
        { maxChunkSize: chunkSize, overlap, strategy: 'sentence' },
        { title: docTitle }
      );

      const newDoc: KnowledgeDoc = {
        id: docId,
        title: docTitle,
        content: docContent,
        chunks: chunksCount,
        createdAt: Date.now(),
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setDocTitle('');
      setDocContent('');
      toast.success('索引完成', `文档已分块并索引：${chunksCount} 个片段`);
    } catch (err) {
      console.error('索引失败:', err);
      toast.error('索引失败', '处理文档时出错，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleSearch = async () => {
    if (!isEmbeddingModelLoaded()) {
      toast.warning('请先加载模型', '需要先加载 Embedding 模型才能搜索');
      return;
    }

    if (!query.trim()) {
      toast.warning('请输入搜索内容', '搜索查询不能为空');
      return;
    }

    const retriever = retrieverRef.current;
    if (!retriever) return;

    try {
      setProcessing(true);
      setViewMode('results');

      let results: HybridSearchResult[] = [];

      if (searchMode === 'hybrid') {
        results = await retriever.search(query, {
          k: 5,
          vectorWeight,
          bm25Weight: 1 - vectorWeight,
          threshold: 0.0,
        });
      } else if (searchMode === 'vector') {
        const vectorResults = await retriever.vectorSearch(query, 5, 0.0);
        results = vectorResults.map((r) => ({
          document: r.document,
          score: r.similarity,
          vectorScore: r.similarity,
          bm25Score: 0,
        }));
      } else {
        const bm25Results = retriever.bm25Search(query, 5);
        const allDocs = await vectorStoreRef.current!.getAllDocuments();
        results = bm25Results.map((r) => {
          const doc = allDocs.find((d) => d.id === r.id)!;
          return {
            document: doc,
            score: r.score,
            vectorScore: 0,
            bm25Score: r.score,
          };
        });
      }

      setSearchResults(results);

      if (results.length === 0) {
        toast.info('未找到结果', '尝试调整搜索查询或检索模式');
      } else {
        toast.success('搜索完成', `找到 ${results.length} 个相关片段`);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      toast.error('搜索失败', '检索过程出错，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有索引文档吗？此操作不可撤销。')) return;

    const retriever = retrieverRef.current;
    if (!retriever) return;

    try {
      await retriever.clear();
      setDocuments([]);
      setSearchResults([]);
      toast.success('清空完成', '所有文档已从索引中移除');
    } catch (err) {
      console.error('清空失败:', err);
      toast.error('清空失败', '操作过程中出错');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ToastContainer toasts={toasts} onClose={(id) => toast.close(id)} />

      <header className="border-b border-line bg-surface-1 px-6 py-4">
        <h1 className="text-[18px] font-semibold text-ink">
          <Term id="rag">RAG</Term> 检索增强生成
        </h1>
        <p className="mt-1 text-[12px] text-ink-2">
          混合检索：向量相似度 + BM25 关键词匹配
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <aside className="w-80 overflow-y-auto border-r border-line bg-surface p-5 space-y-5">
          {/* 模型加载 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">1. 加载模型</h2>
            {!modelLoaded ? (
              <button
                type="button"
                className="w-full rounded-md bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                onClick={handleLoadModel}
                disabled={processing}
              >
                {processing ? `加载中... ${loadProgress}%` : '加载 Embedding 模型'}
              </button>
            ) : (
              <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">
                ✓ 模型已加载（384 维）
              </div>
            )}
          </section>

          {/* 索引文档 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">2. 索引文档</h2>

            <input
              type="text"
              className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
              placeholder="文档标题..."
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
            />

            <textarea
              className="w-full resize-none rounded-md border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
              rows={8}
              placeholder="文档内容（将自动分块）..."
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
            />

            <div className="flex gap-2">
              <label className="flex-1 text-[11px] text-ink-2">
                <span className="mb-1 block">块大小</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-line bg-surface-1 px-2 py-1 text-[12px] text-ink focus:border-accent focus:outline-none"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  min={100}
                  max={1000}
                />
              </label>

              <label className="flex-1 text-[11px] text-ink-2">
                <span className="mb-1 block">重叠</span>
                <input
                  type="number"
                  className="w-full rounded-md border border-line bg-surface-1 px-2 py-1 text-[12px] text-ink focus:border-accent focus:outline-none"
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  min={0}
                  max={200}
                />
              </label>
            </div>

            <button
              type="button"
              className="w-full rounded-md border border-accent bg-accent/10 px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
              onClick={handleIndexDocument}
              disabled={!modelLoaded || processing}
            >
              {processing ? '索引中...' : '索引文档'}
            </button>

            <div className="rounded-md border border-obs-line bg-obs-2 px-3 py-2 text-[11px] text-obs-ink2">
              已索引：{documents.length} 个文档
            </div>
          </section>

          {/* 搜索设置 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">3. 搜索</h2>

            <input
              type="text"
              className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink placeholder-ink-3 focus:border-accent focus:outline-none"
              placeholder="输入搜索查询..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />

            <label className="block text-[12px] text-ink-2">
              <span className="mb-1 block">搜索模式</span>
              <select
                className="w-full rounded-[6px] border border-line bg-surface-1 px-3 py-2 text-[12px] text-ink transition-colors focus:border-accent focus:outline-none hover:border-line/80"
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as any)}
              >
                <option value="hybrid">混合检索</option>
                <option value="vector">纯向量</option>
                <option value="bm25">纯 BM25</option>
              </select>
            </label>

            {searchMode === 'hybrid' && (
              <label className="block text-[12px] text-ink-2">
                <span className="mb-1 flex justify-between">
                  <span>向量权重</span>
                  <span className="font-medium text-ink">{vectorWeight.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full accent-accent"
                  value={vectorWeight}
                  onChange={(e) => setVectorWeight(Number(e.target.value))}
                />
                <span className="mt-1 block text-[11px] text-obs-ink2">
                  BM25 权重: {(1 - vectorWeight).toFixed(2)}
                </span>
              </label>
            )}

            <button
              type="button"
              className="w-full rounded-md bg-measure-500 px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              onClick={handleSearch}
              disabled={!modelLoaded || processing || documents.length === 0}
            >
              {processing ? '搜索中...' : '搜索'}
            </button>
          </section>

          {/* 管理 */}
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-ink">4. 管理</h2>
            <button
              type="button"
              className="w-full rounded-md border border-line bg-obs-2 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-red-400/40 hover:text-red-400 disabled:opacity-50"
              onClick={handleClearAll}
              disabled={documents.length === 0}
            >
              清空所有文档
            </button>
          </section>
        </aside>

        {/* 右侧内容区域 */}
        <main className="flex-1 overflow-y-auto bg-obs-1 p-6">
          {viewMode === 'index' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-medium text-obs-ink">已索引文档</h3>
              {documents.length === 0 ? (
                <p className="text-[12px] text-obs-ink2">尚无文档，请先索引</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-md border border-obs-line bg-obs-2 p-4"
                    >
                      <h4 className="text-[13px] font-medium text-obs-ink">
                        {doc.title}
                      </h4>
                      <p className="mt-2 text-[12px] text-obs-ink2 line-clamp-2">
                        {doc.content}
                      </p>
                      <p className="mt-2 text-[11px] text-obs-ink2/60">
                        {doc.chunks} 个片段 · {new Date(doc.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium text-obs-ink">
                  搜索结果：「{query}」
                </h3>
                <button
                  type="button"
                  className="rounded-md border border-obs-line bg-obs-2 px-3 py-1.5 text-[12px] text-obs-ink2 transition-colors hover:border-measure-400/40 hover:text-obs-ink"
                  onClick={() => setViewMode('index')}
                >
                  返回列表
                </button>
              </div>

              {searchResults.length === 0 ? (
                <p className="text-[12px] text-obs-ink2">未找到相关结果</p>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result, i) => (
                    <div
                      key={result.document.id}
                      className="rounded-md border border-obs-line bg-obs-2 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-[13px] font-medium text-obs-ink">
                          #{i + 1} {result.document.metadata?.title || '未命名'}
                        </h4>
                        <span className="rounded bg-measure-500/20 px-2 py-0.5 text-[11px] font-mono text-measure-300">
                          {result.score.toFixed(3)}
                        </span>
                      </div>

                      <p className="mt-2 text-[12px] text-obs-ink2">
                        {result.document.text}
                      </p>

                      <div className="mt-2 flex gap-3 text-[11px] text-obs-ink2/60">
                        <span>向量: {result.vectorScore.toFixed(3)}</span>
                        <span>BM25: {result.bm25Score.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
