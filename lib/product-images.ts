export function productImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;
  const safePath = imagePath.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${safePath}`;
}
