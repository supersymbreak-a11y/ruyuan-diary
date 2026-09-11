"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, Download, Upload } from "lucide-react";
import { useNotes } from "@/lib/store";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

export function BackupNavItem() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const importJson = useNotes((state) => state.importJson);

  const exportBackup = () => {
    const state = useNotes.getState();
    const payload = {
      version: 2,
      pulls: state.pulls,
      resources: state.resources,
      ledger: state.ledger,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ruyuan-notes.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("备份已导出");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-fg transition-colors"
      >
        <DatabaseBackup className="size-5" />
        备份
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="数据备份">
        <p className="mb-4 text-sm leading-6 text-hint">
          导出和导入的是你的个人抽卡记录、资源。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={exportBackup}>
            <Download className="size-4" />
            导出备份
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            导入备份
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              importJson(await file.text());
              setMessage("备份已导入");
            } catch {
              setMessage("导入失败，请确认备份文件格式正确");
            } finally {
              event.target.value = "";
            }
          }}
        />
        {message ? <p className="mt-3 text-center text-xs text-hint">{message}</p> : null}
      </Sheet>
    </>
  );
}
