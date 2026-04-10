"use client";

import React, { useEffect, useState } from "react";
import { MoreHorizontal, Loader2, Edit2 } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useBuildStore } from "@/hooks/use-build-store";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, TrashIcon } from "@/components/sidebar-03/animated-icons";
import { BentoCard } from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";

export default function ProjectsSettingsPage() {
  const {
    projects,
    fetchProjects,
    deleteProject,
    renameProject,
    createProject,
  } = useBuildStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UntypedJson>(null);
  const [newName, setNewName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      await fetchProjects(controller.signal);
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [fetchProjects]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    setIsActionLoading(true);
    await renameProject(selectedProject.id, newName);
    setIsActionLoading(false);
    setIsRenameOpen(false);
    setSelectedProject(null);
    setNewName("");
  };

  const handleDelete = async () => {
    setIsActionLoading(true);
    await deleteProject(selectedProject.id);
    setIsActionLoading(false);
    setIsDeleteOpen(false);
    setSelectedProject(null);
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    setIsActionLoading(true);
    await createProject(newProjectName, "");
    setIsActionLoading(false);
    setIsCreateOpen(false);
    setNewProjectName("");
  };

  const openRename = (project: UntypedJson) => {
    setSelectedProject(project);
    setNewName(project.name);
    setIsRenameOpen(true);
  };

  const openDelete = (project: UntypedJson) => {
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Projects"
        description="Manage your AI-generated smart contract projects."
        action={
          <Button
            onClick={() => setIsCreateOpen(true)}
            tone="primary"
            size="sm"
            className="h-8"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />

      <BentoCard noPadding>
        <SettingsTable>
          <SettingsTableHeader>
            <SettingsTableHeaderRow>
              <SettingsTableHead className="w-[300px]">Name</SettingsTableHead>
              <SettingsTableHead>Description</SettingsTableHead>
              <SettingsTableHead>Last Updated</SettingsTableHead>
              <SettingsTableHead className="text-right">
                Actions
              </SettingsTableHead>
            </SettingsTableHeaderRow>
          </SettingsTableHeader>
          <SettingsTableBody>
            {isLoading ? (
              <SettingsTableRow>
                <SettingsTableEmptyCell colSpan={4}>
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--bento-text-muted)]" />
                </SettingsTableEmptyCell>
              </SettingsTableRow>
            ) : projects.length === 0 ? (
              <SettingsTableRow>
                <SettingsTableEmptyCell colSpan={4}>
                  No projects found. Create one to get started!
                </SettingsTableEmptyCell>
              </SettingsTableRow>
            ) : (
              projects.map((project) => (
                <SettingsTableRow key={project.id}>
                  <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                    {project.name}
                  </SettingsTableCell>
                  <SettingsTableCell>
                    {project.description || "-"}
                  </SettingsTableCell>
                  <SettingsTableCell>
                    {project.updatedAt
                      ? formatDistanceToNow(new Date(project.updatedAt), {
                          addSuffix: true,
                        })
                      : "-"}
                  </SettingsTableCell>
                  <SettingsTableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => openRename(project)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDelete(project)}
                          className="cursor-pointer"
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SettingsTableCell>
                </SettingsTableRow>
              ))
            )}
          </SettingsTableBody>
        </SettingsTable>
      </BentoCard>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="border-[var(--bento-border)] bg-[var(--bento-bg)] text-[var(--bento-text-primary)]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription className="text-[var(--bento-text-muted)]">
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-[var(--bento-text-primary)]"
              >
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border-[var(--bento-border)] bg-white/[0.03] text-[var(--bento-text-primary)] focus-visible:ring-[var(--bento-border)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              className="border-[var(--bento-border)] text-[var(--bento-text-primary)] hover:bg-white/5 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isActionLoading}
              className="bg-[var(--bento-btn-primary-bg)] text-[var(--bento-btn-primary-text)] hover:bg-[var(--bento-btn-primary-bg)]/90"
            >
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-[var(--bento-border)] bg-[var(--bento-bg)] text-[var(--bento-text-primary)]">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="text-[var(--bento-text-muted)]">
              Are you sure you want to delete{" "}
              <span className="font-bold text-[var(--bento-text-primary)]">
                {selectedProject?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-[var(--bento-border)] text-[var(--bento-text-primary)] hover:bg-white/5 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isActionLoading}
              className="settings-destructive-button"
            >
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Delete Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border-[var(--bento-border)] bg-[var(--bento-bg)] text-[var(--bento-text-primary)]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription className="text-[var(--bento-text-muted)]">
              Create a new project to start building your dApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="new-name"
                className="text-[var(--bento-text-primary)]"
              >
                Project Name
              </Label>
              <Input
                id="new-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My DeFi Protocol"
                className="border-[var(--bento-border)] bg-white/[0.03] text-[var(--bento-text-primary)] focus-visible:ring-[var(--bento-border)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="border-[var(--bento-border)] text-[var(--bento-text-primary)] hover:bg-white/5 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isActionLoading}
              className="settings-primary-button"
            >
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}
