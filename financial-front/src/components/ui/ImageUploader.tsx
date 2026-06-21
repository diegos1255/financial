import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

type ImageUploaderProps = {
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function ImageUploader({ onChange, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Somente JPG e PNG são aceitos.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Foto deve ter no máximo 2MB.');
      return;
    }

    onChange(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleRemove() {
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt="Foto de perfil"
            className="h-20 w-20 rounded-full object-cover border-2 border-slate-200"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
            <Camera className="h-7 w-7 text-slate-400" />
          </div>
        )}

        {preview && !disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-accent hover:underline"
        >
          {preview ? 'Trocar foto' : 'Adicionar foto (opcional)'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
}
