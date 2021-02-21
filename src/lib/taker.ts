import Big, { RoundingMode } from 'big.js';
import Exchange from './exchange';
import Routine, { OrderTypes, RoutineTypes } from './routine';
import axios from 'axios';

enum errorCode {
  none = 0,
  pending = 1,
  orderAmount = 2,
}

export default class Taker {
  private routines: Routine[] = [];
  // private stopTaker: boolean = false;

  constructor(protected config: any, private exchange: Exchange) {}

  private isValid(bgPrice: Big, bgAmount: Big): boolean {
    if (bgPrice.lt(this.config.exchange.minimumRate) || bgPrice.gt(this.config.exchange.maximumRate)) return false;
    if (bgAmount.lt(this.config.exchange.minimumQuantity) || bgAmount.gt(this.config.exchange.maximumQuantity)) return false;
    if (bgPrice.times(bgAmount).lt(this.config.exchange.minimumTotal) || bgPrice.times(bgAmount).gt(this.config.exchange.maximumTotal)) return false;

    return true;
  }

  private openOrder(routine: Routine) {
    // if (this.stopTaker) return;

    let done = false;
    for (let i = 0; i < routine.markets.length; i++) {
      let bgAmount;
      const orderList: any = [];
      for (let j = i; j < routine.markets.length + i; j++) {
        let marketIndex = j;
        if (marketIndex >= routine.markets.length) marketIndex = j - routine.markets.length;

        const market = routine.markets[marketIndex];
        const splitedMarket = market.market.split('/');

        switch (routine.routineTypes) {
          case RoutineTypes.buy: {
            switch (market.orderType) {
              case OrderTypes.buy: {
                if (!bgAmount) {
                  bgAmount = market.bgOrderAmount!;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                  bgAmount = bgAmount
                    .times(market.bgOrderPrice!)
                    .round(9, RoundingMode.RoundUp)
                    .times(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundUp);
                } else {
                  if (bgAmount.gt(market.bgOrderAmount!)) break;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                  bgAmount = bgAmount
                    .times(market.bgOrderPrice!)
                    .round(9, RoundingMode.RoundUp)
                    .times(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundUp);
                }
                break;
              }
              case OrderTypes.sell: {
                if (!bgAmount) {
                  bgAmount = market.bgOrderAmount!;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                  bgAmount = bgAmount.times(1 + this.config.exchange.fee).round(9, RoundingMode.RoundUp);
                } else {
                  bgAmount = bgAmount.div(market.bgOrderPrice!).round(9, RoundingMode.RoundUp);

                  if (bgAmount.gt(market.bgOrderAmount!)) break;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);

                  bgAmount = bgAmount.times(1 + this.config.exchange.fee).round(9, RoundingMode.RoundUp);
                }
                break;
              }
            }
            break;
          }
          case RoutineTypes.sell: {
            switch (market.orderType) {
              case OrderTypes.buy: {
                if (!bgAmount) {
                  bgAmount = market.bgOrderAmount!;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                } else {
                  bgAmount = bgAmount
                    .div(market.bgOrderPrice!)
                    .round(9, RoundingMode.RoundDown)
                    .div(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundDown);
                  if (bgAmount.gt(market.bgOrderAmount!)) break;

                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                }
                break;
              }
              case OrderTypes.sell: {
                if (!bgAmount) {
                  bgAmount = market.bgOrderAmount!;
                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                  bgAmount = bgAmount.times(market.bgOrderPrice!).round(9, RoundingMode.RoundDown);
                } else {
                  bgAmount = bgAmount.div(1 + this.config.exchange.fee).round(9, RoundingMode.RoundDown);
                  if (bgAmount.gt(market.bgOrderAmount!)) break;

                  orderList.push([splitedMarket[0], splitedMarket[1], market.orderType, market.bgOrderPrice!, bgAmount]);
                  bgAmount = bgAmount.times(market.bgOrderPrice!).round(9, RoundingMode.RoundDown);
                }
                break;
              }
            }
            break;
          }
        }
      }

      if (orderList.length !== routine.markets.length) continue;

      let valid = true;
      for (const orderData of orderList) {
        console.log(`market: ${orderData[0]}/${orderData[1]}, buySide: ${orderData[2]}, price: ${orderData[3].toString()}, amount: ${orderData[4].toString()}`);
        if (!this.isValid(orderData[3], orderData[4])) {
          valid = false;
        }
      }

      if (!valid) {
        console.log('invalid amount or total range..');
        console.log('--------------------------------------');
        return errorCode.orderAmount;
      }

      for (const orderData of orderList) {
        this.exchange.openOrder(orderData[1], orderData[0], orderData[2] === OrderTypes.buy, orderData[3], orderData[4]);
      }

      done = true;
      console.log('requested to order..');
      console.log('--------------------------------------');
      // this.stopTaker = true;
      return errorCode.none;
    }

    if (!done) {
      console.log('invalid price or amount..');
    }
    return errorCode.none;
  }

  private getOrderBook(routine: Routine, callback: Function) {
    if (routine.lastOrderMilliseconds && routine.lastOrderMilliseconds > Date.now() - this.config.taker.marginMilliseconds) return;
    routine.lastOrderMilliseconds = Date.now();

    // const marketAmount: any = {};
    let cnt = 0;
    for (const market of routine.markets) {
      const splitedMarket = market.market.split('/');
      axios
        .get(this.config.connection.restEndpoint + `/public/getorderbook?market=${splitedMarket[1]}-${splitedMarket[0]}&type=both`)
        .then((res: any) => {
          switch (market.orderType) {
            case OrderTypes.buy: {
              if (!res.data.result.sell || !res.data.result.sell[0]) return;

              market.bgOrderPrice = new Big(res.data.result.sell[0].Rate);
              market.bgOrderAmount = new Big(res.data.result.sell[0].Quantity);
              break;
            }
            case OrderTypes.sell: {
              if (!res.data.result.buy || !res.data.result.buy[0]) return;

              market.bgOrderPrice = new Big(res.data.result.buy[0].Rate);
              market.bgOrderAmount = new Big(res.data.result.buy[0].Quantity);
              break;
            }
          }

          if (++cnt !== 3) return;

          callback(routine);
        })
        .catch((err: any) => {
          console.dir(err);
        });
    }
  }

  public start(): void {
    this.routines = this.exchange.getRoutines();

    let locked = false;
    const execution = () => {
      if (this.routines.length === 0) {
        return;
      }

      if (locked) return;
      locked = true;
      let cnt = 0;

      for (const routine of this.routines) {
        switch (routine.routineTypes) {
          case RoutineTypes.buy: {
            let bgAmount = new Big(1);
            let done = true;
            for (const market of routine.markets) {
              const marketPrice = this.exchange.getMarketPrice(market.market);
              if (!marketPrice) break;

              switch (market.orderType) {
                case OrderTypes.buy: {
                  const bgSellPrice = marketPrice.bgSell;
                  if (!bgSellPrice) {
                    done = false;
                    break;
                  }

                  bgAmount = bgAmount
                    .times(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundUp)
                    .times(bgSellPrice)
                    .round(9, RoundingMode.RoundUp);
                  break;
                }
                case OrderTypes.sell: {
                  const bgBuyPrice = marketPrice.bgBuy;
                  if (!bgBuyPrice) {
                    done = false;
                    break;
                  }

                  bgAmount = bgAmount
                    .div(bgBuyPrice)
                    .round(9, RoundingMode.RoundUp)
                    .times(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundUp);
                  break;
                }
              }
            }

            if (!done) continue;

            if (bgAmount.lt(0.99)) {
              cnt++;
              console.log(JSON.stringify(routine.markets));
              this.getOrderBook(routine, this.openOrder.bind(this));
            }

            break;
          }
          case RoutineTypes.sell: {
            let bgAmount = new Big(1);
            let done = true;
            for (const market of routine.markets) {
              const marketPrice = this.exchange.getMarketPrice(market.market);
              if (!marketPrice) break;

              switch (market.orderType) {
                case OrderTypes.buy: {
                  const bgSellPrice = marketPrice.bgSell;
                  if (!bgSellPrice) {
                    done = false;
                    break;
                  }

                  bgAmount = bgAmount
                    .div(bgSellPrice)
                    .round(9, RoundingMode.RoundDown)
                    .div(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundDown);
                  break;
                }
                case OrderTypes.sell: {
                  const bgBuyPrice = marketPrice.bgBuy;
                  if (!bgBuyPrice) {
                    done = false;
                    break;
                  }

                  bgAmount = bgBuyPrice
                    .times(bgAmount)
                    .round(9, RoundingMode.RoundDown)
                    .div(1 + this.config.exchange.fee)
                    .round(9, RoundingMode.RoundDown);
                  break;
                }
              }
            }

            if (!done) continue;

            if (bgAmount.gt(1.01)) {
              cnt++;
              console.log(JSON.stringify(routine.markets));
              this.getOrderBook(routine, this.openOrder.bind(this));
            }
            break;
          }
        }
      }

      console.log('cnt: ', cnt);
      locked = false;
    };

    setInterval(execution, this.config.taker.orderInterval);
  }

  public stop() {
    this.routines = [];
  }
}
