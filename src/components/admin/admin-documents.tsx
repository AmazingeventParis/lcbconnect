"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Plus,
  MoreHorizontal,
  Upload,
  FolderRoot,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import type { Profile, Document, DocumentFolder } from "@/lib/supabase/types";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";

interface AdminDocumentsProps {
  profile: Profile;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

type FolderNode = DocumentFolder & { children: FolderNode[] };

function buildTree(folders: DocumentFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function AdminDocuments({ profile }: AdminDocumentsProps) {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<
    string | null
  >(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "folder" | "document";
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/documents");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFolders(data.folders);
      setDocuments(data.documents);
    } catch {
      toast.error("Erreur lors du chargement des documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats
  const totalDocs = documents.length;
  const publishedDocs = documents.filter((d) => d.is_published).length;
  const unpublishedDocs = totalDocs - publishedDocs;
  const totalFolders = folders.length;

  // Documents for selected folder
  const currentDocuments = documents.filter((d) =>
    selectedFolderId === null
      ? d.folder_id === null
      : d.folder_id === selectedFolderId
  );

  const tree = buildTree(folders);

  // Folder actions
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          name: newFolderName.trim(),
          parent_id: createFolderParentId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Dossier créé");
      setCreateFolderOpen(false);
      setNewFolderName("");
      setCreateFolderParentId(null);
      if (createFolderParentId) {
        setExpandedFolders((prev) => new Set([...prev, createFolderParentId!]));
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du dossier");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRenameFolder() {
    if (!renameFolderId || !renameFolderName.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: renameFolderId,
          name: renameFolderName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Dossier renommé");
      setRenameFolderId(null);
      setRenameFolderName("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du renommage");
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/documents?type=${deleteTarget.type}&id=${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success(
        deleteTarget.type === "folder"
          ? "Dossier supprimé"
          : "Document supprimé"
      );
      setDeleteTarget(null);
      if (
        deleteTarget.type === "folder" &&
        selectedFolderId === deleteTarget.id
      ) {
        setSelectedFolderId(null);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePublish(doc: Document) {
    setTogglingPublish(doc.id);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: doc.is_published ? "unpublish" : "publish",
          documentId: doc.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success(
        doc.is_published ? "Document dépublié" : "Document publié"
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setTogglingPublish(null);
    }
  }

  function toggleExpand(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function handleUploadCreated() {
    setUploadOpen(false);
    fetchData();
  }

  // Count documents in a folder (including subfolders)
  function countDocsInFolder(folderId: string): number {
    let count = documents.filter((d) => d.folder_id === folderId).length;
    const children = folders.filter((f) => f.parent_id === folderId);
    for (const child of children) {
      count += countDocsInFolder(child.id);
    }
    return count;
  }

  // Render folder tree recursively
  function renderFolderNode(node: FolderNode, depth: number = 0) {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children.length > 0;
    const docCount = countDocsInFolder(node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${
            isSelected
              ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium"
              : "hover:bg-muted"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setSelectedFolderId(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4.5" />
          )}

          {isExpanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-600" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-600" />
          )}

          <span className="text-sm truncate flex-1">{node.name}</span>

          {docCount > 0 && (
            <span className="text-xs text-muted-foreground">{docCount}</span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setCreateFolderParentId(node.id);
                  setNewFolderName("");
                  setCreateFolderOpen(true);
                }}
              >
                <FolderPlus className="size-4 mr-2" />
                Sous-dossier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setRenameFolderId(node.id);
                  setRenameFolderName(node.name);
                }}
              >
                <Pencil className="size-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() =>
                  setDeleteTarget({
                    type: "folder",
                    id: node.id,
                    name: node.name,
                  })
                }
              >
                <Trash2 className="size-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded &&
          node.children.map((child) => renderFolderNode(child, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedFolderName =
    selectedFolderId === null
      ? "Racine / Non classé"
      : folders.find((f) => f.id === selectedFolderId)?.name ?? "Dossier";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">
          Gestion des documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Organisez les documents en dossiers et gérez leur publication.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total documents",
            value: totalDocs,
            icon: FileText,
            color: "text-[#1E3A5F]",
            bg: "bg-[#1E3A5F]/10",
          },
          {
            label: "Publiés",
            value: publishedDocs,
            icon: Eye,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Non publiés",
            value: unpublishedDocs,
            icon: EyeOff,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Dossiers",
            value: totalFolders,
            icon: Folder,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="gap-0 py-0">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <div className={`rounded-lg p-1.5 ${bg}`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main layout: Tree + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Folder tree */}
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Dossiers</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setCreateFolderParentId(null);
                  setNewFolderName("");
                  setCreateFolderOpen(true);
                }}
              >
                <FolderPlus className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {/* Root node */}
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                selectedFolderId === null
                  ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium"
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <span className="w-4.5" />
              <FolderRoot className="size-4 shrink-0 text-slate-500" />
              <span className="text-sm truncate flex-1">
                Racine / Non classé
              </span>
              {documents.filter((d) => !d.folder_id).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {documents.filter((d) => !d.folder_id).length}
                </span>
              )}
            </div>

            {/* Folder tree */}
            {tree.map((node) => renderFolderNode(node))}

            {folders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun dossier créé
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right: Documents list */}
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Folder className="size-4 shrink-0 text-amber-600" />
                <CardTitle className="text-sm font-semibold truncate">
                  {selectedFolderName}
                </CardTitle>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {currentDocuments.length} doc
                  {currentDocuments.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Button
                size="sm"
                className="h-7 shrink-0"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="size-3.5" />
                <span className="hidden sm:inline ml-1">Upload</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {currentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Aucun document dans ce dossier
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setUploadOpen(true)}
                >
                  <Plus className="size-4" />
                  Ajouter un document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {currentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-red-50 dark:bg-red-950 p-2">
                      <FileText className="size-4 text-red-600 dark:text-red-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {DOCUMENT_CATEGORIES[
                            doc.category as DocumentCategory
                          ]?.label ?? doc.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doc.year}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={doc.is_published ? "default" : "secondary"}
                      className={`shrink-0 text-xs ${
                        doc.is_published
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : ""
                      }`}
                    >
                      {doc.is_published ? "Publié" : "Brouillon"}
                    </Badge>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={togglingPublish === doc.id}
                        onClick={() => handleTogglePublish(doc)}
                        title={
                          doc.is_published ? "Dépublier" : "Publier"
                        }
                      >
                        {togglingPublish === doc.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : doc.is_published ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          setDeleteTarget({
                            type: "document",
                            id: doc.id,
                            name: doc.title,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {createFolderParentId
                ? "Nouveau sous-dossier"
                : "Nouveau dossier"}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nom du dossier"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateFolderOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || creatingFolder}
            >
              {creatingFolder && (
                <Loader2 className="size-4 animate-spin mr-1" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog
        open={!!renameFolderId}
        onOpenChange={(open) => {
          if (!open) setRenameFolderId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nouveau nom"
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderId(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!renameFolderName.trim() || renaming}
            >
              {renaming && <Loader2 className="size-4 animate-spin mr-1" />}
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? `Le dossier "${deleteTarget.name}" et tous ses sous-dossiers seront supprimés. Les documents qu'il contient seront déplacés à la racine.`
                : `Le document "${deleteTarget?.name}" sera supprimé définitivement.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-1" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload document dialog */}
      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        profile={profile}
        onCreated={handleUploadCreated}
        folderId={selectedFolderId}
      />
    </div>
  );
}
