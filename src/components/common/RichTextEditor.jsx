import { Bold, Heading2, Italic, List, Quote, Undo2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

const controls = [
  ['bold', Bold, 'Bold'],
  ['italic', Italic, 'Italic'],
  ['formatBlock:h2', Heading2, 'Heading'],
  ['insertUnorderedList', List, 'List'],
  ['formatBlock:blockquote', Quote, 'Quote'],
  ['undo', Undo2, 'Undo'],
];

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  function run(command) {
    const [name, argument] = command.split(':');
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    onChange(editorRef.current?.innerHTML || '');
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
        {controls.map(([command, Icon, label]) => (
          <button
            key={command}
            type="button"
            className="rounded p-2 text-gray-700 hover:bg-white hover:text-brand-blue"
            onClick={() => run(command)}
            title={label}
            aria-label={label}
          >
            <Icon size={17} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="min-h-80 px-4 py-3 text-base leading-7 outline-none"
        contentEditable
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}
