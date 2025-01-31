import {EditorView, keymap, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, dropCursor} from "@codemirror/view"
import {EditorState, Transaction, EditorSelection, SelectionRange, Prec} from "@codemirror/state"
import {indentOnInput, bracketMatching, indentUnit, syntaxHighlighting} from "@codemirror/language"
import {defaultKeymap, historyKeymap, indentWithTab, history} from "@codemirror/commands"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {highlightSelectionMatches, search} from "search"
import {autocompletion, completionKeymap} from "@codemirror/autocomplete"
import {markdown, markdownLanguage } from "@codemirror/lang-markdown"
import {ankiImagePaste } from "./CodeMirror.extensions/ankiImagePaste"
import {classHighlighter} from '@lezer/highlight'
import {Subscript, Superscript, Strikethrough, Table} from "@lezer/markdown"

import {to_function} from "./commands"
import {Underline} from "./CodeMirror.extensions/markdown_extensions"

/** CodeMirror instance configuration */
interface Shortcut {
  key: string,
  shift?: string,
  run?: string,
  scope?: string,
  preventDefault?: string
}
interface Configuration {
  parent: Element
  keymap?: [Shortcut]
  oninput?: (doc: string) => void
  events?: {}
  "search"?: {
    caseSensitive?: boolean
    regexp?: boolean
    wholeWord?: boolean
  }
}

const lezer_exts = [
  Subscript,
  Superscript,
  Strikethrough,
  Table,
  Underline
]

class Editor {
  cm: EditorView
  extensions: any[]

  constructor(cfg: Configuration) {
    const km = []
    for (const sc of cfg.keymap) {
      const tmp: Shortcut = {key: sc.key}
      if('shift' in sc) tmp.shift = to_function(sc.shift) //cm_functions[sc.shift]
      if('run' in sc) tmp.run = to_function(sc.run) //cm_functions[sc.run]
      if('scope' in sc) tmp.scope = sc.scope
      if('preventDefault' in sc) tmp.preventDefault = sc.preventDefault
      km.push(tmp)
    }
    this.extensions = [
      /*highlightSpecialChars(),*/
      history(),
      /*drawSelection(),*/
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      search({top: true, ...cfg["search"]}),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(classHighlighter, {fallback: false}),
      indentUnit.of("    "),
      // @ts-ignore FIXME: what is correct TS for below?
      Prec.highest(
        keymap.of([
          ...km,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          indentWithTab,
          ...historyKeymap,
          ...completionKeymap
        ])
      ),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, extensions: lezer_exts }),
      ankiImagePaste()
    ]
    if (cfg.events) this.extensions.push(EditorView.domEventHandlers(cfg.events))

    const editor_view = {
      state: EditorState.create({extensions: this.extensions}),
      parent: cfg.parent
    }

    if (cfg.oninput) {
      editor_view['dispatch'] = function(tr: Transaction) {
        const res = this.update([tr])
        if (!tr.changes.empty) cfg.oninput(this.state.doc.toString())
        return res
      }
    }

    this.cm = new EditorView(editor_view)
  }

  set_doc(doc: string, ord: number, pos: 'start'|'end') {
    this.cm.setState(EditorState.create({
      doc: doc,
      extensions: this.extensions,
      selection: {anchor: pos === 'start' ? 0 : doc.length}
    }))
  }

  get_selections() {
    return this.cm.state.selection.ranges
  }

  set_selections(ranges: readonly SelectionRange[]) {
    this.cm.dispatch({selection: EditorSelection.create(ranges)})
  }
}

function highlighter(cfg: {}) {

}

function theme(cfg: {}) {

}

export type {Shortcut, Configuration}
export {Editor, highlighter, theme}