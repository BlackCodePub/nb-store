import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '../../../src/server/auth/options';
import { userHasPermission, userIsAdmin } from '../../../src/server/auth/rbac';
import { prisma } from '../../../src/server/db/client';
import { CatalogImagesList } from '../../../src/components/admin/CatalogImagesList';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function getSessionWithGuard() {
  const session = await getServerSession(buildAuthOptions('store'));
  if (!session?.user?.id) {
    redirect('/login?from=admin-catalog');
  }
  const isAdmin = await userIsAdmin(session.user.id);
  const canWrite = isAdmin || (await userHasPermission(session.user.id, 'catalog:write'));
  const canImages = isAdmin || canWrite || (await userHasPermission(session.user.id, 'catalog:images'));
  if (!canWrite && !canImages) {
    redirect('/admin?denied=catalog');
  }
  return { session, canWrite, canImages };
}

export default async function CatalogPage() {
  const { canWrite, canImages } = await getSessionWithGuard();
  const writeDisabled = !canWrite;
  const imagesDisabled = !canImages;

  async function createCategory(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    await prisma.category.create({
      data: {
        name,
        slug: slugify(name),
        description: String(formData.get('description') || '') || null,
      },
    });
    revalidatePath('/admin/catalog');
  }

  async function createProduct(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const name = String(formData.get('name') || '').trim();
    const price = Number(formData.get('price') || 0);
    if (!name || !price) return;
    const categoryId = String(formData.get('categoryId') || '') || null;
    await prisma.product.create({
      data: {
        name,
        slug: slugify(name),
        price,
        currency: 'BRL',
        categoryId: categoryId || null,
        description: String(formData.get('description') || '') || null,
        variants: {
          create: {
            name: 'Default',
            sku: `${slugify(name)}-default`.toUpperCase(),
            price,
            stock: Number(formData.get('stock') || 0),
          },
        },
      },
    });
    revalidatePath('/admin/catalog');
  }

  async function updateCategory(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const categoryId = String(formData.get('categoryId') || '');
    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim() || null;
    if (!categoryId || !name) return;
    await prisma.category.update({
      where: { id: categoryId },
      data: { name, slug: slugify(name), description },
    });
    revalidatePath('/admin/catalog');
  }

  async function deleteCategory(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const categoryId = String(formData.get('categoryId') || '');
    if (!categoryId) return;
    await prisma.product.updateMany({ where: { categoryId }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function updateProduct(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const productId = String(formData.get('productId') || '');
    const name = String(formData.get('name') || '').trim();
    const price = Number(formData.get('price') || 0);
    const active = String(formData.get('active') || 'true') === 'true';
    const stock = Number(formData.get('stock') || 0);
    const variantId = String(formData.get('variantId') || '') || null;
    if (!productId || !name || !price) return;
    await prisma.product.update({
      where: { id: productId },
      data: { name, slug: slugify(name), price, active },
    });
    if (variantId) {
      await prisma.productVariant.update({ where: { id: variantId }, data: { price, stock } }).catch(() => null);
    }
    revalidatePath('/admin/catalog');
  }

  async function deleteProduct(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const productId = String(formData.get('productId') || '');
    if (!productId) return;
    await prisma.product.delete({ where: { id: productId } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function createVariant(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const productId = String(formData.get('productId') || '');
    const name = String(formData.get('name') || '').trim();
    const sku = String(formData.get('sku') || '').trim().toUpperCase();
    const price = Number(formData.get('price') || 0);
    const stock = Number(formData.get('stock') || 0);
    if (!productId || !name || !sku || !price) return;
    await prisma.productVariant.create({ data: { productId, name, sku, price, stock } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function updateVariant(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const variantId = String(formData.get('variantId') || '');
    const name = String(formData.get('name') || '').trim();
    const price = Number(formData.get('price') || 0);
    const stock = Number(formData.get('stock') || 0);
    if (!variantId || !name || !price) return;
    await prisma.productVariant.update({ where: { id: variantId }, data: { name, price, stock } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function deleteVariant(formData: FormData) {
    'use server';
    const { canWrite } = await getSessionWithGuard();
    if (!canWrite) return;
    const variantId = String(formData.get('variantId') || '');
    if (!variantId) return;
    await prisma.productVariant.delete({ where: { id: variantId } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function createImage(formData: FormData) {
    'use server';
    const { canImages } = await getSessionWithGuard();
    if (!canImages) return;
    const productId = String(formData.get('productId') || '');
    const variantId = String(formData.get('variantId') || '') || null;
    const url = String(formData.get('url') || '').trim();
    const position = Number(formData.get('position') || 0);
    if (!productId || !url) return;
    await prisma.productImage.create({ data: { productId, variantId, url, position } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  async function deleteImage(formData: FormData) {
    'use server';
    await getSessionWithGuard();
    const imageId = String(formData.get('imageId') || '');
    if (!imageId) return;
    await prisma.productImage.delete({ where: { id: imageId } }).catch(() => null);
    revalidatePath('/admin/catalog');
  }

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const products = await prisma.product.findMany({ include: { category: true, variants: true, images: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="d-flex flex-column gap-4">
      <div id="topo" />
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h4 mb-3">Catálogo</h1>
          <p className="text-muted">Gerencie categorias e produtos. Apenas quem tem permissão catalog:write ou admin pode criar/editar.</p>
          {writeDisabled && (
            <div className="alert alert-warning py-2 px-3 mb-0">
              Seu perfil só pode gerenciar imagens. Criação/edição de categorias, produtos e variantes está bloqueada.
            </div>
          )}
        </div>
      </div>

      {canWrite && (
        <div className="card">
          <div className="card-body">
            <h2 className="h6 mb-3">Nova categoria</h2>
            <form action={createCategory} className="row g-2">
              <div className="col-12 col-md-4">
                <input name="name" className="form-control" placeholder="Nome" required />
              </div>
              <div className="col-12 col-md-6">
                <input name="description" className="form-control" placeholder="Descrição (opcional)" />
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className="btn btn-primary" type="submit">Criar</button>
              </div>
            </form>
            <div className="mt-3">
              <div className="fw-semibold mb-2">Categorias</div>
              <ul className="list-group">
                {categories.map((c) => (
                  <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      {c.name}
                      {c.description ? <span className="text-muted ms-2">— {c.description}</span> : null}
                    </span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-dark">{c.slug}</span>
                      <form action={deleteCategory}>
                        <input type="hidden" name="categoryId" value={c.id} />
                        <button className="btn btn-sm btn-outline-danger" type="submit">Excluir</button>
                      </form>
                    </div>
                  </li>
                ))}
                {categories.length === 0 && <li className="list-group-item text-muted">Nenhuma categoria</li>}
              </ul>
            <div className="mt-3">
              <div className="fw-semibold mb-2">Editar categoria</div>
              <form action={updateCategory} className="row g-2 align-items-center">
                <div className="col-12 col-md-3">
                  <select name="categoryId" className="form-select" required>
                    <option value="">Selecionar</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <input name="name" className="form-control" placeholder="Novo nome" required />
                </div>
                <div className="col-12 col-md-4">
                  <input name="description" className="form-control" placeholder="Nova descrição (opcional)" />
                </div>
                <div className="col-12 col-md-2 d-grid">
                  <button className="btn btn-outline-primary" type="submit">Atualizar</button>
                </div>
              </form>
            </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {canWrite && (
            <>
              <h2 className="h6 mb-3">Novo produto</h2>
              <form action={createProduct} className="row g-2">
                <div className="col-12 col-md-4">
                  <input name="name" className="form-control" placeholder="Nome" required />
                </div>
                <div className="col-6 col-md-2">
                  <input name="price" type="number" step="0.01" min="0" className="form-control" placeholder="Preço" required />
                </div>
                <div className="col-6 col-md-2">
                  <input name="stock" type="number" min="0" className="form-control" placeholder="Estoque" defaultValue={0} />
                </div>
                <div className="col-12 col-md-3">
                  <select name="categoryId" className="form-select">
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <input name="description" className="form-control" placeholder="Descrição" />
                </div>
                <div className="col-12 col-md-1 d-grid">
                  <button className="btn btn-primary" type="submit">Salvar</button>
                </div>
              </form>
            </>
          )}

          <div className="mt-3">
            <div className="fw-semibold mb-2">Produtos</div>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>SKU base</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category?.name || '—'}</td>
                      <td>R$ {p.price.toFixed(2)}</td>
                      <td className="text-muted">{p.variants[0]?.sku || '—'}</td>
                      <td>
                        <span className={`badge ${p.active ? 'bg-success' : 'bg-secondary'}`}>{p.active ? 'Ativo' : 'Inativo'}</span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {canWrite && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              data-bs-toggle="modal"
                              data-bs-target={`#modal-${p.id}-write`}
                              aria-label="Gerenciar produto"
                            >
                              <span aria-hidden="true" className="d-inline-flex align-items-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.8 3.2 8.6 5.3c-.2.3-.5.5-.9.5l-2.4.3c-.8.1-1.1 1.1-.5 1.6l1.8 1.6c.3.3.4.7.3 1.1l-.5 2.3c-.2.8.7 1.4 1.4 1l2.1-1.1c.3-.2.8-.2 1.1 0l2.1 1.1c.7.4 1.6-.2 1.4-1l-.5-2.3c-.1-.4 0-.8.3-1.1l1.8-1.6c.6-.5.3-1.5-.5-1.6l-2.4-.3c-.4 0-.7-.2-.9-.5L14.2 3c-.4-.7-1.4-.7-1.8 0l-.9 1.6-.9-1.4c-.4-.7-1.4-.7-1.8 0Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M9.8 18.5h4.4M11 21h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                              <span className="visually-hidden">Gerenciar</span>
                            </button>
                          )}
                          {canImages && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              data-bs-toggle="modal"
                              data-bs-target={`#modal-${p.id}-imagens`}
                              aria-label="Gerenciar imagens"
                            >
                              <span aria-hidden="true" className="d-inline-flex align-items-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                                  <path d="m8 14 2.3-2.7c.4-.5 1.1-.5 1.5 0l2.5 3 1.4-1.5c.4-.4 1-.4 1.4 0L20 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                  <circle cx="9" cy="9" r="1.1" fill="currentColor" />
                                </svg>
                              </span>
                              <span className="visually-hidden">Imagens</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted">Nenhum produto</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {(canWrite || canImages) && (
              <div className="mt-4 d-flex flex-column gap-3">
                {products.map((p) => (
                  <div key={p.id}>
                    {canWrite && (
                      <div className="modal fade" id={`modal-${p.id}-write`} tabIndex={-1} aria-hidden="true">
                        <div className="modal-dialog modal-xl modal-dialog-scrollable">
                          <div className="modal-content">
                            <div className="modal-header">
                              <div>
                                <h5 className="modal-title">Gerenciar produto</h5>
                                <div className="text-muted small">{p.name} · SKU base: {p.variants[0]?.sku || '—'} · Categoria: {p.category?.name || '—'}</div>
                              </div>
                              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                            </div>
                            <div className="modal-body">
                              <div className="d-flex flex-column gap-3">
                                <form action={updateProduct} className="d-flex flex-column gap-2">
                                  <input type="hidden" name="productId" value={p.id} />
                                  <input type="hidden" name="variantId" value={p.variants[0]?.id || ''} />
                                  <div className="row g-2 align-items-center">
                                    <div className="col-12 col-md-4">
                                      <label className="form-label small mb-1">Nome</label>
                                      <input name="name" className="form-control" defaultValue={p.name} />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <label className="form-label small mb-1">Preço</label>
                                      <input name="price" type="number" step="0.01" min="0" className="form-control" defaultValue={p.price} />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <label className="form-label small mb-1">Estoque</label>
                                      <input name="stock" type="number" min="0" className="form-control" defaultValue={p.variants[0]?.stock || 0} />
                                    </div>
                                    <div className="col-12 col-md-2">
                                      <label className="form-label small mb-1">Status</label>
                                      <select name="active" className="form-select" defaultValue={p.active ? 'true' : 'false'}>
                                        <option value="true">Ativo</option>
                                        <option value="false">Inativo</option>
                                      </select>
                                    </div>
                                    <div className="col-12 col-md-2 d-grid">
                                      <button className="btn btn-primary" type="submit">Salvar</button>
                                    </div>
                                  </div>
                                </form>
                                <form action={deleteProduct}>
                                  <input type="hidden" name="productId" value={p.id} />
                                  <button className="btn btn-outline-danger" type="submit">Excluir produto</button>
                                </form>

                                <div className="border rounded p-3">
                                  <div className="fw-semibold small mb-2">Variantes</div>
                                  <form action={createVariant} className="row g-2 align-items-center mb-3">
                                    <input type="hidden" name="productId" value={p.id} />
                                    <div className="col-12 col-md-3">
                                      <input name="name" className="form-control form-control-sm" placeholder="Nome" required />
                                    </div>
                                    <div className="col-12 col-md-3">
                                      <input name="sku" className="form-control form-control-sm" placeholder="SKU" required />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <input name="price" type="number" step="0.01" min="0" className="form-control form-control-sm" placeholder="Preço" required />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <input name="stock" type="number" min="0" className="form-control form-control-sm" placeholder="Estoque" defaultValue={0} />
                                    </div>
                                    <div className="col-12 col-md-2 d-grid">
                                      <button className="btn btn-sm btn-outline-secondary" type="submit">+ Variante</button>
                                    </div>
                                  </form>
                                  <div className="d-flex flex-column gap-2">
                                    {p.variants.map((v) => (
                                      <div key={v.id} className="d-flex flex-wrap gap-2 align-items-center border rounded p-2">
                                        <span className="badge bg-light text-dark">{v.sku}</span>
                                        <form action={updateVariant} className="d-flex flex-wrap gap-2 align-items-center">
                                          <input type="hidden" name="variantId" value={v.id} />
                                          <input name="name" className="form-control form-control-sm" defaultValue={v.name} />
                                          <input name="price" type="number" step="0.01" min="0" className="form-control form-control-sm" defaultValue={v.price ?? p.price} />
                                          <input name="stock" type="number" min="0" className="form-control form-control-sm" defaultValue={v.stock} />
                                          <button className="btn btn-sm btn-outline-primary" type="submit">Salvar</button>
                                        </form>
                                        <form action={deleteVariant}>
                                          <input type="hidden" name="variantId" value={v.id} />
                                          <button className="btn btn-sm btn-outline-danger" type="submit">Excluir</button>
                                        </form>
                                      </div>
                                    ))}
                                    {p.variants.length === 0 && <span className="text-muted small">Sem variantes</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-light" data-bs-dismiss="modal">Fechar</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {canImages && (
                      <div className="modal fade" id={`modal-${p.id}-imagens`} tabIndex={-1} aria-hidden="true">
                        <div className="modal-dialog modal-lg modal-dialog-scrollable">
                          <div className="modal-content">
                            <div className="modal-header">
                              <div>
                                <h5 className="modal-title">Imagens</h5>
                                <div className="text-muted small">{p.name}</div>
                              </div>
                              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                            </div>
                            <div className="modal-body">
                              <form action={createImage} className="row g-2 align-items-center mb-3">
                                <input type="hidden" name="productId" value={p.id} />
                                <div className="col-12 col-md-5">
                                  <input name="url" className="form-control form-control-sm" placeholder="URL da imagem" required disabled={imagesDisabled} />
                                </div>
                                <div className="col-6 col-md-3">
                                  <select name="variantId" className="form-select form-select-sm" disabled={imagesDisabled}>
                                    <option value="">Produto inteiro</option>
                                    {p.variants.map((v) => (
                                      <option key={v.id} value={v.id}>{v.sku}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-3 col-md-2">
                                  <input name="position" type="number" className="form-control form-control-sm" placeholder="Pos" defaultValue={0} disabled={imagesDisabled} />
                                </div>
                                <div className="col-3 col-md-2 d-grid">
                                  <button className="btn btn-sm btn-outline-secondary" type="submit" disabled={imagesDisabled}>+ Imagem</button>
                                </div>
                              </form>
                              <CatalogImagesList
                                images={p.images.map((img) => ({
                                  id: img.id,
                                  url: img.url,
                                  position: img.position,
                                  variantLabel: img.variantId ? p.variants.find((v) => v.id === img.variantId)?.sku : undefined,
                                }))}
                              />
                              <div className="d-flex flex-column gap-2 mt-2">
                                {p.images.map((img) => (
                                  <form key={img.id} action={deleteImage} className="d-flex align-items-center gap-2">
                                    <input type="hidden" name="imageId" value={img.id} />
                                    <span className="small text-break flex-fill">{img.url}</span>
                                    <button className="btn btn-sm btn-outline-danger" type="submit" disabled={imagesDisabled}>Excluir</button>
                                  </form>
                                ))}
                                {p.images.length === 0 && <span className="text-muted small">Sem imagens</span>}
                              </div>
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-light" data-bs-dismiss="modal">Fechar</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
