export type Lang = "cs" | "pl";

export const LANGS: readonly Lang[] = ["cs", "pl"];

export const LANG_NAMES: Record<Lang, string> = {
  cs: "Czech",
  pl: "Polish",
};

export type Severity = "error" | "warning";

export interface Finding {
  rule: string;
  severity: Severity;
  /** Flattened i18next key, e.g. "products.cup.detail". Empty for file-level findings. */
  key: string;
  /** 1-based line in the source file, when known. */
  line?: number;
  /** Short statement of what is wrong. */
  message: string;
  /** Plain-English consequence for readers who don't speak the language. */
  explanation: string;
  /** Present when `--fix` can rewrite this automatically. Snippets around the change. */
  fix?: { before: string; after: string };
}

export interface Edit {
  start: number;
  end: number;
  replacement: string;
}

/** A problem inside a single string, with the edits that fix it. */
export interface TextIssue {
  rule: string;
  edits: Edit[];
  message: string;
  explanation: string;
}

export type TextRule = (value: string) => TextIssue[];

export interface Entry {
  key: string;
  value: string;
  line?: number;
}

export interface RuleContext {
  lang: Lang;
  entries: Entry[];
}

export type Rule = (ctx: RuleContext) => Finding[];

export interface FileResult {
  file: string;
  lang: Lang;
  findings: Finding[];
}
