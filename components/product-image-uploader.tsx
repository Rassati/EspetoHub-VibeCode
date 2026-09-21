"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeProductImageAction, saveProductImageAction } from "@/app/(app)/products/actions";
import { productImageUrl } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const extensionsByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Props = {
  companyId: string;
  productId: string;
  initialImagePath: string | null;
  productName: string;
};

export function ProductImageUploader({ companyId, productId, initialImagePath, productName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagePath, setImagePath] = useState(initialImagePath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const preview = previewUrl ?? productImageUrl(imagePath);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isBusy) return;

    const extension = extensionsByMimeType[file.type];
    if (!extension) {
      setMessage("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage("A foto deve ter no máximo 5 MB.");
      return;
    }

    setIsBusy(true);
    setMessage(null);
    const filePath = `${companyId}/${productId}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(`Não foi possível enviar a foto: ${uploadError.message}`);
      setIsBusy(false);
      return;
    }

    const result = await saveProductImageAction(productId, filePath);
    if (result.error) {
      await supabase.storage.from("product-images").remove([filePath]);
      setMessage(`A foto foi enviada, mas não pôde ser salva: ${result.error}`);
      setIsBusy(false);
      return;
    }

    setPreviewUrl((oldPreview) => {
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      return URL.createObjectURL(file);
    });
    setImagePath(filePath);
    setMessage("Foto salva.");
    setIsBusy(false);
    router.refresh();
  }

  async function removeImage() {
    if (!imagePath || isBusy || !window.confirm("Remover a foto deste produto?")) return;
    setIsBusy(true);
    setMessage(null);
    const result = await removeProductImageAction(productId);
    if (result.error) {
      setMessage(`Não foi possível remover a foto: ${result.error}`);
      setIsBusy(false);
      return;
    }

    setPreviewUrl((oldPreview) => {
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      return null;
    });
    setImagePath(null);
    setMessage("Foto removida.");
    setIsBusy(false);
    router.refresh();
  }

  return (
    <section className="product-image-manager" aria-label="Foto do produto">
      <div className="product-image-preview">
        {preview ? (
          <img src={preview} alt={`Foto de ${productName}`} />
        ) : (
          <span aria-hidden="true">◈</span>
        )}
      </div>
      <div className="product-image-controls">
        <div>
          <h2>Foto do produto</h2>
          <p className="muted">Ajuda a reconhecer o item na hora de montar o pedido.</p>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          id="product-image-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          disabled={isBusy}
        />
        <div className="product-image-actions">
          <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
            {isBusy ? "Salvando…" : imagePath ? "Trocar foto" : "Adicionar foto"}
          </button>
          {imagePath && <button className="text-button" type="button" onClick={removeImage} disabled={isBusy}>Remover foto</button>}
        </div>
        <small className="muted">JPG, PNG ou WebP, até 5 MB.</small>
        {message && <p className={message === "Foto salva." || message === "Foto removida." ? "form-success" : "form-error"} role="status">{message}</p>}
      </div>
    </section>
  );
}
