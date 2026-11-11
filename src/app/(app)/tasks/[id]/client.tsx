"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addComment, deleteComment, deleteTask } from "@/app/actions/tasks";
import { ActionForm, ConfirmButton, Submit } from "@/components/forms";

export function CommentBox({ taskId }: { taskId: string }) {
  return (
    <ActionForm action={addComment} resetOnSuccess className="mt-5">
      <input type="hidden" name="taskId" value={taskId} />
      <textarea name="body" rows={3} required className="field" placeholder="Write an update, ask a question or request documents…" />
      <div className="mt-2 flex justify-end">
        <Submit pendingText="Posting…">Post comment</Submit>
      </div>
    </ActionForm>
  );
}

export function DeleteCommentButton({ id }: { id: string }) {
  return (
    <ConfirmButton action={() => deleteComment(id)} label="Delete comment" confirm="Delete this comment?" className="icon-btn size-6 opacity-0 hover:text-red-400 group-hover:opacity-100 max-lg:opacity-100">
      <X className="size-3.5" />
    </ConfirmButton>
  );
}

export function DeleteTaskButton({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <ConfirmButton
      action={async () => {
        await deleteTask(id);
        router.push("/tasks");
      }}
      label="Delete task"
      confirm={`Delete "${title}"? Comments and history will be removed too.`}
      className="btn-danger px-2.5"
    >
      {children}
    </ConfirmButton>
  );
}
