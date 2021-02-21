// import OrderBookMap, { OrderBook } from '../lib/orderBookMap';

import MarketPriceMap, { MarketPrice } from './marketPriceMap';
import Routine from './routine';
import _ from 'lodash';
import Big from 'big.js';

export default abstract class Exchange {
  protected apiKey: string;
  protected apiSecret: string;

  private routines: Routine[] = [];
  private marketPriceMap: MarketPriceMap = new MarketPriceMap();
  protected stringRoutineList: string[] = [];

  constructor(protected config: any) {
    this.apiKey = this.config.connection.apiKey;
    this.apiSecret = this.config.connection.apiSecret;
  }

  public async init(): Promise<boolean> {
    return false;
  }

  public abstract start(): void;

  public stop(): void {
    this.routines = [];
    this.marketPriceMap.clear();
  }

  public abstract openOrder(currencySymbol1: string, currencySymbol2: string, buySide: boolean, bgPrice: Big, bgAmount: Big): void;

  protected addRoutine(routine: Routine): boolean {
    const maket1 = JSON.stringify([routine.markets[1], routine.markets[2], routine.markets[0]]);
    if (this.stringRoutineList.findIndex((x: string) => x === maket1) !== -1) return false;

    const maket2 = JSON.stringify([routine.markets[1], routine.markets[0], routine.markets[2]]);
    if (this.stringRoutineList.findIndex((x: string) => x === maket2) !== -1) return false;

    const maket3 = JSON.stringify([routine.markets[2], routine.markets[0], routine.markets[1]]);
    if (this.stringRoutineList.findIndex((x: string) => x === maket3) !== -1) return false;

    const maket4 = JSON.stringify([routine.markets[2], routine.markets[1], routine.markets[0]]);
    if (this.stringRoutineList.findIndex((x: string) => x === maket4) !== -1) return false;

    const maket5 = JSON.stringify([routine.markets[0], routine.markets[2], routine.markets[1]]);
    if (this.stringRoutineList.findIndex((x: string) => x === maket5) !== -1) return false;

    this.routines.push(routine);
    this.stringRoutineList.push(JSON.stringify(routine.markets));
    return true;
  }

  public getRoutines(): Routine[] {
    return _.cloneDeep(this.routines);
  }

  protected updateMarketPrice(market: string, sellPrice: number | undefined, buyPrice: number | undefined) {
    this.marketPriceMap.set(market, {
      bgSell: sellPrice ? new Big(sellPrice) : undefined,
      bgBuy: buyPrice ? new Big(buyPrice) : undefined,
    });
  }

  public getMarketPrice(market: string): MarketPrice | undefined {
    return this.marketPriceMap.get(market);
  }
}
