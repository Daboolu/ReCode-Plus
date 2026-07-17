'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  CheckCircle2,
  Code2,
  Loader2,
  Play,
  Save,
  SendHorizontal,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

import { executeCodeAction } from '@/actions/execute';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LANGUAGES } from '@/constants';
import { cn } from '@/lib/utils';

import type { AgentCopy } from './copy';
import type { AgentProblem } from './types';

interface CodeEditorDialogProps {
  open: boolean;
  copy: AgentCopy;
  sessionId: string;
  problem?: AgentProblem;
  initialLanguage: string;
  initialCode: string;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    language: string;
    code: string;
    executionOutput: string | null;
  }) => Promise<void>;
}

export default function CodeEditorDialog({
  open,
  copy,
  sessionId,
  problem,
  initialLanguage,
  initialCode,
  submitting,
  onOpenChange,
  onSubmit,
}: CodeEditorDialogProps) {
  const [language, setLanguage] = useState(initialLanguage || 'typescript');
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`recode-agent-draft:${sessionId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { language?: unknown; code?: unknown };
      if (
        typeof parsed.language === 'string' &&
        LANGUAGES.some((item) => item.value === parsed.language)
      ) {
        setLanguage(parsed.language);
      }
      if (typeof parsed.code === 'string') setCode(parsed.code);
    } catch {
      // Ignore an invalid browser draft and keep the persisted submission.
    }
  }, [sessionId]);

  const runCode = async () => {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setOutput(null);
    setRunError(false);

    try {
      const result = await executeCodeAction(language, code);
      setOutput(result.output || 'Execution finished with no output.');
      setRunError(Boolean(result.error || !result.success));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : copy.codeError);
      setRunError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(
        `recode-agent-draft:${sessionId}`,
        JSON.stringify({ language, code }),
      );
      toast.success(copy.draftSaved);
    } catch {
      toast.error(copy.codeError);
    }
  };

  const submit = async () => {
    if (!code.trim() || submitting) return;
    onOpenChange(false);
    await onSubmit({ language, code, executionOutput: output });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[92vh] max-h-[920px] w-[calc(100vw-1rem)] max-w-[1500px] flex-col gap-0 overflow-hidden border-white/80 bg-white p-0 shadow-2xl sm:w-[calc(100vw-3rem)] sm:max-w-[1500px] data-[state=open]:slide-in-from-right-10 data-[state=closed]:slide-out-to-right-10 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:duration-350 data-[state=closed]:duration-250 data-[state=open]:ease-out data-[state=closed]:ease-in motion-reduce:data-[state=open]:slide-in-from-right-0 motion-reduce:data-[state=closed]:slide-out-to-right-0 motion-reduce:data-[state=open]:duration-0 motion-reduce:data-[state=closed]:duration-0"
      >
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-white px-5 py-4 pr-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate">
                <Code2 className="size-5 text-[#ffa116]" />
                {problem ? `${problem.pid}. ${problem.title}` : copy.editorTitle}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                {copy.editorPrompt}
              </DialogDescription>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-9 w-[145px] rounded-xl bg-gray-50">
                <SelectValue placeholder={copy.language} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-[45vh] border-b border-gray-200 bg-[#fbfbfb] lg:min-h-0 lg:border-b-0 lg:border-r">
            <Editor
              height="100%"
              language={language}
              theme="light"
              value={code}
              onChange={(value) => setCode(value || '')}
              loading={
                <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
                  <Loader2 className="size-4 animate-spin" />
                  Loading editor…
                </div>
              }
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                lineHeight: 24,
                scrollBeyondLastLine: false,
                padding: { top: 18, bottom: 18 },
                automaticLayout: true,
                wordWrap: 'on',
                tabSize: 2,
              }}
            />
          </div>

          <aside className="flex min-h-48 flex-col bg-gray-950 text-gray-100 lg:min-h-0">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300">
                <Terminal className="size-4 text-emerald-400" />
                {copy.console}
              </div>
              {output !== null && !isRunning && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    runError ? 'text-rose-400' : 'text-emerald-400',
                  )}
                >
                  <CheckCircle2 className="size-3" />
                  {runError ? 'Error' : 'Finished'}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-6 sm:text-sm">
              {isRunning ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="size-4 animate-spin" />
                  {copy.running}
                </div>
              ) : output !== null ? (
                <pre
                  className={cn(
                    'whitespace-pre-wrap break-words',
                    runError ? 'text-rose-300' : 'text-emerald-300',
                  )}
                >
                  {output}
                </pre>
              ) : (
                <p className="font-sans text-sm text-gray-500">{copy.noOutput}</p>
              )}
            </div>
          </aside>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={saveDraft}
            className="rounded-xl text-gray-500"
          >
            <Save className="size-4" />
            {copy.saveDraft}
          </Button>

          <div className="flex flex-1 justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!code.trim() || isRunning || submitting}
              onClick={() => void runCode()}
              className="rounded-xl"
            >
              {isRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              <span className="hidden sm:inline">{isRunning ? copy.running : copy.run}</span>
            </Button>
            <Button
              type="button"
              disabled={!code.trim() || isRunning || submitting}
              onClick={() => void submit()}
              className="rounded-xl bg-[#ffa116] text-white hover:bg-orange-500"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
              {submitting ? copy.submittingCode : copy.submitCode}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
