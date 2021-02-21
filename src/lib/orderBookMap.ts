import Big from 'big.js';
import OrderBook from './orderbook';

export default class OrderBookMap extends Map<string, OrderBook> {
  constructor() {
    super();
  }

  update(market: string, buySide: boolean, bgPrice: Big, bgAmount: Big) {
    console.log(market, bgPrice.toString());
    const orderBook = this.get(market);
    if (!orderBook) return;

    orderBook.update(buySide, bgPrice, bgAmount);
  }
}

export { OrderBook };
