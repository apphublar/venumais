import { ProductForm } from "@/components/vendor/product-form";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { createProductAction } from "@/lib/products/actions";
import { listStoreProductCategories } from "@/lib/products/queries";
import { requireStoreAccess } from "@/lib/auth/session";

export default async function NovoProdutoPage() {
  const { store } = await requireStoreAccess();
  const categories = await listStoreProductCategories(store.id);

  return (
    <div className="vendor-form-screen">
      <VendorScreenHeader backHref="/painel/estoque" title="Novo produto" />
      <ProductForm
        action={createProductAction}
        categories={categories}
        submitLabel="Cadastrar produto"
      />
    </div>
  );
}
