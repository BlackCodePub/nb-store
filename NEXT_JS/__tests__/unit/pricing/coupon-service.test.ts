import { applyCoupon } from '../../../src/server/pricing/coupon-service';

test('applyCoupon percent applies only to eligible items', () => {
  const items = [
    { productId: 'p1', categoryId: 'c1', quantity: 1, unitPrice: 1000 },
    { productId: 'p2', categoryId: 'c2', quantity: 2, unitPrice: 500 },
  ];

  const result = applyCoupon('percent', 10, items, [{ productId: 'p1' }], []);
  expect(result.totalDiscount).toBe(100);
  expect(result.itemDiscounts).toHaveLength(1);
  expect(result.itemDiscounts[0].productId).toBe('p1');
});

test('applyCoupon fixed is capped by eligible subtotal', () => {
  const items = [
    { productId: 'p1', categoryId: 'c1', quantity: 1, unitPrice: 1000 },
  ];

  const result = applyCoupon('fixed', 5000, items, [], []);
  expect(result.totalDiscount).toBe(1000);
});
