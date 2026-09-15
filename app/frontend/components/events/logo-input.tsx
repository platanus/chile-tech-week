import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { checkLogo, logoPolicy } from '@/lib/logo-upload';

// The browser blocks submission while decoding and on errors. The server repeats the
// checks against the actual bytes. The same picker handles admin's immediate uploads.
export function LogoInput({ name, label, error, disabled, required, onFile }: {
  name?: string;
  label: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onFile?: (file: File) => void;
}) {
  const id = useId();
  const version = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { version.current += 1; }, []);

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const request = ++version.current;
    setPreview(null);
    setDetails(null);
    setProblem(null);
    input.setCustomValidity('');
    if (!file) { setChecking(false); return; }
    setChecking(true);
    input.setCustomValidity('Espera mientras revisamos el logo.');
    const result = await checkLogo(file);
    if (request !== version.current) return;
    setChecking(false);
    setProblem(result.error);
    input.setCustomValidity(result.error ?? '');
    setDetails(`${file.name} · ${Math.ceil(file.size / 1024)} KB${result.width ? ` · ${result.width} × ${result.height} px` : ''}`);
    if (!result.error) {
      setPreview(URL.createObjectURL(file));
      onFile?.(file);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="label text-[11px] text-muted-foreground">{label}</label>
      <input id={id} name={name} type="file" accept={logoPolicy.types.join(',')} onChange={onChange}
        required={required} disabled={disabled} aria-invalid={!!problem || !!error} aria-describedby={`${id}-help ${id}-status`}
        className="w-full min-w-0 text-sm text-foreground file:mr-3 file:rounded-sm file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground" />
      <div id={`${id}-help`} className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>{logoPolicy.requirements}</p>
        <p>{logoPolicy.recommendation}</p>
      </div>
      {preview && <div className="flex h-24 w-48 items-center justify-center rounded-sm border border-input bg-black p-3">
        <img src={preview} alt="Vista previa del logo sobre fondo negro" className="max-h-full max-w-full object-contain" />
      </div>}
      {details && <p className="break-all text-xs text-muted-foreground">{details}</p>}
      <div id={`${id}-status`} aria-live="polite">
        {checking && <p className="text-xs text-muted-foreground">Revisando imagen…</p>}
        {(problem || error) && <p className="text-sm text-primary">{problem || error}</p>}
      </div>
    </div>
  );
}
