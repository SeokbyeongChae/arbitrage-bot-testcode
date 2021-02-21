import Big from 'big.js';

export const equals = (a: Big, b: Big) => {
  return a.eq(b);
};

export const desc = (a: Big, b: Big) => {
  return a.gt(b);
};

export const asc = (a: Big, b: Big) => {
  return a.gt(b);
};
