import Big from 'big.js';

export interface MarketPrice {
  bgSell?: Big;
  bgBuy?: Big;
}

export default class MarketPriceMap extends Map<string, MarketPrice> {
  constructor() {
    super();
  }
}
