import Big from 'big.js';
import * as constants from '../common/constants';

const SortedMap = require('collections/sorted-map');

export default class OrderBook {
  private buyMap = new SortedMap(null, constants.equals, constants.desc);
  private sellMap = new SortedMap(null, constants.equals, constants.asc);

  constructor() {}

  public update(buySide: boolean, bgPrice: Big, bgAmount: Big): void {
    const innerOrderBook = this.getInnerOrderBook(buySide);
    if (bgAmount) {
      innerOrderBook.set(bgPrice, bgAmount);
    } else {
      innerOrderBook.delete(bgPrice);
    }
  }

  protected getInnerOrderBook(buySide: boolean): any {
    return buySide ? this.buyMap : this.sellMap;
  }
}
