import { strict as assert } from 'assert';
import test from 'node:test';
import { CheckoutError, prepareOrderItems, sanitizeTotals } from '../src/server/orders/checkout';

test('checkout happy path computes totals and items', () => {
  const { orderItems, subtotal } = prepareOrderItems(
    [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', variantId: 'v1', quantity: 1 },
    ],
    [
      { id: 'p1', price: 100, active: true },
      { id: 'p2', price: 50, active: true },
    ],
    [
      { id: 'v1', productId: 'p2', price: 60, stock: 5 },
    ],
  );

  assert.equal(orderItems.length, 2);
  assert.equal(subtotal, 100 * 2 + 60 * 1);

  const totals = sanitizeTotals(subtotal, 10, 5, 0.1);
  assert.equal(totals.shippingTotal, 10);
  assert.equal(totals.discountTotal, 5);
  assert.ok(Math.abs(totals.taxTotal - ((subtotal - 5 + 10) * 0.1)) < 1e-6);
  assert.ok(Math.abs(totals.total - (subtotal - 5 + 10 + totals.taxTotal)) < 1e-6);
});

test('checkout throws when stock is insufficient', () => {
  assert.throws(
    () =>
      prepareOrderItems(
        [{ productId: 'p2', variantId: 'v1', quantity: 3 }],
        [{ id: 'p2', price: 50, active: true }],
        [{ id: 'v1', productId: 'p2', price: 60, stock: 2 }],
      ),
    (err: unknown) => err instanceof CheckoutError && err.code === 'STOCK',
  );
});

test('discount is capped at subtotal', () => {
  const { subtotal } = prepareOrderItems(
    [{ productId: 'p1', quantity: 1 }],
    [{ id: 'p1', price: 80, active: true }],
    [],
  );
  const totals = sanitizeTotals(subtotal, 0, 200, 0.2);
  assert.equal(totals.discountTotal, subtotal);
  assert.equal(totals.taxTotal, (subtotal - totals.discountTotal) * 0.2);
});
