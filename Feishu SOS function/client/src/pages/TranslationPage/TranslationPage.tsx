import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { reloadCustomTranslations } from '@/i18n';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Edit3,
  RotateCcw,
  Check,
  X,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getAllTranslations,
  getCustomTranslations,
  updateTranslation,
  resetTranslation,
} from '@/api';
import type {
  TranslationNamespace,
  LanguageCode,
  TranslationItem,
} from '@shared/api.interface';

type TranslationData = Record<string, Record<string, unknown>>;

interface TreeNode {
  key: string;
  label: string;
  value?: string;
  path: string;
  children?: TreeNode[];
  isLeaf: boolean;
  isCustom?: boolean;
}

const NAMESPACES: TranslationNamespace[] = ['common', 'event', 'feedback', 'validation'];
const LANGUAGES: LanguageCode[] = ['zh', 'en'];

const TranslationPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translations, setTranslations] = useState<TranslationData>({});
  const [customTranslations, setCustomTranslations] = useState<TranslationItem[]>([]);
  
  const [selectedNamespace, setSelectedNamespace] = useState<TranslationNamespace>('common');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('zh');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allData, customData] = await Promise.all([
        getAllTranslations(),
        getCustomTranslations(),
      ]);
      setTranslations(allData);
      setCustomTranslations(customData);
    } catch (error) {
      toast.error('Failed to load translations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const customPaths = useMemo(() => {
    const paths = new Set<string>();
    customTranslations.forEach((item) => {
      paths.add(`${item.namespace}.${item.language}.${item.keyPath}`);
    });
    return paths;
  }, [customTranslations]);

  const buildTree = useCallback(
    (obj: Record<string, unknown>, prefix = ''): TreeNode[] => {
      const result: TreeNode[] = [];
      
      for (const key of Object.keys(obj).sort()) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;
        const isCustom = customPaths.has(`${selectedNamespace}.${selectedLanguage}.${path}`);
        
        if (typeof value === 'object' && value !== null) {
          result.push({
            key,
            label: key,
            path,
            children: buildTree(value as Record<string, unknown>, path),
            isLeaf: false,
            isCustom,
          });
        } else {
          result.push({
            key,
            label: key,
            value: String(value),
            path,
            isLeaf: true,
            isCustom,
          });
        }
      }
      
      return result;
    },
    [customPaths, selectedNamespace, selectedLanguage],
  );

  const currentTranslations = useMemo(() => {
    const nsData = translations[selectedNamespace];
    if (!nsData) return {};
    return (nsData[selectedLanguage] || {}) as Record<string, unknown>;
  }, [translations, selectedNamespace, selectedLanguage]);

  const treeData = useMemo(() => {
    return buildTree(currentTranslations);
  }, [currentTranslations, buildTree]);

  const filterTree = useCallback(
    (nodes: TreeNode[], query: string): TreeNode[] => {
      if (!query) return nodes;
      
      const lowerQuery = query.toLowerCase();
      const result: TreeNode[] = [];
      
      for (const node of nodes) {
        const matchesSelf = node.label.toLowerCase().includes(lowerQuery);
        
        if (node.isLeaf) {
          if (matchesSelf || (node.value && node.value.toLowerCase().includes(lowerQuery))) {
            result.push(node);
          }
        } else if (node.children) {
          const filteredChildren = filterTree(node.children, query);
          if (filteredChildren.length > 0 || matchesSelf) {
            result.push({
              ...node,
              children: filteredChildren,
            });
          }
        }
      }
      
      return result;
    },
    [],
  );

  const filteredTreeData = useMemo(() => {
    return filterTree(treeData, searchQuery);
  }, [treeData, searchQuery, filterTree]);

  const toggleNode = useCallback((path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const collectPaths = (nodes: TreeNode[], paths: Set<string>) => {
      for (const node of nodes) {
        if (!node.isLeaf) {
          paths.add(node.path);
          if (node.children) {
            collectPaths(node.children, paths);
          }
        }
      }
    };
    
    const allPaths = new Set<string>(['root']);
    collectPaths(filteredTreeData, allPaths);
    setExpandedNodes(allPaths);
  }, [filteredTreeData]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(['root']));
  }, []);

  const handleEdit = useCallback((node: TreeNode) => {
    setEditingPath(node.path);
    setEditingValue(node.value || '');
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingPath) return;
    
    setSaving(true);
    try {
      await updateTranslation({
        namespace: selectedNamespace,
        language: selectedLanguage,
        keyPath: editingPath,
        value: editingValue,
      });
      toast.success('Translation saved');
      await reloadCustomTranslations();
      await loadData();
      setEditingPath(null);
    } catch (error) {
      toast.error('Failed to save translation');
    } finally {
      setSaving(false);
    }
  }, [editingPath, editingValue, selectedNamespace, selectedLanguage, loadData]);

  const handleReset = useCallback(
    async (node: TreeNode) => {
      try {
        await resetTranslation(selectedNamespace, selectedLanguage, node.path);
        toast.success('Translation reset to default');
        await reloadCustomTranslations();
        await loadData();
      } catch (error) {
        toast.error('Failed to reset translation');
      }
    },
    [selectedNamespace, selectedLanguage, loadData],
  );

  const renderTreeNode = useCallback(
    (nodes: TreeNode[], level = 0) => {
      return nodes.map((node) => {
        const isExpanded = expandedNodes.has(node.path);
        const isEditing = editingPath === node.path;
        const paddingLeft = level * 20 + 12;

        return (
          <div key={node.path}>
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors ${
                node.isCustom ? 'bg-primary/5' : ''
              }`}
              style={{ paddingLeft }}
            >
              {!node.isLeaf && (
                <button
                  onClick={() => toggleNode(node.path)}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {node.isLeaf && <div className="w-5" />}
              
              <span className="font-medium text-sm min-w-[120px]">{node.label}</span>
              
              {node.isLeaf && (
                <>
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPath(null)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-muted-foreground truncate">
                        {node.value}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(node)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {node.isCustom && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReset(node)}
                          className="h-8 w-8 p-0"
                          title="Reset to default"
                        >
                          <RotateCcw className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
              
              {node.isCustom && (
                <Badge variant="secondary" className="text-xs">
                  Custom
                </Badge>
              )}
            </div>
            
            {!node.isLeaf && isExpanded && node.children && (
              <div>{renderTreeNode(node.children, level + 1)}</div>
            )}
          </div>
        );
      });
    },
    [
      expandedNodes,
      editingPath,
      editingValue,
      saving,
      toggleNode,
      handleEdit,
      handleSave,
      handleReset,
    ],
  );

  const customCount = useMemo(() => {
    return customTranslations.filter(
      (item) => item.namespace === selectedNamespace && item.language === selectedLanguage,
    ).length;
  }, [customTranslations, selectedNamespace, selectedLanguage]);

  return (
    <div className="h-full flex flex-col gap-6" data-ai-section-type="card-list">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Translation Management</h1>
          <p className="text-muted-foreground mt-1">
            View and edit all translation texts
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Namespace:</span>
          <div className="flex gap-1">
            {NAMESPACES.map((ns) => (
              <Button
                key={ns}
                size="sm"
                variant={selectedNamespace === ns ? 'default' : 'outline'}
                onClick={() => setSelectedNamespace(ns)}
              >
                {ns}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Language:</span>
          <div className="flex gap-1">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang}
                size="sm"
                variant={selectedLanguage === lang ? 'default' : 'outline'}
                onClick={() => setSelectedLanguage(lang)}
              >
                {lang === 'zh' ? '中文' : 'English'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search translations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={expandAll}>
            Expand All
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      <Card className="flex-1 min-h-0">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">
            {selectedNamespace} / {selectedLanguage === 'zh' ? '中文' : 'English'}
            {customCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {customCount} custom
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-[calc(100vh-380px)]">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 flex-1" />
                  </div>
                ))}
              </div>
            ) : filteredTreeData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? 'No matching translations found' : 'No translations'}
              </div>
            ) : (
              <div className="p-2">{renderTreeNode(filteredTreeData)}</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationPage;
