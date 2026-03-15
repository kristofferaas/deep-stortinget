import { convexQuery } from "@convex-dev/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { IconDots, IconMessageCircle, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "~/components/ui/sidebar";

import { api } from "../../../convex/_generated/api";

const RECENT_THREADS_LIMIT = 5;

export function AppNavThreads() {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const renameThreadFn = useConvexMutation(api.chat.renameThread);
  const deleteThreadFn = useConvexMutation(api.chat.deleteThread);
  const renameThreadMutation = useMutation({ mutationFn: renameThreadFn });
  const deleteThreadMutation = useMutation({ mutationFn: deleteThreadFn });
  const { data: threads = [], isPending } = useQuery({
    ...convexQuery(api.chat.listThreads),
    placeholderData: [],
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeThreadId = /^\/threads\/([^/]+)$/.exec(pathname)?.[1] ?? null;
  const recentThreads = threads.slice(0, RECENT_THREADS_LIMIT);
  const hasMoreThreads = threads.length > RECENT_THREADS_LIMIT;
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const renameThread = threads.find((thread) => thread.id === renameThreadId) ?? null;
  const deleteThread = threads.find((thread) => thread.id === deleteThreadId) ?? null;

  useEffect(() => {
    setRenameDraft(renameThread?.title ?? "");
  }, [renameThread]);

  async function handleCreateThread() {
    await navigate({ to: "/threads" });
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renameThread || renameThreadMutation.isPending) {
      return;
    }

    const title = renameDraft.trim();
    if (!title || title === renameThread.title) {
      setRenameThreadId(null);
      return;
    }

    await renameThreadMutation.mutateAsync({ threadId: renameThread.id, title });
    setRenameThreadId(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteThread || deleteThreadMutation.isPending) {
      return;
    }

    const targetThreadId = deleteThread.id;
    await deleteThreadMutation.mutateAsync({ threadId: targetThreadId });
    setDeleteThreadId(null);

    if (activeThreadId === targetThreadId) {
      await navigate({ to: "/threads", replace: true });
    }
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Threads</SidebarGroupLabel>
        <SidebarGroupAction aria-label="Create thread" onClick={() => void handleCreateThread()}>
          <IconPlus />
        </SidebarGroupAction>
        <SidebarMenu>
          {isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            : null}

          {!isPending
            ? recentThreads.map((thread) => {
                const actionDisabled =
                  renameThreadMutation.isPending || deleteThreadMutation.isPending;

                return (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      render={<Link to="/threads/$threadId" params={{ threadId: thread.id }} />}
                      isActive={activeThreadId === thread.id}
                      tooltip={thread.title}
                    >
                      <span>{thread.title}</span>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuAction showOnHover className="aria-expanded:bg-muted" />
                        }
                      >
                        <IconDots />
                        <span className="sr-only">Manage thread</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-40"
                        side={isMobile ? "bottom" : "right"}
                        align={isMobile ? "end" : "start"}
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            disabled={actionDisabled}
                            onClick={() => setRenameThreadId(thread.id)}
                          >
                            <IconPencil />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={actionDisabled}
                            onClick={() => setDeleteThreadId(thread.id)}
                          >
                            <IconTrash />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                );
              })
            : null}

          {!isPending && recentThreads.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/threads" />}>
                <span>No threads yet</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          {!isPending && hasMoreThreads ? (
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/threads" />}>
                <IconDots />
                <span>More</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog
        open={Boolean(renameThread)}
        onOpenChange={(open) => !open && setRenameThreadId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename thread</DialogTitle>
            <DialogDescription>
              Give the conversation a clearer title in the sidebar.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleRenameSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="sidebar-rename-thread-title">Thread title</FieldLabel>
                <FieldContent>
                  <Input
                    id="sidebar-rename-thread-title"
                    autoFocus
                    value={renameDraft}
                    disabled={renameThreadMutation.isPending}
                    onChange={(event) => setRenameDraft(event.target.value)}
                  />
                  <FieldDescription>Keep it short and descriptive.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameThreadId(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameDraft.trim() || renameThreadMutation.isPending}
              >
                {renameThreadMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteThread)}
        onOpenChange={(open) => !open && setDeleteThreadId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <IconTrash />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete thread</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteThread
                ? `This removes "${deleteThread.title}" and its message history.`
                : "This removes the selected thread and its message history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteThreadMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteThreadMutation.isPending}
              onClick={() => void handleDeleteConfirm()}
            >
              {deleteThreadMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
